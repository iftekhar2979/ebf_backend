import { Order } from "src/orders/entities/orders.entity";
import { ProductVariant } from "src/products/varients/entities/varients.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  orderId: number;

  @Column({ type: "int" })
  productVarientId: number;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountApplied: number;

  // Relationships
  @ManyToOne(() => Order, (order) => order.orderItems)
  @JoinColumn({ name: "orderId" })
  order: Order;

  @ManyToOne(() => ProductVariant, (variant) => variant.orderItems)
  @JoinColumn({ name: "productVarientId" })
  productVariant: ProductVariant;
}
