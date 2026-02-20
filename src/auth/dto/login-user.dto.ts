import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginUserDto {
  /**
   * Email of user
   */
  @ApiProperty({ required: true, description: "Email of user" })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  /**
   * Password of user
   */
  @ApiProperty({ required: true, description: "Password of user" })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: true, description: "Firebase cloud messaging token" })
  // @IsNotEmpty()
  @IsOptional()
  @IsString()
  fcm?: string;

  @ApiProperty({ required: true, description: "Device UUID" })
  @IsNotEmpty()
  @IsString()
  device_id?: string;
}
