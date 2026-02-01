import { Messages } from "src/messages/entities/messages.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("message_attachments")
export class MessageAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Messages, (message) => message.attachments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id" })
  message: Messages;

  @Column({ type: "varchar" })
  file_url: string;

  @Column({ type: "varchar", nullable: true })
  file_type?: string; // e.g. 'image/png', 'application/pdf'

  @Column({ type: "varchar", nullable: true })
  file_name?: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  uploaded_at: Date;
}
