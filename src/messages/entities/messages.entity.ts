import { ApiProperty } from "@nestjs/swagger";
import { MessageAttachment } from "src/attachment/entiies/attachments.entity";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
// Make sure this path is correct

@Entity("messages")
export class Messages {
  @ApiProperty({ example: 1, description: "Unique ID for the message" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "uuid-of-user", description: "User ID of sender" })
  @Column({ type: "uuid" })
  sender_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sender_id" })
  sender: User;
  @ApiProperty({ example: "1", description: "Offer Id" })
  @Column({ nullable: true, unique: false })
  offer_id: number;
  @ApiProperty({ example: "1", description: "Offer Id" })
  @Column({ nullable: true, unique: false })
  conversation_id: number;

  @ApiProperty({ example: "Hello!", description: "Message text" })
  @Column({ type: "text", nullable: true })
  msg?: string;
  @ApiProperty({ example: "Text", description: "Text | Image | Offer" })
  @Column({ type: "text", nullable: true })
  type?: "text" | "offer" | "image" | "video";

  @ApiProperty({ description: "Conversation this message belongs to" })
  @ManyToOne(() => Conversations, (conversation) => conversation.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversations;

  @ApiProperty({ type: () => [MessageAttachment], description: "Message attachments" })
  @OneToMany(() => MessageAttachment, (attachment) => attachment.message, { cascade: true })
  attachments?: MessageAttachment[];
  @ApiProperty({ type: () => Boolean, description: "Message Seen", example: "true" })
  @Column()
  isRead: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
