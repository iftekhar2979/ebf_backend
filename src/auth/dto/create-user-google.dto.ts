import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateUserGoogleDto {
  /**
   * GoogleID of user
   */
  @ApiProperty({ required: true, description: "GoogleID of user" })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  /**
   * first_name of user
   */
  @ApiPropertyOptional({ description: "first_name of user" })
  @IsString()
  @IsOptional()
  first_name?: string;

  /**
   * last_name of user
   */
  @ApiProperty({ required: true, description: "last_name of user" })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  /**
   * Email of user
   */
  @ApiProperty({ required: true, description: "Email of user" })
  @IsEmail()
  @IsString({ message: "Email can not be only numbers" })
  @IsNotEmpty()
  email: string;
}
