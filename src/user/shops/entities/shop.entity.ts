import { User } from "src/user/entities/user.entity";
import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { ShopAddress } from "../address/entities/address.entity";
@Entity("shop_profiles")
export class ShopProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid" })
  @Index({ unique: true })
  userId: string;

  @Column({ type: "varchar", nullable: true })
  contactNumber: string;

  @Column({ type: "varchar", nullable: true })
  name: string;

  @Column({ type: "simple-array", nullable: true })
  availableDays: string[];

  @Column({ type: "varchar", nullable: true })
  openingTime: string;

  @Column({ type: "varchar", nullable: true })
  closingTime: string;

  @Column({ type: "varchar", nullable: true })
  facebookLink: string;

  @Column({ type: "varchar", nullable: true })
  instagramLink: string;

  @Column({ type: "varchar", nullable: true })
  whatsappLink: string;

  @Column({ type: "varchar", nullable: true })
  banner: string;

  // Relationships
  @OneToOne(() => User, (user) => user.shopProfile)
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToOne(() => ShopAddress, (shopAddress) => shopAddress.shop)
  shopAddress: ShopAddress;
}
