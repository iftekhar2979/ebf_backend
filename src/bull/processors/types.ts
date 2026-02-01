import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";

export interface NotificationJobPayload {
  user: User;
  action: NotificationAction;
  msg: string;
  isImportant?: boolean;

  related: NotificationRelated;
  targetId?: number;
  notificationFor?: string;
  title?: string;
  body?: string;
}

export interface PushNotificationPayload {
  tokens: string[]; // list of FCM tokens
  title: string; // notification title
  body: string; // notification message
}

export interface SinglePushNotificationPayload {
  token: string; // list of FCM tokens
  title: string; // notification title
  body: string; // notification message
}

export interface MultipleNotificationPayload {
  recepient_id: string;
  recepient?: User;
  actor_id: string;
  related: NotificationRelated;
  action: NotificationAction;
  type?: NotificationType;
  msg: string;
  targetId?: number;
  notificationFor?: UserRoles;
  isImportant?: boolean;
  title?: string; // notification title
  body?: string;
}
