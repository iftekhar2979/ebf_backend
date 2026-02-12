import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectLogger } from 'src/shared/decorators/logger.decorator';
import { Logger } from 'winston';
import { StatsService } from 'src/products/stats/stats.service';
import { BoostsService } from 'src/products/boosts/boosts.service';

export interface ActivateBoostJob {
  boostId: number;
  productId: number;
  boostScore: number;
}

export interface ExpireBoostJob {
  boostId: number;
  productId: number;
}

export interface UpdateBoostStatsJob {
  productId: number;
  boostScore: number;
  action: 'add' | 'remove';
}

export interface LogBoostCancellationJob {
  boostId: number;
  userId: string;
  reason: string;
}

@Processor('boost-queue')
@Injectable()
export class BoostQueueProcessor {
  constructor(
    private readonly boostsService: BoostsService,
    private readonly statsService: StatsService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  @Process('activate-boost')
  async handleActivateBoost(job: Job<ActivateBoostJob>) {
    this.logger.info(`Activating boost ${job.data.boostId} for product ${job.data.productId}`);

    try {
      await this.boostsService.activateBoost(job.data.boostId);

      this.logger.info(`Boost ${job.data.boostId} activated successfully`);
    } catch (error) {
      this.logger.error(`Failed to activate boost ${job.data.boostId}:`, error);
      throw error;
    }
  }

  @Process('expire-boost')
  async handleExpireBoost(job: Job<ExpireBoostJob>) {
    this.logger.info(`Expiring boost ${job.data.boostId} for product ${job.data.productId}`);

    try {
      await this.boostsService.expireBoost(job.data.boostId);

      this.logger.info(`Boost ${job.data.boostId} expired successfully`);
    } catch (error) {
      this.logger.error(`Failed to expire boost ${job.data.boostId}:`, error);
      throw error;
    }
  }

  @Process('update-boost-stats')
  async handleUpdateBoostStats(job: Job<UpdateBoostStatsJob>) {
    this.logger.info(`Updating boost stats for product ${job.data.productId}`);

    try {
      const boostScore = job.data.action === 'add' 
        ? job.data.boostScore 
        : -job.data.boostScore;

      await this.statsService.incrementStats({
        productId: job.data.productId,
        boostScore,
      });

      this.logger.info(`Boost stats updated for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to update boost stats:`, error);
      throw error;
    }
  }

  @Process('log-boost-cancellation')
  async handleLogCancellation(job: Job<LogBoostCancellationJob>) {
    this.logger.info(`Logging boost cancellation`, {
      boostId: job.data.boostId,
      userId: job.data.userId,
      reason: job.data.reason,
    });

    try {
      // Here you can add logic to:
      // 1. Log to analytics service
      // 2. Send notification to admin
      // 3. Update user's boost history
      // 4. Process refunds if applicable

      this.logger.info(`Boost cancellation logged for boost ${job.data.boostId}`);
    } catch (error) {
      this.logger.error(`Failed to log cancellation:`, error);
      // Don't throw - logging failures shouldn't block the process
    }
  }

  @OnQueueError()
  handleError(error: Error) {
    this.logger.error('Boost queue error:', error);
  }

  @OnQueueFailed()
  handleFailed(job: Job, error: Error) {
    this.logger.error(`Boost job ${job.id} failed:`, {
      jobName: job.name,
      data: job.data,
      error: error.message,
      stack: error.stack,
    });
  }
}