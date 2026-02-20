import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsString } from "class-validator";

export enum AccountStatus {
  INACTIVE = "inactive",
  ACTIVE = "active",
  BLOCKED = "blocked",
  SUSPENDED = "suspended",
  REJECTED = "rejected",
}
export class CreateVerificationDto {
  @ApiProperty({ description: "User ID associated with the verification" })
  @IsString()
  user_id: string;

  @ApiProperty({ description: "Indicates if the email is verified", default: false })
  @IsBoolean()
  is_email_verified: boolean;

  @ApiProperty({ description: "Indicates if the seller is verified", default: false })
  @IsBoolean()
  is_admin_verified: boolean;
  @ApiProperty({ description: "Indicates if the seller is verified", default: false })
  @IsBoolean()
  is_suspended: boolean;
  @ApiProperty({ description: "Indicates if the record is deleted", default: false })
  @IsBoolean()
  is_deleted: boolean;

  @IsEnum(AccountStatus)
  @ApiProperty({
    enum: AccountStatus,
    default: [AccountStatus.INACTIVE],
    description: `String array, containing enum values, either ${AccountStatus.ACTIVE} or ${AccountStatus.INACTIVE}`,
  })
  status: AccountStatus;
}

export class UpdateVerificationDto {
  @ApiProperty({ description: "User ID associated with the verification", required: false })
  @IsInt()
  user_id?: number;

  @ApiProperty({ description: "Indicates if the email is verified", default: false, required: false })
  @IsBoolean()
  is_email_verified?: boolean;

  @ApiProperty({ description: "Indicates if the seller is verified", default: false, required: false })
  @IsBoolean()
  is_seller_verified?: boolean;

  @ApiProperty({ description: "Indicates if the record is deleted", default: false, required: false })
  @IsBoolean()
  is_deleted?: boolean;

  @ApiProperty({ description: "Status of the verification", default: "active", required: false })
  @IsString()
  status?: string;
}
