import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Job } from "bull";
import { OtpType } from "src/otp/entities/otp.entity";

import { JwtService } from "@nestjs/jwt";
import { FirebaseService } from "src/firebase/firebase.service";
import { MailService } from "src/mail/mail.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { OtpService } from "src/otp/otp.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { User } from "src/user/entities/user.entity";
import { Logger } from "winston";

@Processor("otp") // Processor listening to 'ProductQueue'
@Injectable()
export class OtpQueueProcessor {
  constructor(
    private readonly _firebaseService: FirebaseService,
    private readonly _notificationsService: NotificationsService,
    private readonly _mailService: MailService,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _jwtService: JwtService,
    private readonly _otpService: OtpService
  ) {}

  @Process("create")
  //   async pushNotifications(job: Job<SinglePushNotificationPayload>) {
  //     this._logger.log("Push Notification Logger", job.data);
  //     console.log("Push notification ", job.data);
  //     const { token, title, body } = job.data;
  //     // if(token){}
  //     await this._firebaseService.sendPushNotification(token, title, body);
  //   }
  async otpCreation(job: Job<{ user: User; otpType: OtpType }>) {
    this._logger.log("OTP Creation Job started", job.data);
    console.log("OTP Creation ", job.data);
    const { user, otpType } = job.data;

    const otp = await this._otpService.createOtp(user.id, otpType);

    this._logger.log("Sending welcome email", job.data);
    this._mailService.sendUserConfirmationMail(user, otp.otp);
  }
}
