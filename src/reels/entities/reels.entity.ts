import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ReelViewer } from '../views/entities/reels_viewers.entity';

export enum ReelStatus {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DRAFT = 'draft',
  BANNED = 'banned',
}

@Entity('reels')
@Index('user_recent_reels', ['userId', 'createdAt'])
@Index('public_feed', ['status', 'createdAt'])
@Index('trending_reels', ['views'])
export class Reel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({
    type: 'enum',
    enum: ReelStatus,
    default: ReelStatus.DRAFT,
  })
  status: ReelStatus;

  @Column({ type: 'int', default: 0 })
  views: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.reels)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ReelViewer, (reelViewer) => reelViewer.reel)
  viewers: ReelViewer[];
}