import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Index } from "typeorm";
import { ShopProfile } from "../../entities/shop.entity";

@Entity("shop_address")
@Index("Geo Pastial", ["latitude", "longitude"])
@Index("City_and_area", ["city", "area"])
@Index(["userId", "shopId", "id"], { unique: true })
export class ShopAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "int" })
  shopId: number;

  @Column({ type: "varchar", nullable: true })
  city: string;

  @Column({ type: "varchar", nullable: true })
  area: string;

  @Column({ type: "varchar", nullable: true })
  postalCode: string;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude: number;

  // Relationships
  @OneToOne(() => ShopProfile, (shopProfile) => shopProfile.shopAddress)
  @JoinColumn({ name: "shopId" })
  shop: ShopProfile;
}
