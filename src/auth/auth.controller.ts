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

  /**
   * Patch API - "/activate/:token" - activates the user account and sends the activation mail to user.
   * it requires authentication.
   * @param token account activation token.
   * @returns if successfully activated, returns response status and message.
   * @throws UnauthorizedException with message in case user is not logged in.
   */
  // @Patch("activate/:token")
  // // @UseGuards(JwtAuthGuard)
  // @ApiOperation({
  //   description: "Api to activate new user account and sends the activation mail to user",
  //   summary: "Api to activate new user account and sends the activation mail to user",
  // })
  // @ApiOkResponse({
  //   description: "Activates the account and sends the activation mail to user",
  //   type: MessageResponseDto,
  // })
  // @ApiUnauthorizedResponse({ description: "In case user is not logged in for activation" })
  // @ApiBearerAuth()
  // async activateAccount(@Param("token") token: string) {
  //   const isActivated = await this._authService.activateAccount(token);
  //   if (isActivated) return { status: "success", message: "Account Activated successfully" };
  // }

  /**
   * Post API - "/login" - used for user login and get authentication token to access other protected APIs.
   * it requires the LoginUserDto object in request body.
   * @param req HTTP request object containing user information.
   * @returns newly logged in user object, token for authentication and response status.
   * @throws UnauthorizedException with message in case user is not logged in.
   */
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

  /**
   * Get API - "/google/callback" - used for login through google account. It is a webhook hit by Google Auth services with user information.
   * @param req HTTP request object containing user information from google.
   * @returns created or logged in user object, token for authentication and response status.
   * @throws ConflictException if the user with that email already exists.
   * @throws UnauthorizedException if credentials are invalid.
   */
  // @Get("google/callback")
  // @UseGuards(GoogleAuthGuard)
  // @ApiOkResponse({
  //   description: "Created or found Existing user and Login successful",
  //   type: UserResponseDto,
  // })
  // @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  // @ApiConflictResponse({ description: "User Already Exists" })
  // @ApiOAuth2(["email", "profile"])
  // async loginGoogleRedirect(@Req() req: Request) {
  //   const { user, token } = await this._authService.loginGoogle(req);

  //   return {
  //     status: "success",
  //     user,
  //     token,
  //   };
  // }

  /**
   * Get API - "/logout" - used for logging out the user.
   * it requires authentication.
   * @returns null for token and response status.
   * @throws UnauthorizedException with message in case user is not logged in.
   */
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

  /**
   * Post API - "/forgot-password" - used for reseting the password in case the user forgets the password. it sends a mail with password reset URL to user's email.
   * @returns response status and response message "Password reset email sent successfully".
   * @throws NotFoundException if the user with given email is not found.
   */
  // @Post("forgot-password")
  // @ApiCreatedResponse({
  //   description: "Create password reset token and send it to user email",
  //   type: MessageResponseDto,
  // })
  // @ApiOperation({
  //   description:
  //     "Api to reset the password in case the user forgets the password. it sends a mail with password reset URL to user's email.",
  //   summary:
  //     "Api to reset the password in case the user forgets the password. it sends a mail with password reset URL to user's email.",
  // })
  // @ApiNotFoundResponse({ description: "User is not found" })
  // async forgotPassword(@Body() forgotPassword: ForgotPasswordDto, @Req() req: Request) {
  //   const status = await this._authService.forgotPassword(forgotPassword?.email, req);

  //   if (!status) throw new InternalServerErrorException("Error sending email!");

  //   return {
  //     status: "success",
  //     message: "Password reset email sent successfully",
  //   };
  // }

  /**
   * Get API - "/verify/:token" - used for pre-verification of the token before redirecting user to reset password page.
   * @param token reset password token.
   * @returns response status and response message.
   * @throws BadRequestException if the user with that email already exists.
   */
  // @Get("verify/:token")
  // @ApiOkResponse({ description: "User Password Reset token verification" })
  // @ApiOperation({
  //   description: "Api to verify reset password token.",
  //   summary: "Api to verify reset password token.",
  // })
  // @ApiBadRequestResponse({ description: "In case of invalid or expired token" })
  // async verifyToken(@Param("token") token: string) {
  //   const message = await this._authService.verifyToken(token);

  //   return { status: "success", message };
  // }

  /**
   * Get API - "/reset-password/:token" - used for reseting the password using the token received in the mail
   * @param token reset password token.
   * @param resetPassword contains new password to be set.
   * @returns updated user object, response status and response message.
   * @throws BadRequestException in case of invalid or expired token.
   * @throws NotAcceptableException if password and passwordConfirm does not match.
   */
  // @Patch("reset-password/:token")
  // @ApiOkResponse({
  //   description: "User Password Reset was successful",
  //   type: UserResponseDto,
  // })
  // @ApiOperation({
  //   description: "Api to reset users password.",
  //   summary: "Api to reset users password.",
  // })
  // @ApiNotAcceptableResponse({ description: "If password and passwordConfirm does not match" })
  // @ApiBadRequestResponse({ description: "In case of invalid or expired token" })
  // async resetPassword(@Param("token") token: string, @Body() resetPassword: ResetPasswordDto) {
  //   const { updatedUser, newToken } = await this._authService.resetPassword(token, resetPassword);
  //   return { status: "success", user: updatedUser, token: newToken };
  // }

  /**
   * Patch API - "/update-my-password" - used for updating the user's password.
   * it requires authentication
   * @param user user information of current logged in user.
   * @param updateMyPassword contains current password and new password to be set.
   * @returns updated user object, authentication token and response status.
   * @throws BadRequestException if given new password and user password are same or if given new password and passwordConfirm are different.
   * @throws UnauthorizedException if User is not logged in OR If input password and user password does not match.
   */
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

  /**
   * Delete API - "/delete-me" - used for deleting the user's account.
   * it requires authentication
   * @param user user information of current logged in user.
   * @returns updated user object, authentication token and response status.
   * @throws BadRequestException if User does not exist.
   * @throws UnauthorizedException if User is not logged in.
   */
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

  /**
   * Get API - "/send-activation-mail" - used for sending account activation mail.
   * it requires authentication
   * @param user user information of current logged in user.
   * @param req HTTP request object.
   * @returns response message "Activation mail sent successfully!" and status.
   */
  // @Get("send-activation-mail")
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({
  //   description: "Api to send account activation mail.",
  //   summary: "Api to send account activation mail.",
  // })
  // @ApiOkResponse({ description: "Send Account activation email", type: MessageResponseDto })
  // @ApiBearerAuth()
  // async sendAccountActivationToken(@GetUser() user: User, @Req() req: Request) {
  //   const status = await this._authService.sendAccountActivationMail(user, req);

  //   return status === "success" ? { status, message: "Activation mail sent successfully!" } : "";
  // }
}
