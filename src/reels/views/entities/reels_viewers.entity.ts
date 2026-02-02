import { Reel } from 'src/reels/entities/reels.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('reels_viewers')
@Index(['reelsId', 'userId'], { unique: true })
export class ReelViewer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  reelsId: number;

  // Relationships
  @ManyToOne(() => Reel, (reel) => reel.viewers)
  @JoinColumn({ name: 'reelsId' })
  reel: Reel;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}