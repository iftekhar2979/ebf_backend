import { User } from "src/user/entities/user.entity";
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { ShopProfile } from "../../entities/shop.entity";

@Entity("shop_reviews")
@Index(["shopId", "userId"], { unique: true }) // One review per user per shop
@Index(["shopId", "rating"])
export class ShopReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  shopId: number;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "decimal", precision: 2, scale: 1 })
  rating: number; // 1.0 - 5.0

  @Column({ type: "text", nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ShopProfile, (shop) => shop.reviews)
  @JoinColumn({ name: "shopId" })
  shop: ShopProfile;

  @ManyToOne(() => User, (user) => user.reviewsReceived)
  @JoinColumn({ name: "userId" })
  user: User;
}
