import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get("GOOGLE_CLIENT_ID"),
      clientSecret: configService.get("GOOGLE_CLIENT_SECRET"),
      // FIXME: callbackURL will be a front-end url eventually, for backend testing you may add this URL
      // callbackURL: `http://localhost:${configService.get<string>("PORT") || 3000}/api/v1/auth/google/callback`, // Backend URL
      callbackURL: "http://localhost:3000/auth/google/callback", // Frontend URL
      scope: ["email", "profile"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      id: id,
      first_name: name.givenName,
      last_name: name.familyName,
      email: emails[0].value,
      accessToken: accessToken,
    };

    done(null, user);
  }
}
