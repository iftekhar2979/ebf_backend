import { CartItem } from "src/carts/cart_items/entities/cart_items.entity";
import { OrderItem } from "src/orders/items/entities/order_items.entity";
import { Product } from "src/products/entities/product.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("product_varients")
@Index("product_listing_optimization", ["productId", "size"])
@Index("color_filter", ["colorHex"])
@Index(["sku"], { unique: true })
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  size: string;

  @Column({ type: "varchar" })
  colorHex: string;

  @Column({ type: "varchar" })
  sku: string;

  @Column({ type: "int", default: 1 })
  unit: number;

  @Column({ type: "int", default: 0 })
  discount: number;

  @Column({ type: "int" })
  productId: number;

  // Relationships
  @ManyToOne(() => Product, (product) => product.variants)
  @JoinColumn({ name: "productId" })
  product: Product;

  @OneToMany(() => CartItem, (cartItem) => cartItem.productVariant)
  cartItems: CartItem[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.productVariant)
  orderItems: OrderItem[];
}
