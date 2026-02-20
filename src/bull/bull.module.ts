/* eslint-disable prettier/prettier */
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CartsModule } from "src/carts/carts.module";
import { FirebaseModule } from "src/firebase/firebase.module";
import { MailModule } from "src/mail/mail.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { OtpModule } from "src/otp/otp.module";
import { BoostsModule } from "src/products/boosts/boosts.module";
import { CachesModule } from "src/products/caches/caches.module";
import { EventsModule } from "src/products/events/events.module";
import { ProductsModule } from "src/products/products.module";
import { ProductStat } from "src/products/stats/entities/product_stats.entity";
import { StatsModule } from "src/products/stats/stats.module";
import { User } from "src/user/entities/user.entity";
import { Verification } from "src/user/entities/verification.entity";
import { UserModule } from "src/user/user.module";
import { BullController } from "./bull.controller";
import { BullService } from "./bull.service";
import { AuthQueueProcessor } from "./processors/AuthenticationQueue";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Verification, ProductStat]),
    ,
    MailModule,
    FirebaseModule,
    NotificationsModule,
    UserModule,
    OtpModule,
    ProductsModule,
    CachesModule,
    EventsModule,
    BoostsModule,
    StatsModule,
    CartsModule,
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
  ],
  providers: [BullService, AuthQueueProcessor],
  controllers: [BullController],
})
export class BullModule {}
