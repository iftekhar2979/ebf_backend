import { InjectQueue } from "@nestjs/bull";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Queue } from "bull";
import { Request } from "express";
import { MailService } from "src/mail/mail.service";
import { OtpService } from "src/otp/otp.service";
import { UserService } from "src/user/user.service";
import { TransformInterceptor } from "../shared/interceptors/transform.interceptor";
import { User } from "../user/entities/user.entity";
import { AuthService } from "./auth.service";
import { GetUser, GetUserInformation } from "./decorators/get-user.decorator";
import { LogoutResponseDto } from "./dto-response/logout-response.dto";
import { MessageResponseDto } from "./dto-response/message-response.dto";
import { UserResponseDto } from "./dto-response/user-response.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { OtpVerificationDto } from "./dto/otp-verification.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateMyPasswordDto } from "./dto/update-password.dto";
import { ForgetPasswordGuard } from "./guards/forget-password.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtAuthenticationGuard } from "./guards/session-auth.guard";
import { ShopSignupDto } from "src/user/shops/dtos/Signup.dto";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
  constructor(
    private readonly _authService: AuthService,
    private readonly _jwtService: JwtService,
    private readonly _OtpService: OtpService,
    private readonly _mailService: MailService,
    private readonly _userService: UserService,

    @InjectQueue("notifications") private readonly _queue: Queue
  ) {}

  @Post("signup")
  @ApiOperation({
    description: "Api to register new users.",
    summary: "Api to register new users. It takes (first_name, last_name, email and password) as input",
  })
  @ApiCreatedResponse({
    description: "The user is successfully created",
    type: UserResponseDto,
  })
  async userSignup(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const { data, token } = await this._authService.signup(createUserDto, req);
    return {
      status: "success",
      data,
      token,
    };
  }
  

  @Post("signup/shops")
  @ApiOperation({
    description: "Api to register new users.",
    summary: "Api to register new users. It takes (first_name, last_name, email and password) as input",
  })
  @ApiCreatedResponse({
    description: "The user is successfully created",
    type: UserResponseDto,
  })
  @ApiConflictResponse({ description: "In case of email already exists in the database" })
  async signup(@Body() signup: ShopSignupDto, @Req() req: Request) {
    const { data } = await this._userService.signUpShops(signup)
const token = await this._authService.otpSending(data)
    return {
      status: "success",
      data,
      token,
    };
  }
  @Post("login")
  @HttpCode(200)
  // @UseGuards(LocalAuthGuard)
  @UseInterceptors(TransformInterceptor)
  @ApiOperation({
    description: "Api to login already registered user.",
    summary: "Api to login already registered user.",
  })
  @ApiCreatedResponse({ description: "Login successful", type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  @ApiBody({ required: true, type: LoginUserDto })
  async loginPassportLocal(@Headers() headers: any, @Body() loginDto: LoginUserDto, @Req() req: Request) {
    loginDto.device_id = headers["user-agent"] || "unknown_device";
    return await this._authService.login(loginDto, req.ip);
  }

  @Post("resend-otp")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(TransformInterceptor)
  @ApiOperation({
    description: "Api to Resend otp.",
    summary: "Api to Resend the otp.",
  })
  @ApiUnauthorizedResponse({ description: "Session Expired!" })
  async resendOtp(@Req() req: Request, @GetUserInformation() userInfo: User) {
    const user = req.user as User;

    if (!user) {
      throw new NotFoundException("User not found");
    }
    return await this._authService.resendOtp({ user: userInfo });
  }
  @Post("forgot-password")
  // @UseGuards(JwtAuthGuard)
  @UseInterceptors(TransformInterceptor)
  @ApiOperation({
    description: "Forget Password",
    summary: "Forget password and send otp",
  })
  @ApiUnauthorizedResponse({ description: "Session Expired!" })
  async forgotPassword(@Req() req: Request, @Body() forgotPasswordDto: ForgotPasswordDto) {
    // // console.log(req)
    //  const token = await this._authService
    return await this._authService.forgetPassword(req, forgotPasswordDto.email);
    // return token
  }

  @Post("verify-otp")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(TransformInterceptor)
  @ApiOperation({
    description: "Otp Verification",
    summary: "Verify the otp .",
  })
  @ApiUnauthorizedResponse({ description: "Session Expired!" })
  async VerifyOtp(@Body() otp: OtpVerificationDto, @GetUser() user: User) {
    // console.log(user)
    const token = await this._authService.verifyOtp(otp, user);
    return token;
  }

  @Post("reset-password")
  @UseGuards(ForgetPasswordGuard)
  @UseInterceptors(TransformInterceptor)
  @ApiOperation({
    description: "Reset Password",
    summary: "Reset Password .",
  })
  @ApiUnauthorizedResponse({ description: "Session Expired!" })
  async ResetPassword(@Req() req: Request, @Body() password: ResetPasswordDto) {
    const user = req.user;
    return await this._authService.resetPassword(password, user);
  }

  @Post("update-password")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(TransformInterceptor)
  @ApiOperation({
    description: "update Password",
    summary: "updated Password .",
  })
  @ApiUnauthorizedResponse({ description: "Session Expired!" })
  async updatePassword(@GetUser() user: User, @Body() password: UpdateMyPasswordDto) {
    // const user = req.user;
    return await this._authService.updatePassword(password, user);
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    description: "Api to login user through Google account.",
    summary: "Api to login user through Google account.",
  })
  @ApiResponse({ status: 302, description: "Redirect to Google OAuth Content Screen" })
  @ApiOAuth2(["email", "profile"])
  async loginGoogle() {
    // NOTE: For UI:${req.protocol}://${req.get("host")}/auth/google_oauth2
  }

  @Post("apple/callback")
  @ApiOkResponse({
    description: "Created or found Existing user and Login successful",
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  @ApiConflictResponse({ description: "User Already Exists" })
  // @ApiOAuth2(["email", "profile"])
  async loginAppleCallback(@Req() req: Request) {
    const { token: appleToken } = req.body;

    const { user, token } = await this._authService.appleLogin(appleToken);

    return {
      status: "success",
      data: user,
      token,
    };
  }

  @Get("logout")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: "Api to logout logged in user.",
    summary: "Api to logout logged in user.",
  })
  @ApiOkResponse({ description: "Logout Successful", type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: "If User is not logged in" })
  @ApiBearerAuth()
  async logout() {
    return { status: "success", token: null };
  }

  @Post("refresh-token")
  @ApiOperation({ summary: "Refresh access token using a valid refresh token" })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Headers() headers: any) {
    refreshTokenDto.device_id = headers["user-agent"];
    return this._authService.refreshToken(refreshTokenDto);
  }

  @Patch("update-my-password")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: "Api to change password of current logged in user.",
    summary: "Api to change password of current logged in user.",
  })
  @ApiOkResponse({ description: "Password Updated Successfully", type: UserResponseDto })
  @ApiUnauthorizedResponse({
    description: "If User is not logged in OR If input password and user password does not match",
  })
  @ApiBadRequestResponse({
    description:
      "If given new password and user password are same OR if given new password and passwordConfirm are different",
  })
  @ApiBearerAuth()
  async updateMyPassword(@Body() updateMyPassword: UpdateMyPasswordDto, @GetUser() user: User) {
    const { user: updatedUser, token: newToken } = await this._authService.updateMyPassword(
      updateMyPassword,
      user
    );

    return { status: "success", user: updatedUser, token: newToken };
  }

  @Delete("delete-me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: "Api to delete logged in user's account",
    summary: "Api to delete logged in user's account.",
  })
  @ApiOkResponse({ description: "User deletion successful", type: MessageResponseDto })
  @ApiBadRequestResponse({ description: "If User does not exist" })
  @ApiUnauthorizedResponse({ description: "If User is not logged in" })
  @ApiBearerAuth()
  async deleteMyAccount() {
    const isDeleted: boolean = await this._authService.deleteMyAccount();

    if (isDeleted) {
      return { status: "success", message: "User Deleted Successfully" };
    }
  }

}
