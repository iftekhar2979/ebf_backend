import { CartItem } from 'src/carts/cart_items/entities/cart_items.entity';
import { OrderItem } from 'src/orders/items/entities/order_items.entity';
import { ProductColor } from 'src/products/colors/entities/colors.entity';
import { Product } from 'src/products/entities/product.entity';
import { Size } from 'src/products/sizes/entities/sizes.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('product_varients')
@Index('product_listing_optimization', ['productId', 'colorId', 'sizeId'])
@Index('variant_price_idx', ['price'])
@Index('color_filter', ['colorId'])
@Index('color_price_filter', ['colorId', 'price'])
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  sizeId: number;

  @Column({ type: 'int' })
  colorId: number;

  @Column({ type: 'varchar', unique: true })
  sku: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  discount: number;

  @Column({ type: 'int' })
  productId: number;

  // Relationships
  @ManyToOne(() => Product, (product) => product.variants)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Size, (size) => size.variants)
  @JoinColumn({ name: 'sizeId' })
  size: Size;

  @ManyToOne(() => ProductColor, (color) => color.variants)
  @JoinColumn({ name: 'colorId' })
  color: ProductColor;

  @OneToMany(() => CartItem, (cartItem) => cartItem.productVariant)
  cartItems: CartItem[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.productVariant)
  orderItems: OrderItem[];
}