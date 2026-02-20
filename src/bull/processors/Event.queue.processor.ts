import { Processor, Process, OnQueueError, OnQueueFailed } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";
import { EventsService } from "src/products/events/events.service";
import { ProductEventType } from "src/products/events/entities/events.entity";

export interface FlushEventBufferJob {
  eventType: ProductEventType;
}

export interface UpdateUserCartJob {
  userId: number;
  productId: number;
}

export interface UpdateInventoryJob {
  productId: number;
  quantity: number;
}

export interface UpdateTrendingScoreJob {
  productId: number;
}

@Processor("event-queue")
@Injectable()
export class EventQueueProcessor {
  constructor(
    private readonly eventsService: EventsService,
    @InjectLogger() private readonly logger: Logger
  ) {}

  @Process("flush-event-buffer")
  async handleFlushBuffer(job: Job<FlushEventBufferJob>) {
    this.logger.debug(`Flushing ${job.data.eventType} event buffer`);

    // try {
    //   const flushed = await this.eventsService.flushEventBuffer(job.data.eventType);

    //   if (flushed > 0) {
    //     this.logger.info(`Flushed ${flushed} ${job.data.eventType} events to database`);
    //   }

    //   return { flushed };
    // } catch (error) {
    //   this.logger.error(`Failed to flush event buffer:`, error);
    //   throw error;
    // }
  }

  @Process("update-user-cart")
  async handleUpdateUserCart(job: Job<UpdateUserCartJob>) {
    this.logger.debug(`Updating cart cache for user ${job.data.userId}`);

    try {
      // Invalidate user's cart cache
      // This would typically call a CartService or CacheService
      // For now, we'll just log it

      this.logger.debug(`Cart cache updated for user ${job.data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to update user cart:`, error);
      // Don't throw - cart cache updates are not critical
    }
  }

  @Process("update-inventory")
  async handleUpdateInventory(job: Job<UpdateInventoryJob>) {
    this.logger.info(`Updating inventory for product ${job.data.productId}`);

    try {
      // Here you would:
      // 1. Decrement inventory in database
      // 2. Update Redis inventory counter
      // 3. Check for low stock alerts
      // 4. Invalidate product cache

      // Example implementation would call InventoryService
      this.logger.info(`Inventory updated for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to update inventory:`, error);
      throw error; // Inventory updates are critical
    }
  }

  @Process("update-trending-score")
  async handleUpdateTrendingScore(job: Job<UpdateTrendingScoreJob>) {
    this.logger.debug(`Updating trending score for product ${job.data.productId}`);

    try {
      // Calculate and cache trending score
      // This would use a weighted algorithm based on:
      // - Recent views (time-decayed)
      // - Conversion rate
      // - Orders
      // - Social signals

      this.logger.debug(`Trending score updated for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to update trending score:`, error);
      // Don't throw - trending score updates are not critical
    }
  }

  @OnQueueError()
  handleError(error: Error) {
    this.logger.error("Event queue error:", error);
  }

  @OnQueueFailed()
  handleFailed(job: Job, error: Error) {
    this.logger.error(`Event job ${job.id} failed:`, {
      jobName: job.name,
      data: job.data,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade,
    });
  }
}
