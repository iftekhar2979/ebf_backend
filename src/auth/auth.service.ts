import { InjectQueue } from "@nestjs/bull";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { createHash } from "crypto";
import { Request } from "express";
import { OtpType } from "src/otp/entities/otp.entity";
import { OtpService } from "src/otp/otp.service";
import { RedisService } from "src/redis/redis.service";
import { AccountStatus, CreateVerificationDto } from "src/user/dto/verification-dto";
import { Verification } from "src/user/entities/verification.entity";
import { DataSource, Repository } from "typeorm";
import { MailService } from "../mail/mail.service";
import { InjectLogger } from "../shared/decorators/logger.decorator";
import { User } from "../user/entities/user.entity";
import { argon2hash, argon2verify } from "../utils/hashes/argon2";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtPayload } from "./dto/jwt-payload.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { OtpVerificationDto } from "./dto/otp-verification.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ResetPasswordDto, UpdatePassword } from "./dto/reset-password.dto";
import { UpdateMyPasswordDto } from "./dto/update-password.dto";

@Injectable()
export class AuthService {
  private _FR_HOST: string;
  /**
   * Constructor of `AuthService` class
   * @param userRepository
   * @param jwtService imported from "@nestjs/jwt"
   * @param mailService
   * @param configService
   */
  constructor(
    @InjectRepository(User) private _userRepository: Repository<User>,
    @InjectRepository(Verification) private _verificationRepository: Repository<Verification>,
    private readonly _otpService: OtpService,
    private readonly _jwtService: JwtService,
    private readonly _mailService: MailService,
    private readonly _configService: ConfigService,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _dataSource: DataSource,
    private readonly _redisService: RedisService,
    @InjectQueue("otp") private _otpQueue: Queue,
    @InjectQueue("authentication") private _authQueue: Queue
  ) {
    this._FR_HOST = _configService.get<string>(`FR_BASE_URL`);
  }
  async signup(createUserDto: CreateUserDto, req: Request) {
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { password, email, ...rest } = createUserDto;

      // 2. Hash password with argon2
      const hashedPassword = await argon2hash(password);

      const user = await this._dataSource
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          ...rest,
          email,
          password: hashedPassword,
        })
        .returning("id,first_name, last_name, email, id, roles, status, image")
        .execute();

      // 4. Create Verification Record
      await queryRunner.manager.insert("verifications", {
        user_id: user.raw[0].id,
        status: AccountStatus.INACTIVE,
      });

      // 5. Finalize Transaction
      await queryRunner.commitTransaction();
      // 6. Generate OTP

      // 7. Post-Transaction: Communication (Email/SMS)
      // We do this outside the transaction so if email fails, user stays created
    
const token = await this.otpSending(user.raw[0])
      return {
        ok: true,
        data: user.raw[0],
        token,
      };
    } catch (err) {
      console.log(err);

      await queryRunner.rollbackTransaction();
      if (err.code === "23505") {
        throw new ConflictException("Email already exists");
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  public async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await argon2hash(refreshToken);
    await this._userRepository.update(userId, {
      current_refresh_token: hashedRefreshToken,
    });
  }
  private async generateTokens(user: User, device_id?: string) {
    const accessPayload = {
      id: user.id,
      type: "access", // ✅ differentiate token type
    };

    const refreshPayload = {
      id: user.id,
      type: "refresh", // ✅ important for verification
      device_id, // ✅ device-based refresh
    };

    const [accessToken, refreshToken] = await Promise.all([
      this._jwtService.signAsync(accessPayload, {
        secret: this._configService.get("JWT_ACCESS_SECRET"),
        expiresIn: this._configService.get("AUTH_JWT_ACCESS_TOKEN_EXPIRED"),
      }),
      this._jwtService.signAsync(refreshPayload, {
        secret: this._configService.get("JWT_REFRESH_SECRET"),
        expiresIn: this._configService.get("AUTH_JWT_REFRESH_TOKEN_EXPIRED"),
      }),
    ]);

    return { accessToken, refreshToken };
  }

 async otpSending(user){
    const token = await this.signTokenSendEmailAndSMS(user);
      await this._otpQueue.add("create", { user: user, otpType: OtpType.REGISTRATION });
return token
  }
  private handleDatabaseError(err: any) {
    if (err instanceof HttpException) throw err;

    // Postgres Unique Violation code
    if (err.code === "23505") {
      throw new ConflictException("Identity already exists");
    }

    throw new InternalServerErrorException("An unexpected error occurred during registration");
  }

  async verfication(verificationDto: CreateVerificationDto): Promise<Verification> {
    const { user_id, is_email_verified, is_admin_verified, is_suspended, is_deleted, status } =
      verificationDto;

    this._logger.log("Creating Verification", AuthService.name);
    const verification = this._verificationRepository.create({
      user_id,
      is_email_verified,
      is_admin_verified,
      is_suspended,
      is_deleted,
      status,
    });

    return await this._verificationRepository.save(verification);
  }
  async verifyOtp(otpDto: OtpVerificationDto, userInfo: User) {
    const { otp, verification_type } = otpDto;

    // 1. Fetch OTP Record
    const verification = await this._otpService.findOtpByUserId(userInfo.id);

    // Security: Generic error for non-existent OTP to prevent enumeration
    if (!verification) {
      throw new NotFoundException("OTP record not found or already used");
    }

    // 2. Expiration Check (Do this BEFORE attempt check)
    if (new Date() > verification.expiresAt) {
      await this._otpService.removeOtpByUserId(userInfo.id);
      throw new BadRequestException("OTP has expired");
    }

    // 3. Brute-Force Protection
    if (verification.attempts >= 3) {
      await this._otpService.removeOtpByUserId(userInfo.id);
      throw new BadRequestException("Too many failed attempts. Please request a new code.");
    }

    // 4. Value Validation
    if (verification.otp !== otp) {
      await this._otpService.updateOtpAttempts(userInfo.id, verification.attempts + 1);
      throw new BadRequestException("Invalid verification code");
    }

    // 5. Atomic Update & Cleanup
    // Use a transaction to ensure user is verified AND OTP is removed
    return await this._dataSource.transaction(async (manager) => {
      // Update User/Verification Account Status
      const userVerification = await manager.findOne(Verification, {
        where: { user_id: userInfo.id },
      });

      if (!userVerification) throw new NotFoundException("User verification record missing");

      userVerification.is_email_verified = true;
      userVerification.status = AccountStatus.ACTIVE;
      await manager.save(userVerification);

      // Consume the OTP (Delete it so it can't be used again)
      await this._otpService.removeOtpByUserId(userInfo.id);

      // 6. Handle Specific Flows
      if (verification_type === OtpType.FORGOT_PASSWORD) {
        // Return a short-lived "Reset Token"
        // This token should only be valid for the /reset-password endpoint
        const resetToken = this._jwtService.sign(
          { id: userInfo.id, purpose: "password_reset" },
          { expiresIn: "15m" }
        );

        return {
          ok:true,
          message: "OTP verified. You may now reset your password.",
          reset_token: resetToken,
        };
      }

      return {
        ok:true,
        message: "Account verified successfully",
      };
    });
  }
  async resetPassword(resetPasswordDto: ResetPasswordDto, user) {
    const { password, passwordConfirm } = resetPasswordDto;
    if (password !== passwordConfirm) {
      throw new BadRequestException("Password does not match with passwordConfirm");
    }
    this._logger.log("Masking Password", AuthService.name);
    console.log(user);
    const userinfo = await this._userRepository.findOne({ where: { id: user.id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.verification_type !== OtpType.FORGOT_PASSWORD) {
      throw new BadRequestException("Invalid verification type for password reset");
    }
    const isPassMatched = await argon2verify(userinfo.password, password);
    if (isPassMatched) {
      throw new BadRequestException("New password cannot be the same as the old password");
    }
    this._logger.log("Hashing Password", AuthService.name);
    0;
    const hashedPassword = await argon2hash(password);
    userinfo.password = hashedPassword;
    this._logger.log("Saving Updated User", AuthService.name);
    await this._userRepository.save(userinfo);
    // if (user.fcm) {
    //   await this._queue.add("push_notification", {
    //     token: user?.fcm,
    //     title: "Password Reset Successful",
    //     body: "Your password has been reset successfully",
    //   });
    // }
    return { message: "Password reset successfully", ok:true, data: null };
  }
  async updatePassword(resetPasswordDto: UpdatePassword, user) {
    const { passwordCurrent, password, passwordConfirm } = resetPasswordDto;
    if (password !== passwordConfirm) {
      throw new BadRequestException("Password does not match with passwordConfirm");
    }
    this._logger.log("Masking Password", AuthService.name);

    const userinfo = await this._userRepository.findOne({ where: { id: user.id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const isPassMatched = await argon2verify(userinfo.password, passwordCurrent);
    if (!isPassMatched) {
      throw new BadRequestException("Wrong Password!");
    }
    this._logger.log("Hashing Password", AuthService.name);
    0;
    const hashedPassword = await argon2hash(password);
    userinfo.password = hashedPassword;
    this._logger.log("Saving Updated User", AuthService.name);
    await this._userRepository.save(userinfo);
    this._mailService.sendPasswordUpdateEmail(userinfo);
    return { message: "Password updated successfully", ok:true, data: null };
  }
  async loginPassport(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    this._logger.log("Searching User with provided email", AuthService.name);
    const user = await this._userRepository.findOne({ where: { email } });
    // console.log(user);
    this._logger.log("Verifying User", AuthService.name);
    if (user && (await argon2verify(user.password, password))) {
      const verification = await this._verificationRepository.findOne({ where: { user_id: user.id } });
      if (!verification?.is_email_verified) {
        await this._otpService.createOtp(user.id, OtpType.REGISTRATION);
        const token = this._jwtService.sign({ id: user.id, verification_type: OtpType.REGISTRATION });
        return token;
        // throw new NotAcceptableException("Please verify your email to login"
      }
      this._logger.log("User Verified", AuthService.name);
      return user;
    }

    return null;
  }

  async appleLogin(token: string) {
    if (!token) throw new BadRequestException("Token Not Found");

    const { sub: userId, email, auth_time: loginTime } = this._jwtService.decode(token);
    return {
      user: { userId, email, loginTime },
      token,
    };
  }

  async updateMyPassword(updateMyPassword: UpdateMyPasswordDto, user: User) {
    const { passwordCurrent, password, passwordConfirm } = updateMyPassword;
    console.log(passwordCurrent, password);
    this._logger.log("Verifying current password from user", AuthService.name);
    if (!(await argon2verify(user.password, passwordCurrent))) {
      throw new UnauthorizedException("Invalid password");
    }
    if (password === passwordCurrent) {
      throw new BadRequestException("New password and old password can not be same");
    }
    if (password !== passwordConfirm) {
      throw new BadRequestException("Password does not match with passwordConfirm");
    }
    this._logger.log("Masking Password", AuthService.name);
    const hashedPassword = await argon2hash(password);
    user.password = hashedPassword;
    this._logger.log("Saving Updated User", AuthService.name);
    await this._userRepository.save(user);
    this._logger.log("Sending password update mail", AuthService.name);
    this._mailService.sendPasswordUpdateEmail(user);

    this._logger.log("Login the user and send the token again", AuthService.name);
    const token: string = await this._jwtService.sign(user);

    return { user, token };
  }

  async deleteMyAccount(): Promise<boolean> {
    throw new BadRequestException("Method not implemented.");
  }
  async userNotAccepted({ existingToken }: { existingToken: string }) {
    const payload = await this._jwtService.verify(existingToken);
    const token = await this._jwtService.sign({ id: payload.id, verification_type: OtpType.REGISTRATION });
    const userinfo = await this._userRepository.findOne({ where: { id: payload.id } });

    const otp = await this._otpService.createOtp(payload.id, OtpType.REGISTRATION);
    await this._mailService.sendUserConfirmationMail(userinfo, `${otp.otp}`);
    return token;
  }

  async login(loginDto: LoginUserDto, ip: string) {
    const { email, password, fcm } = loginDto;

    const attemptKey = `login:fail:${email}:${ip}`;

    // 🔐 STEP 1: brute-force check
    const attempts = await this._redisService.getLoginAttempts(attemptKey);
    if (attempts >= 5) {
      throw new HttpException("Too many login attempts. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    // 1️⃣ Fetch user
    const user = await this._userRepository
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.email = :email", { email })
      .getOne();

    if (!user) {
      await this._redisService.incrementLoginAttempts(attemptKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    // 2️⃣ Verify password
    const isPasswordValid = await argon2verify(user.password, password);
    if (!isPasswordValid) {
      await this._redisService.incrementLoginAttempts(attemptKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    // ✅ SUCCESS — reset attempts
    await this._redisService.resetLoginAttempts(attemptKey);

    // 3️⃣ Tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
    const REFERESH_TOKEN_CACHE_KEY = `refresh:token:${user.id}:${loginDto.device_id}`;
    // const hashedRT = await argon2hash(refreshToken);
    const hashedRT = createHash("sha256").update(refreshToken).digest("hex");
    this._logger.log(`Storing refresh token in Redis REFERESH== ${hashedRT}`, AuthService.name);
    await this._redisService.getClient().set(REFERESH_TOKEN_CACHE_KEY, hashedRT, { EX: REFRESH_TOKEN_TTL });

    if (fcm) {
      await this._authQueue.add("fcm_store", { user, fcm });
    }

    return {
      ok: true,
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles: user.roles,
        isActive: user.is_active,
        status: user.status,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    };
  }
  async signToken(user: any): Promise<string> {
    const payload: JwtPayload = { id: user.id };
    this._logger.log("Signing token", AuthService.name);
    if (!user.first_name) {
      // console.log(payload)
      const payload = { id: user.id, verification_type: "registration" };

      return this._jwtService.sign(payload);
    }
    return this._jwtService.sign(payload);
  }
  async userInfo(user: User) {
    return await this._userRepository.findOne({
      where: { id: user.id },
      select: { password: false },
      relations: ["addressDetails"],
    });
  }

  async signTokenSendEmailAndSMS(user: User) {
    const token: string = await this.signToken(user);

    // TODO: Send confirmation SMS to new user using Twilio

    return token;
  }
  async resendOtp({ user, otpType, userInfo }: { userInfo?: any; user?: any; otpType?: OtpType }) {
    if (!user.verification_type || otpType !== OtpType.REGISTRATION) {
      // const otp = await this._otpService.createOtp(user.id, OtpType.FORGOT_PASSWORD);
      // await this._queue.add("mail_notification", { user, otp: otp.otp });
      const otp = await this._otpQueue.add("otp-creation", { user, otpType: OtpType.FORGOT_PASSWORD });
      return { message: "OTP resent successfully", ok:true, data: null };
    }

    this._logger.log(`Resending OTP to user with ID: ${user.id}`, AuthService.name);
    const existingOtp = await this._otpService.findOtpByUserId(user.id);
    // console.log("Existing Otp",existingOtp.createdAt.getTime()+ 1 * 60 * 1000,Date.now())
    if (existingOtp?.createdAt) {
      const otpCreatedAt = existingOtp.createdAt.getTime();
      const timeDifference = Date.now() - otpCreatedAt;
      if (timeDifference < 2 * 1000 * 60) {
        throw new BadRequestException("You can only request a new OTP after 2 minute.");
      }

      await this._otpService.removeOtpByUserId(user.id);
    }

    const otp = await this._otpService.createOtp(user.id, OtpType.FORGOT_PASSWORD);
    await this._mailService.sendForgotPasswordMail(user.email, `${otp.otp}`);
    return { message: "OTP resent successfully", ok:true, data: null };
  }

  async forgetPassword(req: Request, email: string) {
    const user = (await this._userRepository.findOne({ where: { email } })) as any;
    user.verification_type = OtpType.FORGOT_PASSWORD;
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const token = await this._jwtService.sign({ id: user.id, verification_type: OtpType.FORGOT_PASSWORD });
    await this.resendOtp({ user });
    return { message: "Forgot password email sent successfully", ok:true, data: null, token };
  }

  async sendOtp(req: Request) {
    const user = req.user as User;
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const existingOtp = await this._otpService.findOtpByUserId(user.id);
    if (existingOtp) {
      // If an OTP already exists, you might want to delete it before generating a new one
      await this._otpService.removeOtpByUserId(user.id); // Ensure to remove the existing OTP
    }
    await this._otpService.createOtp(user.id, OtpType.REGISTRATION);
    return { message: "OTP resent successfully", ok:true, data: null };
  }
  async uploadImage({ imageUrl, user }: { imageUrl: string; user: User }) {
    const updateUser = await this._userRepository.update(user.id, { image: imageUrl });
    if (!updateUser) {
      throw new NotFoundException("User not found");
    }
    return { message: "Image uploaded successfully", ok:true, data: null };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refresh_token, device_id } = refreshTokenDto;

    // 1️⃣ Verify JWT
    let payload: any;
    try {
      payload = await this._jwtService.verifyAsync(refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      console.log(payload);
    } catch (err) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    const userId = payload.id;

    // 2️⃣ Fetch stored hash from Redis
    const cacheKey = `refresh:token:${userId}:${device_id}`;
    const storedHash = await this._redisService.getClient().get(cacheKey);
    this._logger.log(
      `Fetched stored hash from Redis for key: ${storedHash} for ${cacheKey}`,
      AuthService.name
    );
    if (!storedHash) {
      throw new UnauthorizedException("Refresh token expired or revoked");
    }
    // 1. Hash the incoming token provided by the user
    const incomingHash = createHash("sha256").update(refresh_token).digest("hex");
    console.log(incomingHash, storedHash);
    // 2. Perform a direct string comparison
    // Note: It is best practice to use timingSafeEqual for security,
    // though for hashed refresh tokens, a direct comparison is common.
    const isValid = incomingHash === storedHash;
    if (!isValid) {
      throw new UnauthorizedException("Refresh token mismatch");
    }
    // 4️⃣ Fetch user
    const user = await this._userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // 5️⃣ Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user, device_id);

    // 6️⃣ Store NEW refresh token in Redis
    const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

    // FIX: Hash 'newRefreshToken', NOT the old 'refresh_token' from the DTO
    const newHashedRT = createHash("sha256").update(newRefreshToken).digest("hex");

    await this._redisService.getClient().set(cacheKey, newHashedRT, { EX: REFRESH_TOKEN_TTL });
    return {
      ok: true,
      tokens: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      },
    };
  }
}
