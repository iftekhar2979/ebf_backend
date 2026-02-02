import { Cart } from 'src/carts/entities/carts.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductVariant } from 'src/products/varients/entities/varients.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cartId: number;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'int' })
  productVarientId: number;

  @Column({ type: 'int', default: 1 })
  quanity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', nullable: true })
  sku: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Cart, (cart) => cart.cartItems)
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @ManyToOne(() => Product, (product) => product.cartItems)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => ProductVariant, (variant) => variant.cartItems)
  @JoinColumn({ name: 'productVarientId' })
  productVariant: ProductVariant;
}