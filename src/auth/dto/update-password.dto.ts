import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateMyPasswordDto {
  /**
   * Current password of user
   */
  @ApiProperty({ required: true, description: "Current password of user" })
  @IsNotEmpty()
  @IsString()
  passwordCurrent: string;

  /**
   * New password user wants to provide
   */
  @ApiProperty({ required: true, description: "New password user wants to provide" })
  @IsNotEmpty()
  @MinLength(8, { message: "password must contain minimum of 8 characters" })
  @MaxLength(32, { message: "password must contain maximum of 32 characters" })
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: "Weak Password",
  })
  password: string;

  /**
   * Must be same as password
   */
  @ApiProperty({ required: true, description: "Must be same as password" })
  @IsNotEmpty()
  @IsString()
  passwordConfirm: string;
}
