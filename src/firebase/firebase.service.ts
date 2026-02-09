import { Injectable, Logger } from "@nestjs/common";
import * as admin from "firebase-admin";
import { UserService } from "src/user/user.service";

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly userService: UserService) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          type: process.env.FIREBASE_TYPE,
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI,
          token_uri: process.env.FIREBASE_TOKEN_URI,
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
          universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
        } as admin.ServiceAccount),
      });

      this.logger.log("Firebase Admin initialized.");
    }
  }

  async sendPushNotification(token: string, title: string, body: string) {
    const message = {
      notification: { title, body },
      token,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`Message sent: ${response}`);
      return response;
    } catch (error) {
      this.logger.error("Failed to send push notification", error.stack || error);
      return null;
      //  throw new Error("Failed to send push notification");
    }
  }

  async sendPushNotificationToMultiple(tokens: string[], title: string, body: string) {
    const message = {
      notification: { title, body },
      tokens,
    };
    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Multicast message sent: ${response.successCount} succeeded, ${response.failureCount} failed`
      );
      return response;
    } catch (error) {
      this.logger.error("Failed to send multicast push notification", error.stack || error);
      return null;
      // throw new Error("Failed to send multicast push notification");
    }
  }

  async findUserFcmAndSendPushNotification({
    userId,
    title,
    body,
  }: {
    userId: string;
    title: string;
    body: string;
  }): Promise<void> {
    const user = await this.userService.getUserById(userId);
    if (user.fcm) {
      await this.sendPushNotification(user.fcm, title, body);
    }
  }
}
