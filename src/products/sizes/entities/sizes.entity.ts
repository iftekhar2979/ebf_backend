import { ProductVariant } from "src/products/varients/entities/varients.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";

@Entity("sizes")
export class Size {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  type: string;

  @Column({ type: "varchar" })
  desc: string;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => ProductVariant, (variant) => variant.size)
  variants: ProductVariant[];
}
