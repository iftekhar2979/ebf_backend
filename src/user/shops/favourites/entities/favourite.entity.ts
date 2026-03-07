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

@Entity("favourite_shops")
@Index(["shopId", "userId"], { unique: true })
export class FavouriteShop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  @Index()
  shopId: number;

  @Column({ type: "uuid" })
  @Index()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ShopProfile)
  @JoinColumn({ name: "shopId" })
  shop: ShopProfile;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;
}
