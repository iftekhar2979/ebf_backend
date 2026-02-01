import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ForgotPasswordDto {
  /**
   * Email of user
   */
  @ApiProperty({ required: true, description: "Email of user" })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;
}
