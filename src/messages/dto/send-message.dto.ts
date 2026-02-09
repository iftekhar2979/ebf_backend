import { IsUUID, IsInt, IsOptional, IsString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AttachmentDto } from "src/attachment/dto/attachments.dto";
import { User } from "src/user/entities/user.entity";

export class SendMessageDto {
  @IsUUID()
  sender: User;

  @IsInt()
  conversation_id: number;

  @IsOptional()
  @IsString()
  msg?: string;

  @IsOptional()
  @IsString()
  type?: "text" | "image" | "video" | "offer";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
