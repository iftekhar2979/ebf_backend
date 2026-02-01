import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "aws-sdk/clients/workmail";
import { User } from "src/user/entities/user.entity";
// import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum NotificationRelated {
  PRODUCT = "product",
  ORDER = "order",
  CONVERSATION = "conversation",
  WALLET = "wallet",
}
export enum NotificationType {
  INFO = "info",
  SUCCESS = "success",
  ERROR = "error",
}

export enum NotificationAction {
  CREATED = "created",
  UPDATED = "updated",
  DELETED = "deleted",
}

@Entity("notifications")
export class Notifications {
  @ApiProperty({ example: 1, description: "Unique ID for the notification" })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "recepient_id" })
  recepient: User;
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "actor_id" })
  actor: User;
  @ApiProperty({ example: "Product Created", description: "Notification title or brief message" })
  @Column({ type: "text", nullable: true })
  msg: string;
  @ApiProperty({ example: "Product Created", description: "Notification title or brief message" })
  @Column({ type: "text", nullable: true })
  notificationFor: UserRole;

  @ApiProperty({ description: "The type of entity this notification is related to" })
  @Column({
    type: "enum",
    enum: NotificationRelated,
  })
  related: NotificationRelated;

  @ApiProperty({ description: "Action that triggered the notification" })
  @Column({
    type: "enum",
    enum: NotificationAction,
  })
  action: NotificationAction;

  @ApiProperty({ example: "success", description: "Notification type (info, success, error)" })
  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @ApiProperty({ description: "The entity related to the notification (product, order, etc.)" })
  @Column({ nullable: true })
  target_id: number;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isImportant: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
