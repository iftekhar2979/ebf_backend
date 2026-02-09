import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, Length } from "class-validator";
import { OtpType } from "src/otp/entities/otp.entity";

export class OtpVerificationDto {
  @ApiProperty({ required: true, description: "One Time Password Is Required" })
  @IsNotEmpty()
  @IsString({ message: "OTP must be a string" })
  @Length(4, 4, { message: "OTP must be exactly 4 characters long" })
  otp: string;

  @ApiProperty({ required: true, description: "Verification type Is Required" })
  @IsNotEmpty()
  @IsEnum(OtpType, { message: "Verification_type must be a valid " })
  verification_type: OtpType;
}
