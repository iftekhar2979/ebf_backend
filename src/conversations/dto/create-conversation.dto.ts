import { IsUUID, IsArray, ArrayMinSize, IsInt } from "class-validator";

export class CreateConversationDto {
  @IsInt()
  orderId: number;

  @IsArray()
  @ArrayMinSize(2)
  @IsUUID("4", { each: true })
  participantIds: string[];
}
