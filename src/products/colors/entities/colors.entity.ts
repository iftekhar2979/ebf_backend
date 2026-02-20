import { ProductVariant } from "src/products/varients/entities/varients.entity";
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

@Entity("product_colors")
export class ProductColor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  image: string;

  // Relationships
  @OneToMany(() => ProductVariant, (variant) => variant.color)
  variants: ProductVariant[];
}
