/* eslint-disable no-unused-vars */
import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsString } from "class-validator";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum OtpType {
  LOGIN = "login",
  REGISTRATION = "registration",
  FORGOT_PASSWORD = "forgot_password",
  VERIFY_EMAIL = "verify_email",
  VERIFY_PHONE = "verify_phone",
  TWO_FACTOR_AUTH = "two_factor_auth",
  RESET_PASSWORD = "reset_password",
  CHANGE_EMAIL = "change_email",
  CHANGE_PHONE = "change_phone",
  CUSTOM = "custom",
}

@Entity({ name: "otps" })
export class Otp {
  @PrimaryGeneratedColumn("increment")
  @ApiProperty()
  id: number;

  @Column({ type: "varchar", length: 4 }) // Store OTP as a string (typically 6 digits)
  @ApiProperty()
  @IsString() // Validate that OTP is a string
  otp: string;

  @Column({ type: "string" })
  @ApiProperty()
  @IsString()
  user_id: string;

  @Column("enum", { enum: OtpType, default: OtpType.REGISTRATION })
  @ApiProperty({ enum: OtpType, default: OtpType.REGISTRATION })
  type: OtpType;
  @Column({ type: "int", default: 0 })
  @ApiProperty({ type: Number, default: 0 })
  attempts: number;

  @ManyToOne(() => User) // Assuming User entity exists
  @JoinColumn({ name: "user_id" })
  @ApiProperty({ type: () => User })
  user: User;

  @Column({ type: "timestamp" })
  @ApiProperty()
  @IsDate() // Ensure expiresAt is a valid date
  expiresAt: Date;
  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;
}
