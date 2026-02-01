// create-conversation.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDirectConversationDto {
  @ApiProperty()
  @IsNumber()
  productId: number;

  @IsString()
  @MinLength(36)
  @MaxLength(36)
  userId: string;
}
