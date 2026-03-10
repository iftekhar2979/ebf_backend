import { Product } from "src/products/entities/product.entity";
import { User } from "src/user/entities/user.entity";
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { ProductReviewImage } from "./product-review-image.entity";

@Entity("product_reviews")
@Index(["productId", "userId"], { unique: true }) // One review per user per product
@Index(["productId", "rating"])
export class ProductReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  productId: number;

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
  @ManyToOne(() => Product, (product) => product.reviews)
  @JoinColumn({ name: "productId" })
  product: Product;

  @ManyToOne(() => User, (user) => user.productReviews)
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToMany(() => ProductReviewImage, (image) => image.review, { cascade: true })
  images: ProductReviewImage[];
}
