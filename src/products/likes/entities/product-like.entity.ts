import { Product } from "src/products/entities/product.entity";
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

@Entity("product_likes")
@Index(["productId", "userId"], { unique: true })
export class ProductLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  @Index()
  productId: number;

  @Column({ type: "uuid" })
  @Index()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Product)
  @JoinColumn({ name: "productId" })
  product: Product;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;
}
