import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { NotificationRelated } from "./entities/notifications.entity";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}
  @Get()
  @UseGuards(JwtAuthenticationGuard)
  async getNotifications(
    @GetUser() user: User,
    @Request() req,
    @Query("page") page: number = 1, // Default page 1
    @Query("limit") limit: number = 10, // Default limit 10
    @Query("isRead") isRead: boolean = false, // Default to false (unread)
    @Query("related") related: NotificationRelated, // Filter by related entity (product, order, etc.)
    @Query("isImportant") isImportant: boolean = false, // Default to false (not important)
    @Query("notificationFor") notificationFor: string // Filter by notificationFor (user role or specific notification group)
  ) {
    let roleInfo = UserRoles.USER;
    if (req.userInfo.roles.includes(UserRoles.ADMIN)) {
      notificationFor = UserRoles.ADMIN;
      roleInfo = UserRoles.ADMIN;
    }
    // Call the service to get notifications based on query params
    const notificationsResponse = await this.notificationService.getNotifications({
      recepient_id: roleInfo === UserRoles.ADMIN ? null : user.id,
      page,
      limit,
      isRead,
      related,
      isImportant,
      notificationFor: roleInfo,
    });

    // Return the response
    return notificationsResponse;
  }
}
