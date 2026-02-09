import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Messages } from "src/messages/entities/messages.entity";
import { Repository } from "typeorm";
import { MessageAttachment } from "./entiies/attachments.entity";
import { SendMessageDto } from "src/messages/dto/send-message.dto";

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(MessageAttachment)
    private attachmentRepo: Repository<MessageAttachment>
  ) {}

  async addAttachments(message: Messages, attachments: SendMessageDto["attachments"]) {
    const entities = attachments.map((att) =>
      this.attachmentRepo.create({
        message,
        file_url: att.file_url,
        file_type: att.file_type,
        file_name: att.file_name,
      })
    );
    return this.attachmentRepo.save(entities);
  }

  async getAttachments(messageId: number): Promise<MessageAttachment[]> {
    return this.attachmentRepo.find({
      where: { message: { id: messageId } },
    });
  }
}
