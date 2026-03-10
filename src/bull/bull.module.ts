import { BullModule as BullMQModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FirebaseModule } from "src/firebase/firebase.module";
import { MailModule } from "src/mail/mail.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { OtpModule } from "src/otp/otp.module";
import { User } from "src/user/entities/user.entity";
import { Verification } from "src/user/entities/verification.entity";
import { UserModule } from "src/user/user.module";
import { BullController } from "./bull.controller";
import { BullService } from "./bull.service";
import { AuthQueueProcessor } from "./processors/AuthenticationQueue";
import { QueueProducerService } from "./queue-producer.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Verification]),
    BullMQModule.registerQueue({
      name: "enterprise_task_queue",
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>("JWT_SECRET"),
          signOptions: {
            expiresIn: configService.get<string>("EXPIRES_IN") as any,
          },
        };
      },
    }),
    MailModule,
    FirebaseModule,
    NotificationsModule,
    UserModule,
    OtpModule,
  ],
  providers: [BullService, AuthQueueProcessor, QueueProducerService],
  controllers: [BullController],
  exports: [QueueProducerService],
})
export class QueueModule {}
