import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { User } from "../../user/entities/user.entity";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: "email" });
  }

  /**
   *  validates user email and password for authentication.
   * @param email user's email address.
   * @param password user's password.
   * @returns user object containg user information.
   */
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.loginPassport({ email, password });

    if (!user) {
      throw new UnauthorizedException("Invalid Credentials!!!");
    }

    return user;
  }
}
