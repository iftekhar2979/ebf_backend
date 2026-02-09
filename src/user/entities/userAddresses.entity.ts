import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "./user.entity";
import { IsString } from "class-validator";
@Entity({ name: "user_addresses" })
export class UserAddress {
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty()
  id: string;

  @Column({ nullable: true })
  @ApiProperty({ description: "User ID associated with the verification" })
  @IsString()
  user_id: string;
  @OneToOne(() => User) // Assuming User entity
  @JoinColumn({ name: "user_id" })
  @ApiProperty({ type: () => User })
  user: User;

  @Column({ type: "varchar", nullable: true })
  @ApiProperty({ example: "221B Baker Street" })
  address: string;

  @Column({ type: "varchar", nullable: true })
  @ApiProperty({ example: "221B" })
  house_number: string;

  @Column({ type: "varchar", nullable: true })
  @ApiProperty({ example: "Apartment 4A" })
  address_2: string;

  @Column({ type: "varchar", nullable: true })
  @ApiProperty({ example: "London" })
  city: string;

  @Column({ type: "varchar", length: 5, nullable: true })
  @ApiProperty({ example: "GB" })
  country: string;

  @Column({ type: "varchar", nullable: true })
  @ApiProperty({ example: "NW1 6XE" })
  postal_code: string;

  @Column({ type: "varchar", nullable: true })
  @ApiProperty({ example: "England" })
  country_state: string;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  @ApiProperty({ example: 51.523767 })
  latitude: number;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  @ApiProperty({ example: -0.1585557 })
  longitude: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;
}
