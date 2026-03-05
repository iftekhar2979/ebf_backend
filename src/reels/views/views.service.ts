import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { InjectLogger } from 'src/shared/decorators/logger.decorator';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { RedisService } from '../../redis/redis.service';
import { REEL_VIEWED_BY_USER_PREFIX, REEL_VIEWS_QUEUE } from '../constants/reels.constants';
import { Reel } from '../entities/reels.entity';
import { ReelViewer } from './entities/reels_viewers.entity';

@Injectable()
export class ViewsService {
  constructor(
    @InjectQueue(REEL_VIEWS_QUEUE) private reelViewsQueue: Queue,
    private readonly redisService: RedisService,
    @InjectRepository(ReelViewer)
    private readonly reelViewerRepository: Repository<ReelViewer>,
    @InjectRepository(Reel)
    private readonly reelRepository: Repository<Reel>,
    @InjectLogger()
    private readonly logger: Logger,
  ) {}

  async trackView(reelId: number, userId: string): Promise<void> {
    const cacheKey = `${REEL_VIEWED_BY_USER_PREFIX}${userId}_${reelId}`;

    // 1. Check if user already viewed this reel in quick-access Redis cache
    const alreadyViewed = await this.redisService.getCache(cacheKey);
    if (alreadyViewed) {
      return; // Stop if recently tracked
    }

    // 2. Add job to BullMQ for asynchronous database operations
    await this.reelViewsQueue.add('track-view', {
      reelId,
      userId,
    });

    // 3. Mark in Redis as viewed to avoid duplicate queues
    // Cache for 30 days
    await this.redisService.setCacheWithTTL(cacheKey, '1', 60 * 60 * 24 * 30);
  }

  async processView(reelId: number, userId: number, logger: any): Promise<void> {
    // 1. Check if view record already exists (to prevent DB unique constraint errors)
    const existingView = await this.reelViewerRepository.findOne({
      where: { reelsId: reelId, userId: userId },
    });

    if (!existingView) {
      // 2. Save ReelViewer Record
      const reelViewer = this.reelViewerRepository.create({
        reelsId: reelId,
        userId: userId,
      });
      await this.reelViewerRepository.save(reelViewer);

      // 3. Increment Reel overall View Count
      await this.reelRepository.increment({ id: reelId }, 'views', 1);

      logger.debug(`Successfully processed view for Reel ${reelId} by User ${userId}`);
    } else {
       logger.debug(`View already exists in DB for Reel ${reelId} by User ${userId}`);
    }
  }
}
