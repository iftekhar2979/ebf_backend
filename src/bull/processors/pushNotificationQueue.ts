import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Job } from "bull";

import { FirebaseService } from "src/firebase/firebase.service";
import { MailService } from "src/mail/mail.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";
import { SinglePushNotificationPayload } from "./types";

@Processor("notifications") // Processor listening to 'ProductQueue'
@Injectable()
export class PushNotificationProccessor {
  constructor(
    private readonly _firebaseService: FirebaseService,
    private readonly _notificationsService: NotificationsService,
    private readonly _mailService: MailService,
    @InjectLogger() private readonly _logger: Logger
  ) {}

  @Process("push_notifications")
  async pushNotifications(job: Job<SinglePushNotificationPayload>) {
    this._logger.log("Push Notification Logger", job.data);
    console.log("Push notification ", job.data);
    const { token, title, body } = job.data;
    // if(token){}
    await this._firebaseService.sendPushNotification(token, title, body);
  }

  // @Process("notification_saver")
  // async notificationSaver(job: Job<NotificationJobPayload>) {
  //   this._logger.log("Notification Saver Job started", job.data);
  //   console.log("Notification ", job.data);
  //   const { recepient, actor, action, msg, isImportant, related, targetId, notificationFor } = job.data;

  //   await this._notificationsService.createNotification({
  //     recepient_id: recepient.id,
  //     actor_id: actor.id,
  //     action,
  //     msg,
  //     notificationFor,
  //     isImportant,
  //     related,
  //     targetId,
  //   });

  //   if (job?.data?.title && job?.data?.body && recepient?.fcm) {
  //     console.log("Push Notification", recepient.fcm);
  //     await this._firebaseService.sendPushNotification(recepient.fcm, job.data.title, job.data.body);
  //   }
  // }

  // @Process("multiple_notification_saver")
  // async multipleNotificationSaver(job: Job<MultipleNotificationPayload[]>) {
  //   this._logger.log("Notification Saver Job started", job.data);
  //   const data = job.data;

  //   data.forEach(async (notification) => {
  //     this._logger.log("Preparing to send notification", notification);
  //     console.log("notification runner", notification);
  //     if (notification?.title && notification?.body && notification?.re?.fcm) {
  //       this._logger.log(
  //         `${notification.body} to send notification to ${notification.user.first_name} ${notification.user.last_name}`,
  //         notification
  //       );
  //       this._firebaseService.sendPushNotification(
  //         notification.user.fcm,
  //         notification.title,
  //         notification.body
  //       );
  //     }
  //   });
  //   await this._notificationsService.bulkInsertNotifications(data);
  // }

  @Process("mail_notification")
  async m(job: Job) {
    console.log("job data", job.data);
    this._logger.log("Notification Saver Job started", job.data);
    // console.log("Email", job.data);
    const { user, otp } = job.data;
    await this._mailService.sendForgotPasswordMail(user.email, `${otp}`);
  }

  // @Process("send_offer_with_mail")
  // async sendOffer(job: Job<>) {
  //   console.log("job data", job.data);
  //   this._logger.log("Notification Saver Job started", job.data);
  //   // console.log("Email", job.data);
  //   const { user, otp } = job.data;
  //   await this._mailService.sendForgotPasswordMail(user.email, `${otp}`);
  // }
}
