import { IsString, IsOptional, IsUrl } from "class-validator";

export class AttachmentDto {
  @IsUrl()
  file_url: string;

  @IsOptional()
  @IsString()
  file_type?: string;

  @IsOptional()
  @IsString()
  file_name?: string;
}
