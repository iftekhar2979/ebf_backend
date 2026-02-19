import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { ProductCacheService } from 'src/products/caches/caches.service';
import { InjectLogger } from 'src/shared/decorators/logger.decorator';
import { Logger } from 'winston';
import { StatsService } from 'src/products/stats/stats.service';
import { RedisService } from 'src/redis/redis.service';
import { ProductRankingService } from 'src/products/product_rankings/product_rankings.service';

export interface ProductCreatedJob {
  productId: number;
  userId: string;
  subCategoryId: number;
}

export interface ProductStatsUpdateJob {
  productId: number;
  incrementViews?: boolean;
  incrementWishlists?: boolean;
  incrementCarts?: boolean;
  incrementOrders?: boolean;
}

export interface IncrementViewsJob {
  productId: number;
}

export interface IncrementWishlistsJob {
  productId: number;
  userId: number;
}

export interface IncrementCartsJob {
  productId: number;
  userId: number;
  quantity: number;
}

export interface IncrementOrdersJob {
  productId: number;
  userId: number;
  quantity: number;
}

export interface SyncRedisStatsJob {
  productIds?: number[];
}

export interface RankingUpdateJob {
  productId: number;
}

export interface BulkRankingUpdateJob {
  productIds: number[];
}

export interface CacheWarmingJob {
  productIds: number[];
}

export interface ImageProcessingJob {
  productId: number;
  imageUrls: string[];
}

export interface ProductDeletedJob {
  productId: number;
  userId: string;
  subCategoryId: number;
}

@Processor('product-queue')
@Injectable()
export class ProductQueueProcessor {
  constructor(
    private productCacheService: ProductCacheService,
    private productStatsService: StatsService,
    private rankingService: ProductRankingService,
    private readonly redisService: RedisService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  @Process('product-created')
  async handleProductCreated(job: Job<ProductCreatedJob>) {
    this.logger.log('Processing product-created job for product', job.data.productId);

    try {
      // Initialize product stats
      await this.productStatsService.create(job.data);

      // Initialize product ranking
      await this.rankingService.updateProductRanking(job.data.productId);

      // Invalidate user and subcategory caches
      await Promise.all([
        this.productCacheService.invalidateUserProducts(job.data.userId),
        this.productCacheService.invalidateSubCategoryProducts(job.data.subCategoryId),
        this.invalidateFeedCaches(),
      ]);

      this.logger.log('Product stats and ranking initialized successfully', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to process product-created job: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('increment-views')
  async handleIncrementViews(job: Job<IncrementViewsJob>) {
    this.logger.debug('Incrementing views for product', job.data.productId);

    try {
      // Increment stats in Redis/DB
      await this.productStatsService.incrementStats({
        productId: job.data.productId,
        views: 1,
      });

      // Update ranking (async, non-blocking)
      this.rankingService.updateProductRanking(job.data.productId).catch(err => {
        this.logger.error(`Failed to update ranking after view increment: ${err.message}`);
      });

      this.logger.debug('Views incremented for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to increment views: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('increment-wishlists')
  async handleIncrementWishlists(job: Job<IncrementWishlistsJob>) {
    this.logger.debug('Incrementing wishlists for product', job.data.productId);

    try {
      // Increment wishlist count in Redis
      await this.redisService.incr(`stats:product:${job.data.productId}:wishlists`);

      // Update ranking (wishlists have higher weight)
      await this.rankingService.updateProductRanking(job.data.productId);

      this.logger.debug('Wishlists incremented for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to increment wishlists: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('increment-carts')
  async handleIncrementCarts(job: Job<IncrementCartsJob>) {
    this.logger.debug('Incrementing carts for product', job.data.productId);

    try {
      // Increment cart stats
      await this.productStatsService.incrementStats({
        productId: job.data.productId,
        carts: job.data.quantity,
      });

      // Update ranking (carts have high weight)
      await this.rankingService.updateProductRanking(job.data.productId);

      this.logger.debug('Carts incremented for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to increment carts: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('increment-orders')
  async handleIncrementOrders(job: Job<IncrementOrdersJob>) {
    this.logger.info('Incrementing orders for product', job.data.productId);

    try {
      // Increment order stats
      await this.productStatsService.incrementStats({
        productId: job.data.productId,
        orders: job.data.quantity,
      });

      // Update ranking (orders have highest weight)
      await this.rankingService.updateProductRanking(job.data.productId);

      // Invalidate feed caches (orders significantly affect trending)
      await this.invalidateFeedCaches();

      this.logger.info('Orders incremented for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to increment orders: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('sync-redis-stats-to-db')
  async handleSyncStats(job: Job<SyncRedisStatsJob>) {
    this.logger.info('Syncing Redis stats to database');

    try {
      const synced = await this.productStatsService.syncRedisToDatabase(
        job.data.productIds,
      );

      // After syncing, update rankings for affected products
      if (job.data.productIds && job.data.productIds.length > 0) {
        await this.rankingService.batchUpdateRankings(job.data.productIds);
      }

      this.logger.info(`Successfully synced ${synced} product stats and updated rankings`);
      return { synced };
    } catch (error) {
      this.logger.error(`Failed to sync stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-product-stats')
  async handleStatsUpdate(job: Job<ProductStatsUpdateJob>) {
    this.logger.log('Updating stats for product', job.data.productId);

    try {
      const updates: any = {};
      let shouldUpdateRanking = false;

      if (job.data.incrementViews) {
        updates.views = 1;
        shouldUpdateRanking = true;
      }
      if (job.data.incrementWishlists) {
        await this.redisService.incr(`stats:product:${job.data.productId}:wishlists`);
        shouldUpdateRanking = true;
      }
      if (job.data.incrementCarts) {
        updates.carts = 1;
        shouldUpdateRanking = true;
      }
      if (job.data.incrementOrders) {
        updates.orders = 1;
        shouldUpdateRanking = true;
      }

      if (Object.keys(updates).length > 0) {
        await this.productStatsService.incrementStats({
          productId: job.data.productId,
          ...updates,
        });
      }

      // Update ranking if any stats changed
      if (shouldUpdateRanking) {
        await this.rankingService.updateProductRanking(job.data.productId);
      }

      this.logger.log('Stats updated for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to update product stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-ranking')
  async handleRankingUpdate(job: Job<RankingUpdateJob>) {
    this.logger.debug('Updating ranking for product', job.data.productId);

    try {
      await this.rankingService.updateProductRanking(job.data.productId);
      this.logger.debug('Ranking updated for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to update ranking: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('bulk-ranking-update')
  async handleBulkRankingUpdate(job: Job<BulkRankingUpdateJob>) {
    this.logger.info('Bulk updating rankings', job.data.productIds.length);

    try {
      await this.rankingService.batchUpdateRankings(job.data.productIds);
      this.logger.info(`Bulk ranking update completed for ${job.data.productIds.length} products`);
    } catch (error) {
      this.logger.error(`Failed to bulk update rankings: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('cache-warming')
  async handleCacheWarming(job: Job<CacheWarmingJob>) {
    this.logger.log('Warming cache', job.data.productIds.length);

    try {
      // Warm product stats cache
      await Promise.all(
        job.data.productIds.map(productId =>
          this.productStatsService.getStats(productId),
        ),
      );

      // Pre-warm ranking positions for popular products
      await Promise.all(
        job.data.productIds.slice(0, 100).map(productId =>
          this.rankingService.getProductTrendingRank(productId).catch(() => null),
        ),
      );

      this.logger.log(`Cache warming completed for ${job.data.productIds.length} products`);
    } catch (error) {
      this.logger.error(`Failed to warm cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('process-images')
  async handleImageProcessing(job: Job<ImageProcessingJob>) {
    this.logger.log('Processing images for product', job.data.productId);

    try {
      // Image optimization logic:
      // - Resize images to multiple sizes (thumbnail, medium, large)
      // - Compress images
      // - Generate WebP versions
      // - Upload to CDN
      // - Update product with optimized URLs

      // Example implementation:
      // const optimizedImages = await this.imageService.optimize(job.data.imageUrls);
      // await this.imageService.uploadToCDN(optimizedImages);
      // await this.productService.updateImageUrls(job.data.productId, optimizedImages);

      this.logger.log('Images processed for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to process images: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('invalidate-cache')
  async handleCacheInvalidation(
    job: Job<{ productId: number; userId: string; subCategoryId: number }>,
  ) {
    this.logger.log('Invalidating cache for product', job.data.productId);

    try {
      // Invalidate product-specific caches
      await Promise.all([
        this.productCacheService.invalidateUserProducts(job.data.userId),
        this.productCacheService.invalidateSubCategoryProducts(job.data.subCategoryId),
        this.redisService.delCache(`stats:cached:${job.data.productId}`),
        this.invalidateFeedCaches(),
      ]);

      this.logger.log('Cache invalidated for product', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('product-deleted')
  async handleProductDeleted(job: Job<ProductDeletedJob>) {
    this.logger.log('Processing product deletion', job.data.productId);

    try {
      // Remove from all rankings
      await this.rankingService.removeProductFromRankings(job.data.productId);

      // Invalidate caches
      await Promise.all([
        this.productCacheService.invalidateUserProducts(job.data.userId),
        this.productCacheService.invalidateSubCategoryProducts(job.data.subCategoryId),
        this.redisService.delCache(`stats:cached:${job.data.productId}`),
        this.redisService.delCache(`product:${job.data.productId}`),
        this.invalidateFeedCaches(),
      ]);

      this.logger.log('Product removed from rankings and caches', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to process product deletion: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('product-updated')
  async handleProductUpdated(
    job: Job<{ productId: number; userId: string; subCategoryId: number; hasDiscountChanged: boolean }>,
  ) {
    this.logger.log('Processing product update', job.data.productId);

    try {
      // Update ranking (especially important if discount changed)
      await this.rankingService.updateProductRanking(job.data.productId);

      // Invalidate caches
      await Promise.all([
        this.productCacheService.invalidateUserProducts(job.data.userId),
        this.productCacheService.invalidateSubCategoryProducts(job.data.subCategoryId),
        this.redisService.delCache(`product:${job.data.productId}`),
      ]);

      // If discount changed, invalidate discount feed
      if (job.data.hasDiscountChanged) {
        await this.invalidateFeedCaches();
      }

      this.logger.log('Product updated, ranking refreshed', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to process product update: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('boost-activated')
  async handleBoostActivated(job: Job<{ productId: number }>) {
    this.logger.info('Processing boost activation', job.data.productId);

    try {
      // Boost significantly affects ranking
      await this.rankingService.updateProductRanking(job.data.productId);

      // Invalidate trending feeds since boost affects trending score
      await this.invalidateFeedCaches();

      this.logger.info('Boost activated, ranking updated', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to process boost activation: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('boost-deactivated')
  async handleBoostDeactivated(job: Job<{ productId: number }>) {
    this.logger.info('Processing boost deactivation', job.data.productId);

    try {
      // Update ranking to remove boost multiplier
      await this.rankingService.updateProductRanking(job.data.productId);

      // Invalidate trending feeds
      await this.invalidateFeedCaches();

      this.logger.info('Boost deactivated, ranking updated', job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to process boost deactivation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Helper method to invalidate all feed caches
   */
  private async invalidateFeedCaches(): Promise<void> {
    try {
      // Use Redis SCAN to find and delete all feed cache keys
      const patterns = [
        'feed:home:*',
        'feed:trending:*',
        'feed:discounted:*',
        'feed:category:*',
        'feed:new-arrivals:*',
        'feed:flash-sale:*',
      ];

      await Promise.all(
        patterns.map(pattern => this.redisService.delPattern(pattern)),
      );
    } catch (error) {
      this.logger.error(`Failed to invalidate feed caches: ${error.message}`);
      // Don't throw, as this is not critical
    }
  }

  @OnQueueError()
  handleError(error: Error) {
    this.logger.error('Product queue error:', error);
  }

  @OnQueueFailed()
  handleFailed(job: Job, error: Error) {
    this.logger.error(`Product job ${job.id} failed:`, {
      jobName: job.name,
      data: job.data,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    });

    // Critical job types that should trigger alerts
    const criticalJobs = [
      'increment-orders',
      'sync-redis-stats-to-db',
      'product-created',
    ];

    if (criticalJobs.includes(job.name)) {
      // Send alert for critical failures
      this.logger.error('CRITICAL JOB FAILED - ALERT REQUIRED', {
        jobName: job.name,
        productId: job.data.productId,
      });

      // TODO: Integrate with alerting service (e.g., Slack, PagerDuty, email)
      // await this.alertService.sendAlert({
      //   severity: 'critical',
      //   message: `Critical job ${job.name} failed for product ${job.data.productId}`,
      //   error: error.message,
      // });
    }

    // If max attempts reached, move to dead letter queue or log for manual review
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.logger.error('Job exhausted all retries, manual intervention required', {
        jobId: job.id,
        jobName: job.name,
        data: job.data,
      });

      // TODO: Store in separate collection/table for manual review
      // await this.failedJobRepository.save({
      //   jobId: job.id,
      //   jobName: job.name,
      //   data: job.data,
      //   error: error.message,
      //   timestamp: new Date(),
      // });
    }
  }
}