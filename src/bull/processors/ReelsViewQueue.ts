import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectLogger } from 'src/shared/decorators/logger.decorator';
import { REEL_VIEWS_QUEUE } from '../../reels/constants/reels.constants';
import { ViewsService } from '../../reels/views/views.service';

@Processor(REEL_VIEWS_QUEUE)
@Injectable()
export class ReelsViewProcessor {
  constructor(
    private readonly viewsService: ViewsService,
    @InjectLogger() private readonly logger: Logger
  ) {}

  @Process('track-view')
  async handleTrackView(job: Job<{ reelId: number; userId: number }>): Promise<any> {
    const { reelId, userId } = job.data;

    try {
      return await this.viewsService.processView(reelId, userId, this.logger);
    } catch (error) {
      this.logger.error(`Failed to process view for Reel ${reelId} by User ${userId}`, error.stack);
      throw error; 
    }
  }
}