import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('global_product_stats')
export class Global {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', default: 0 })
  maxBoostScore: number;

  @Column({ type: 'float', default: 0 })
  maxPopularityScore: number;
}