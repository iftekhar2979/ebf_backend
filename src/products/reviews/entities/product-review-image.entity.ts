import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ProductReview } from "./product-review.entity";

@Entity("product_review_images")
@Index(["reviewId"])
export class ProductReviewImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  @Index()
  reviewId: number;

  @Column({ type: "varchar" })
  image: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => ProductReview, (review) => review.images, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reviewId" })
  review: ProductReview;
}
