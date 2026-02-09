import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { Messages } from "src/messages/entities/messages.entity";
import { ParticipantsModule } from "src/participants/participants.module";
import { SocketModule } from "src/socket/socket.module";
import { UserModule } from "src/user/user.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { Conversations } from "./entities/conversations.entity";
// import { SocketService } from 'src/socket/socket.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversations, Messages]),
    ParticipantsModule,
    UserModule,
    AuthModule,
    SocketModule,
  ],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
