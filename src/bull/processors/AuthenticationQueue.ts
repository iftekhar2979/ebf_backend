import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Job } from "bull";

import { JwtService } from "@nestjs/jwt";
import { FirebaseService } from "src/firebase/firebase.service";
import { MailService } from "src/mail/mail.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { OtpService } from "src/otp/otp.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { User } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import { Logger } from "winston";

@Processor("authentication") // Processor listening to 'ProductQueue'
@Injectable()
export class AuthQueueProcessor {
  constructor(
    private readonly _firebaseService: FirebaseService,
    private readonly _notificationsService: NotificationsService,
    private readonly _mailService: MailService,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _jwtService: JwtService,
    private readonly _otpService: OtpService,
    private readonly _userService: UserService
  ) {}

  @Process("fcm_store")
  async fcmStore(job: Job<{ user: User; fcm: string }>) {
    this._logger.log("User Updated With FCM", job.data);
    const { user, fcm } = job.data;
    await this._userService.updateUser(user.id, { fcm });
  }
}
