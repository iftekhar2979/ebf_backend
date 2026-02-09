import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
export enum NotificationRelated {
  ORDER = 'order',
  PRODUCT = 'product',
  MESSAGE = 'message',
  USER = 'user',
}

export enum NotificationRecipientType {
  USER = 'user',
  SHOP = 'shop',
  ADMIN = 'admin',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  receipientId: number;

  @Column({ type: 'boolean', default: false })
  isImportant: boolean;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({
    type: 'enum',
    enum: NotificationRelated,
  })
  related: NotificationRelated;

  @Column({
    type: 'enum',
    enum: NotificationRecipientType,
  })
  receipientType: NotificationRecipientType;

  @Column({ type: 'int', nullable: true })
  actionId: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'receipientId' })
  recipient: User;
}