import { forwardRef, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { User } from "./entities/user.entity";
import { UserAddress } from "./entities/userAddresses.entity";
import { Verification } from "./entities/verification.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserAddressService } from "./userAddress.service";
import { ShopsModule } from "./shops/shops.module";
import { ShippingInformationsModule } from "./shipping_informations/shipping_informations.module";

@Global()
@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User, Verification, UserAddress]),
    MailModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: (configService.get<string>("JWT_SECRET") as any) || "",
          signOptions: {
            expiresIn: (configService.get<string>("EXPIRES_IN") as any) || "",
          },
        };
      },
    }),
    ShopsModule,
    ShippingInformationsModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserAddressService],
  exports: [UserService, UserAddressService],
})
export class UserModule {}
