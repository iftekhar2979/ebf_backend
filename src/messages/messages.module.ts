import { forwardRef, Module } from "@nestjs/common";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Messages } from "./entities/messages.entity";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { AuthModule } from "src/auth/auth.module";
import { User } from "src/user/entities/user.entity";
import { AttachmentModule } from "src/attachment/attachment.module";
import { MessageAttachment } from "src/attachment/entiies/attachments.entity";
import { AttachmentService } from "src/attachment/attachment.service";
import { ConversationsModule } from "src/conversations/conversations.module";
import { UserModule } from "src/user/user.module";
import { ParticipantsModule } from "src/participants/participants.module";
import { SocketModule } from "src/socket/socket.module";
import { SocketService } from "src/socket/socket.service";
// import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Messages, Conversations, User, MessageAttachment]),
    AuthModule,
    //  forwardRef(() => SocketModule),
    SocketModule,
    ConversationsModule,
    UserModule,
    AttachmentModule,
    ParticipantsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
