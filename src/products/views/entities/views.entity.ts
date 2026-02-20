import { Product } from "src/products/entities/product.entity";
import { User } from "src/user/entities/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("product_views")
@Index("product_views_tracking", ["productId", "viewedAt"])
@Index("user_history", ["userId", "viewedAt"])
export class ProductView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  productId: number;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "timestamp" })
  viewedAt: Date;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Product, (product) => product.views)
  @JoinColumn({ name: "productId" })
  product: Product;

  @ManyToOne(() => User, (user) => user.productViews)
  @JoinColumn({ name: "userId" })
  user: User;
}
