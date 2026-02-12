import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductStat } from 'src/products/stats/entities/product_stats.entity';
import { ProductCacheService } from 'src/products/caches/caches.service';
import { InjectLogger } from 'src/shared/decorators/logger.decorator';
import { Logger } from 'winston';
import { StatsService } from 'src/products/stats/stats.service';
import { RedisService } from 'src/redis/redis.service';

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
}

export interface IncrementViewsJob {
  productId: number;
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

export interface CacheWarmingJob {
  productIds: number[];
}

export interface ImageProcessingJob {
  productId: number;
  imageUrls: string[];
}

@Processor('product-queue')
@Injectable()
export class ProductQueueProcessor {
  constructor(
    private productCacheService: ProductCacheService,
    private productStatsService: StatsService,
    private readonly redisService: RedisService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  @Process('product-created')
  async handleProductCreated(job: Job<ProductCreatedJob>) {
    this.logger.log(`Processing product-created job for product `,job.data.productId);

    try {
      // Initialize product stats
      await this.productStatsService.create(job.data);

      // Invalidate user and subcategory caches
      await this.productCacheService.invalidateUserProducts(job.data.userId);
      await this.productCacheService.invalidateSubCategoryProducts(job.data.subCategoryId);

      this.logger.log(`Product ${job.data.productId} stats initialized successfully`,job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to process product-created job: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('increment-views')
  async handleIncrementViews(job: Job<IncrementViewsJob>) {
    this.logger.debug(`Incrementing views for product ${job.data.productId}`);

    try {
      await this.productStatsService.incrementStats({
        productId: job.data.productId,
        views: 1,
      });

      this.logger.debug(`Views incremented for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to increment views: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('increment-carts')
  async handleIncrementCarts(job: Job<IncrementCartsJob>) {
    this.logger.debug(`Incrementing carts for product ${job.data.productId}`);

    try {
      await this.productStatsService.incrementStats({
        productId: job.data.productId,
        carts: job.data.quantity,
      });

      this.logger.debug(`Carts incremented for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to increment carts: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('increment-orders')
  async handleIncrementOrders(job: Job<IncrementOrdersJob>) {
    this.logger.info(`Incrementing orders for product ${job.data.productId}`);

    try {
      await this.productStatsService.incrementStats({
        productId: job.data.productId,
        orders: job.data.quantity,
      });

      this.logger.info(`Orders incremented for product ${job.data.productId}`);
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

      this.logger.info(`Successfully synced ${synced} product stats`);
      return { synced };
    } catch (error) {
      this.logger.error(`Failed to sync stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-product-stats')
  async handleStatsUpdate(job: Job<ProductStatsUpdateJob>) {
    this.logger.log(`Updating stats for product ${job.data.productId}`,job.data.productId);

    try {
      const updates: any = {};

      if (job.data.incrementViews) {
        updates.views = 1;
      }
      if (job.data.incrementWishlists) {
        // Handle wishlist increment
        await this.redisService.incr(`stats:product:${job.data.productId}:wishlists`);
      }
      if (job.data.incrementCarts) {
        updates.carts = 1;
      }

      if (Object.keys(updates).length > 0) {
        await this.productStatsService.incrementStats({
          productId: job.data.productId,
          ...updates,
        });
      }

      this.logger.log(`Stats updated for product `,job.data.productId);
    } catch (error) {
      this.logger.error(`Failed to update product stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('cache-warming')
  async handleCacheWarming(job: Job<CacheWarmingJob>) {
    this.logger.log(`Warming cache for ${job.data.productIds.length} products`,job.data.productIds.length);

    try {
      // Warm product stats cache
      await Promise.all(
        job.data.productIds.map(productId =>
          this.productStatsService.getStats(productId),
        ),
      );

      this.logger.log(`Cache warming completed for ${job.data.productIds.length} products`,"");
    } catch (error) {
      this.logger.error(`Failed to warm cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('process-images')
  async handleImageProcessing(job: Job<ImageProcessingJob>) {
    this.logger.log(`Processing images for product ${job.data.productId}`,"");

    try {
      // Here you can add image optimization, thumbnail generation, etc.
      // For example:
      // - Resize images
      // - Generate thumbnails
      // - Compress images
      // - Upload to CDN
      // - Update product with optimized URLs

      this.logger.log(`Images processed for product ${job.data.productId}`,"");
    } catch (error) {
      this.logger.error(`Failed to process images: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('invalidate-cache')
  async handleCacheInvalidation(
    job: Job<{ productId: number; userId: string; subCategoryId: number }>,
  ) {
    this.logger.log(`Invalidating cache for product ${job.data.productId}`,"");

    try {
      // Invalidate product-specific caches
      await Promise.all([
        this.productCacheService.invalidateUserProducts(job.data.userId),
        this.productCacheService.invalidateSubCategoryProducts(job.data.subCategoryId),
        this.redisService.delCache(`stats:cached:${job.data.productId}`),
      ]);

      this.logger.log(`Cache invalidated for product ${job.data.productId}`,"");
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${error.message}`, error.stack);
      throw error;
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

    // You can add logic here to:
    // 1. Send alerts for critical failures
    // 2. Move to dead letter queue
    // 3. Retry with exponential backoff
  }
}