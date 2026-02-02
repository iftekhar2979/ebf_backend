import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { pagination } from "src/shared/utils/pagination";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { Repository } from "typeorm";
import {
  NotificationRelated,
} from "./entities/notifications.entity";
import { GetNotificationsResponse } from "./types/notification.response";

@Injectable()
export class NotificationsService {
  // constructor(
  //   @InjectRepository(Notifications)
  //   private readonly _notificationsRepository: Repository<Notifications>
  // ) {}

  // async createNotification({
  //   recepient_id,
  //   actor_id,
  //   related,
  //   action,
  //   type = NotificationType.INFO,
  //   msg,
  //   targetId,
  //   notificationFor,
  //   isImportant = false,
  // }: {
  //   recepient_id: string;
  //   actor_id: string;
  //   related: NotificationRelated;
  //   action: NotificationAction;
  //   type?: NotificationType;
  //   msg: string;
  //   targetId: number;
  //   notificationFor?: string;
  //   isImportant?: boolean;
  // }): Promise<Notifications> {
  //   const notification = this._notificationsRepository.create({
  //     recepient: { id: recepient_id } as User, // Ensure correct user object is passed
  //     actor: { id: actor_id } as User,
  //     related,
  //     action,
  //     type,
  //     msg,
  //     target_id: targetId,
  //     notificationFor,
  //     isImportant,
  //   });
  //   // Save the notification to the database
  //   return await this._notificationsRepository.save(notification);
  // }
  // async bulkInsertNotifications(
  //   notificationsData: {
  //     recepient_id: string;
  //     actor_id: string;
  //     related: NotificationRelated;
  //     action: NotificationAction;
  //     type?: NotificationType;
  //     msg: string;
  //     targetId?: number;
  //     notificationFor?: UserRoles;
  //     isImportant?: boolean;
  //   }[]
  // ): Promise<Notifications[]> {
  //   // Create an array of notifications to insert
  //   const notifications = notificationsData.map((data) => {
  //     return this._notificationsRepository.create({
  //       recepient: { id: data.recepient_id } as User, // Ensure correct user object is passed
  //       actor: { id: data.actor_id } as User,
  //       related: data.related,
  //       action: data.action,
  //       type: data.type || NotificationType.INFO,
  //       msg: data.msg,
  //       target_id: data.targetId,
  //       notificationFor: data.notificationFor,
  //       isImportant: data.isImportant || false,
  //     });
  //   });

  //   // Insert all notifications in bulk (single transaction)
  //   return await this._notificationsRepository.save(notifications);
  // }
  // async getNotifications({
  //   recepient_id,
  //   page,
  //   limit,
  //   notificationFor,
  // }: {
  //   recepient_id: string;
  //   page: number;
  //   limit: number;
  //   isRead: boolean;
  //   related: string;
  //   isImportant: boolean;
  //   notificationFor: string;
  // }): Promise<GetNotificationsResponse> {
  //   const skip = (page - 1) * limit;
  //   const take = limit;
  //   // Start building the query
  //   const query = this._notificationsRepository.createQueryBuilder("notification");

  //   if (recepient_id) {
  //     query.where("notification.recepient_id = :recepient_id", { recepient_id });
  //   }

  //   if (notificationFor) {
  //     query.andWhere("notification.notificationFor = :notificationFor", { notificationFor });
  //   }

  //   // Apply pagination
  //   query.skip(skip).take(take).orderBy("notification.created_at", "DESC");

  //   // Fetch the notifications and total count
  //   const [notifications, total] = await query.getManyAndCount();
  //   const data = notifications.map((notification) => ({
  //     id: notification.id,
  //     msg: notification.msg,
  //     related: notification.related,
  //     recepient_id: notification.recepient,
  //     action: notification.action,
  //     type: notification.type,
  //     target_id: notification.target_id,
  //     isRead: notification.isRead,
  //     isImportant: notification.isImportant,
  //     created_at: notification.created_at.toISOString(),
  //     updated_at: notification.updated_at.toISOString(),
  //   }));

  //   return {
  //     message: "Notifications retrieved successfully",
  //     statusCode: 200,
  //     data,
  //     pagination: pagination({ page, limit, total }),
  //   };
  // }
}
