import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { UserRoles } from "src/user/enums/role.enum";
import { IsNotAdmin } from "../../shared/decorators/not-admin.decorator";

export class CreateUserDto {
  /**
   * First Name of user
   */
  @ApiProperty({ required: true, description: "First Name of user" })
  @IsNotAdmin()
  @MaxLength(20, { message: "First Name exceeds given length" })
  @MinLength(1, { message: "First name has to be of length 1" })
  // @IsAlpha()
  @IsString({ message: "First name must be a string" })
  @IsNotEmpty({ message: "First name can not be empty" })
  first_name: string;

  /**
   * Last Name of user
   */
  @ApiProperty({ required: true, description: "Last Name of user" })
  @IsNotAdmin()
  @MaxLength(20, { message: "Last Name exceeds given length" })
  @MinLength(1, { message: "Last name has to be of length 1" })
  // @IsAlpha()
  @IsString({ message: "Last name must be a string" })
  @IsNotEmpty({ message: "Last name can not be empty" })
  last_name: string;

  /**
   * Email of user
   */
  @ApiProperty({ required: true, description: "Email of user" })
  @IsEmail({}, { message: "Invalid Email" })
  @IsString({ message: "Email can not be only numbers" })
  @IsNotEmpty({ message: "email can not be empty" })
  @Transform(({ value }) => value.trim().toLowerCase())
  email: string;

  @ApiProperty({ required: true, description: "Phone of user" })
  @IsNumberString()
  @MinLength(9)
  @MaxLength(18)
  @IsNotEmpty({ message: "phone can not be empty" })
  @Transform(({ value }) => value.trim().toLowerCase())
  phone: string;

  /**
   * Password user wants provide
   */
  @ApiProperty({ required: true, description: "Password user wants provide" })
  @IsNotEmpty({ message: "Password can not be empty" })
  @MinLength(8, { message: "Password must contain minimum of 8 characters" })
  @MaxLength(32, { message: "Password must contain maximum of 32 characters" })
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: "Weak Password",
  })
  password: string;
}

export class CreateAdminDto extends CreateUserDto {
  @IsNumberString()
  @MinLength(9)
  @MaxLength(18)
  @IsNotEmpty({ message: "Role Should be admin" })
  roles: UserRoles[];
}
