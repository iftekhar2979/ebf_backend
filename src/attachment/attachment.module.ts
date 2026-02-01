import { Module } from "@nestjs/common";
import { AttachmentController } from "./attachment.controller";
import { AttachmentService } from "./attachment.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageAttachment } from "./entiies/attachments.entity";

@Module({
  imports: [TypeOrmModule.forFeature([MessageAttachment])],
  controllers: [AttachmentController],
  providers: [AttachmentService],
  exports: [AttachmentService],
})
export class AttachmentModule {}
