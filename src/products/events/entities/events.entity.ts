import { Product } from "src/products/entities/product.entity";
import { User } from "src/user/entities/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
export enum ProductEventType {
  VIEW = "view",
  ADD_TO_CART = "add_to_cart",
  ORDER = "order",
}

@Entity("product_events")
@Index("product_popularity_tracking", ["productId", "userId"])
@Index("Event Type", ["eventType"])
export class ProductEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  productId: number;

  @Column({
    type: "enum",
    enum: ProductEventType,
  })
  eventType: ProductEventType;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Product, (product) => product.events)
  @JoinColumn({ name: "productId" })
  product: Product;

  @ManyToOne(() => User, (user) => user.productEvents)
  @JoinColumn({ name: "userId" })
  user: User;
}
