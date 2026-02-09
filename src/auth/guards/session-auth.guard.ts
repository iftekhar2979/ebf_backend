import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { UserService } from "src/user/user.service";
import { Logger } from "winston";

@Injectable()
export class JwtAuthenticationGuard {
  constructor(
    private readonly _jwtService: JwtService, // Inject JwtService
    private readonly _userService: UserService, // Inject UserService
    @InjectLogger() private readonly _logger: Logger
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException("You are not authorized to access this resource!");
    }
    try {
      const payload = await this._jwtService.verifyAsync(token);
      const user = await this._userService.getUserById(payload.id);
      if (!user) {
        throw new Error("User is Not Available!");
      }
      if (payload.id !== user.id.toString()) {
        throw new Error("You are not authorized to access this resource!");
      }
      if (user.deletedAt) {
        throw new Error("User is Not Available!");
      }
      request.user = payload;
      request.userInfo = user;
      return true;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException(error.message);
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const bearerToken = request.headers["authorization"];
    console.log("Bearer Token :", bearerToken);
    // console.log("Bearer Token :", request);
    // this._logger.log(`Request`, request);
    // console.log(request);
    if (bearerToken && bearerToken.startsWith("Bearer ")) {
      return bearerToken.split(" ")[1];
    }
    return null;
  }
}
