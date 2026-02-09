import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OtpType } from "src/otp/entities/otp.entity";
import { UserService } from "src/user/user.service";

@Injectable()
export class ForgetPasswordGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log("Forget Password Guard Activated");
    const token = this.extractTokenFromHeader(request);
    console.log("Toekn", token);
    if (!token) {
      throw new UnauthorizedException("You are not authorized to access this resource!");
    }
    console.log(token);
    try {
      const payload = await this.jwtService.verifyAsync(token);
      console.log(payload);
      if (payload.verification_type !== OtpType.FORGOT_PASSWORD) {
        throw new UnauthorizedException("Invalid token type for forget password!");
      }
      const user = await this.userService.getUserById(payload.id);
      console.log(user);
      if (!user) {
        throw new Error("User is Not Available!");
      }
      if (payload.id !== user.id.toString()) {
        throw new Error("You are not authorized to access this resource!");
      }
      if (user.deletedAt) {
        throw new Error("User is Not Available!");
      }
      request.user = payload; // Attach user data to the request
      request.userInfo = user;
      return true; // Allow the request to proceed
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException(error.message);
    }
  }
  private extractTokenFromHeader(request: any): string | null {
    const bearerToken = request.headers["authorization"];
    if (bearerToken && bearerToken.startsWith("Bearer ")) {
      return bearerToken.split(" ")[1];
    }
    return null;
  }
}
