import { ApiProperty } from "@nestjs/swagger";
import { Messages } from "src/messages/entities/messages.entity";
import { ConversationParticipant } from "src/participants/entities/participants.entity";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
@Entity("conversations")
export class Conversations {
  @ApiProperty({ example: 1, description: "Unique ID for the conversation" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "iPhone 11 (Iftekhar - John)", description: "Conversation Name" })
  @Column({ nullable: false })
  name: string;

  @ApiProperty({ example: "https://example.com/image.jpg", description: "Conversation image URL" })
  @Column({ nullable: true })
  image?: string;

  @ApiProperty({ description: "Last Message" })
  @OneToOne(() => Messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lastmsg" })
  lastmsg: Messages;
  @ApiProperty({ type: () => [Messages], description: "Messages in the conversation" })
  @OneToMany(() => Messages, (message) => message.conversation, { cascade: true })
  messages: Messages[];

  @ApiProperty({ type: () => [User], description: "Users participating in the conversation" })
  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants: ConversationParticipant[];

  @ApiProperty({ description: "Conversation creation timestamp" })
  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @ApiProperty({ description: "Conversation update timestamp" })
  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
