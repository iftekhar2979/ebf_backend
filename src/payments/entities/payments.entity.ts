import { Order } from 'src/orders/entities/orders.entity';
import { ProductBoosting } from 'src/products/boosts/entities/boosts.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';

export enum PayableType {
  BOOSTING = 'boosting',
  ORDER = 'order',
  SUBSCRIPTION = 'subscription',
}

export enum PaymentMethod {
  BKASH = 'bkash',
  NOGOD = 'nogod',
  ROCKET = 'rocket',
}

export enum PaymentStatusEnum {
  PAID = 'paid',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: PayableType,
  })
  payableType: PayableType;

  @Column({ type: 'int', nullable: true })
  orderId: number;

  @Column({ type: 'int', nullable: true })
  boostingId: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  transectionId: string;

  @Column({ type: 'varchar', nullable: true })
  paymentId: string;

  @Column({
    type: 'enum',
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.PENDING,
  })
  status: PaymentStatusEnum;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  // Relationships
  @OneToOne(() => Order, (order) => order.payment)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @OneToOne(() => ProductBoosting, (boosting) => boosting.payment)
  @JoinColumn({ name: 'boostingId' })
  boosting: ProductBoosting;
}