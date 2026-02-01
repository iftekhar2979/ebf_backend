import { BullModule } from "@nestjs/bull";
import { forwardRef, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OtpModule } from "src/otp/otp.module";
import { Verification } from "src/user/entities/verification.entity";
import { MailModule } from "../mail/mail.module";
import { User } from "../user/entities/user.entity";
import { UserModule } from "../user/user.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";

/**
 * It is a feature module where we keep the controller, service and other code related to authentication and  we import other modules and configure modules and packages that are being used in this module.
 *
 * Here, feature modules imported are - DatabaseModule, AuthModule, MailModule and UserModule.
 * other modules are :
 *      {@link TypeOrmModule} - it is an ORM and enables easy access to database.
 *      {@link PassportModule} - it enables us to setup multiple types of authentication.
 *      {@link JwtModule} - it is used for token creation for authentication.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Verification]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>("JWT_SECRET") as any,
          signOptions: {
            expiresIn: configService.get<string>("EXPIRES_IN") as any,
          },
        };
      },
    }),
    forwardRef(() => UserModule),
    MailModule,
    OtpModule,
    BullModule.registerQueue({ name: "notifications" }, { name: "otp" }, { name: "authentication" }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy],
  exports: [AuthService, PassportModule, JwtStrategy, JwtModule],
})
export class AuthModule {}
