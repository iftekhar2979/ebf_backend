import { Product } from 'src/products/entities/product.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity('product_stats')
export class ProductStat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'int', default: 0 })
  totalViews: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  organicClick: number;

  @Column({ type: 'float', default: 0 })
  totalBoostScore: number;

  @Column({ type: 'int', default: 0 })
  totalCarts: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Product, (product) => product.stats)
  @JoinColumn({ name: 'productId' })
  product: Product;
}