import { CartItem } from "src/carts/cart_items/entities/cart_items.entity";
import { User } from "src/user/entities/user.entity";
import { Wishlist } from "src/wishlists/entities/wishlists.entity";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ProductBoosting } from "../boosts/entities/boosts.entity";
import { ProductEvent } from "../events/entities/events.entity";
import { ProductImage } from "../images/entities/images.entity";
import { ProductRank } from "../ranks/entities/product_rank.entity";
import { ProductStat } from "../stats/entities/product_stats.entity";
import { SubCategory } from "../sub_categories/entities/sub_categories.entity";
import { ProductVariant } from "../varients/entities/varients.entity";
import { ProductView } from "../views/entities/views.entity";

export enum TargetedGender {
  MALE = "male",
  FEMALE = "female",
  COMMON = "common",
  OTHER = "other",
}

@Entity("products")
@Index(["subCategoryId", "targetedGender"])
@Index(["userId"])
@Index("active_discounts", ["discountEndDate", "discountStartDate"])
@Index("full_text_index", ["productName"])
@Index("price_idx", ["price"])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  productName: string;

  @Column({ type: "varchar" })
  userId: string;

  @Column({
    type: "enum",
    enum: TargetedGender,
  })
  targetedGender: TargetedGender;

  @Column({ type: "int" })
  subCategoryId: number;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  discountPercentage: number;

  @Column({ type: "timestamp", nullable: true })
  discountStartDate: Date;

  @Column({ type: "timestamp", nullable: true })
  discountEndDate: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  // Relationships
  @ManyToOne(() => User, (user) => user.products)
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => SubCategory, (subCategory) => subCategory.products)
  @JoinColumn({ name: "subCategoryId" })
  subCategory: SubCategory;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => ProductImage, (image) => image.product)
  images: ProductImage[];

  @OneToMany(() => ProductView, (view) => view.product)
  views: ProductView[];

  @OneToMany(() => ProductEvent, (event) => event.product)
  events: ProductEvent[];

  @OneToOne(() => ProductBoosting, (boosting) => boosting.product)
  boosting: ProductBoosting;

  @OneToMany(() => Wishlist, (wishlist) => wishlist.product)
  wishlists: Wishlist[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.product)
  cartItems: CartItem[];

  @OneToOne(() => ProductStat, (stat) => stat.product)
  stats: ProductStat;

  @OneToOne(() => ProductRank, (rank) => rank.product)
  rank: ProductRank;
}
