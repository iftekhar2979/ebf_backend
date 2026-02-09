// src/auth/dto/refresh-token.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({ description: "Refresh token issued during login" })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;

  @ApiProperty({ description: "Device ID from which refresh is requested" })
  @IsString()
  @IsOptional()
  device_id?: string;
}
