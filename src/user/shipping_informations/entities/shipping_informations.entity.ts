import { Order } from "src/orders/entities/orders.entity";
import { User } from "src/user/entities/user.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from "typeorm";

@Entity("shipping_infos")
export class ShippingInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", nullable: true })
  city: string;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "varchar", nullable: true })
  country: string;

  @Column({ type: "varchar", nullable: true })
  postalCode: string;

  @Column({ type: "varchar", nullable: true })
  address: string;

  @Column({ type: "varchar", nullable: true })
  phone: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.shippingInfos)
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToOne(() => Order, (order) => order.shipping)
  order: Order;
}
