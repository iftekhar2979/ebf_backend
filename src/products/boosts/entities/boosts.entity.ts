import { Payment } from 'src/payments/entities/payments.entity';
import { Product } from 'src/products/entities/product.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';

export enum BoostingStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

@Entity('product_boosting')
@Index('product_boosting_popularity_tracking', ['productId'])
@Index('Product Event End Date', ['startDate', 'endDate'])
export class ProductBoosting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  boostScore: number;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({
    type: 'enum',
    enum: BoostingStatus,
    default: BoostingStatus.PENDING,
  })
  status: BoostingStatus;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // Relationships
  @OneToOne(() => Product, (product) => product.boosting)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @OneToOne(() => Payment, (payment) => payment.boosting)
  payment: Payment;
}