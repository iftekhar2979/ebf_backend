import { IsUUID, IsInt } from "class-validator";

export class AddParticipantDto {
  @IsInt()
  conversationId: number;

  @IsUUID()
  userId: string;
}
