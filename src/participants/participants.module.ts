import { Module } from "@nestjs/common";
import { ParticipantsController } from "./participants.controller";
import { ParticipantsService } from "./participants.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationParticipant } from "./entities/participants.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ConversationParticipant])],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
