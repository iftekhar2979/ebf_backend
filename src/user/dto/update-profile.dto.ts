// src/users/dto/update-profile.dto.ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  first_name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  last_name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  phone?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  address?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "URL or base64 of the profile picture" })
  image?: string;
}
