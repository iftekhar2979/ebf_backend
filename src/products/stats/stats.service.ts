import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductStat } from './entities/product_stats.entity';
import { Repository } from 'typeorm';
import { RedisService } from 'src/redis/redis.service';
import { InjectLogger } from 'src/shared/decorators/logger.decorator';
import { Logger } from 'winston';
import { ProductCreatedJob } from 'src/bull/processors/productQueue';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface IncrementStatsDto {
  productId: number;
  views?: number;
  clicks?: number;
  organicClicks?: number;
  carts?: number;
  orders?: number;
  boostScore?: number;
}

export interface ProductStatsResponse {
  productId: number;
  totalViews: number;
  clicks: number;
  organicClick: number;
  totalBoostScore: number;
  totalCarts: number;
  totalOrders: number;
  conversionRate: number;
  clickThroughRate: number;
}

@Injectable()
export class StatsService {
  private readonly STATS_CACHE_TTL = 300; // 5 minutes
  private readonly SYNC_BATCH_SIZE = 100;

  constructor(
    @InjectRepository(ProductStat)
    private readonly productStatistics: Repository<ProductStat>,
    private readonly redisService: RedisService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  /**
   * Initialize stats for a new product
   */
  async create(dto: ProductCreatedJob): Promise<void> {
    try {
      const product = this.productStatistics.create({
        productId: dto.productId,
        totalBoostScore: 0,
        totalCarts: 0,
        totalOrders: 0,
        totalViews: 0,
        clicks: 0,
        organicClick: 0,
      });

      await this.productStatistics.save(product);

      // Initialize Redis counters
      await this.initializeRedisCounters(dto.productId);

      this.logger.info(`Stats initialized for product ${dto.productId}`);
    } catch (err) {
      this.logger.error(`Failed to create stats for product ${dto.productId}:`, err);
      throw err;
    }
  }

  /**
   * Initialize Redis counters for a product
   */
  private async initializeRedisCounters(productId: number): Promise<void> {
    const keys = [
      `stats:product:${productId}:views`,
      `stats:product:${productId}:clicks`,
      `stats:product:${productId}:organic_clicks`,
      `stats:product:${productId}:carts`,
      `stats:product:${productId}:orders`,
      `stats:product:${productId}:boost_score`,
    ];

    await Promise.all(
      keys.map(key => this.redisService.setEx(key, '0', 86400)), // 24 hour TTL
    );
  }

  /**
   * Increment stats atomically in Redis (ultra-fast)
   * This is the primary method called by event handlers
   */
  async incrementStats(dto: IncrementStatsDto): Promise<void> {
    const promises: Promise<any>[] = [];

    if (dto.views) {
      promises.push(
        this.redisService.incrBy(`stats:product:${dto.productId}:views`, dto.views),
      );
    }

    if (dto.clicks) {
      promises.push(
        this.redisService.incrBy(`stats:product:${dto.productId}:clicks`, dto.clicks),
      );
    }

    if (dto.organicClicks) {
      promises.push(
        this.redisService.incrBy(`stats:product:${dto.productId}:organic_clicks`, dto.organicClicks),
      );
    }

    if (dto.carts) {
      promises.push(
        this.redisService.incrBy(`stats:product:${dto.productId}:carts`, dto.carts),
      );
    }

    if (dto.orders) {
      promises.push(
        this.redisService.incrBy(`stats:product:${dto.productId}:orders`, dto.orders),
      );
    }

    if (dto.boostScore) {
      promises.push(
        this.redisService.getClient().incrByFloat(
          `stats:product:${dto.productId}:boost_score`,
          dto.boostScore,
        ),
      );
    }

    await Promise.all(promises);

    // Invalidate cache
    await this.redisService.delCache(`stats:cached:${dto.productId}`);

    this.logger.debug(`Stats incremented for product ${dto.productId}`, dto);
  }

  /**
   * Get stats with caching (reads from Redis first, falls back to DB)
   */
  async getStats(productId: number): Promise<ProductStatsResponse> {
    const cacheKey = `stats:cached:${productId}`;

    // Try cache first
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for stats: ${cacheKey}`);
      return JSON.parse(cached);
    }

    // Get from Redis counters
    const [views, clicks, organicClicks, carts, orders, boostScore] = await Promise.all([
      this.redisService.get(`stats:product:${productId}:views`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:clicks`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:organic_clicks`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:carts`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:orders`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:boost_score`).then(v => parseFloat(v || '0')),
    ]);

    const stats: ProductStatsResponse = {
      productId,
      totalViews: views,
      clicks,
      organicClick: organicClicks,
      totalCarts: carts,
      totalOrders: orders,
      totalBoostScore: boostScore,
      conversionRate: views > 0 ? (orders / views) * 100 : 0,
      clickThroughRate: views > 0 ? (clicks / views) * 100 : 0,
    };

    // Cache the result
    await this.redisService.setCacheWithTTL(
      cacheKey,
      JSON.stringify(stats),
      this.STATS_CACHE_TTL,
    );

    return stats;
  }

  /**
   * Get stats from database (for accurate historical data)
   */
  async getStatsFromDB(productId: number): Promise<ProductStat | null> {
    return this.productStatistics.findOne({
      where: { productId },
    });
  }

  /**
   * Sync Redis counters to PostgreSQL
   * This is called periodically by cron job
   */
  async syncRedisToDatabase(productIds?: number[]): Promise<number> {
    try {
      let idsToSync: number[];

      if (productIds && productIds.length > 0) {
        idsToSync = productIds;
      } else {
        // Get all product IDs with Redis counters
        idsToSync = await this.getProductIdsWithStats();
      }

      if (idsToSync.length === 0) {
        this.logger.info('No products to sync');
        return 0;
      }

      this.logger.info(`Syncing stats for ${idsToSync.length} products`);

      let synced = 0;

      // Process in batches
      for (let i = 0; i < idsToSync.length; i += this.SYNC_BATCH_SIZE) {
        const batch = idsToSync.slice(i, i + this.SYNC_BATCH_SIZE);
        
        await Promise.all(
          batch.map(async productId => {
            try {
              await this.syncSingleProduct(productId);
              synced++;
            } catch (error) {
              this.logger.error(`Failed to sync product ${productId}:`, error);
            }
          }),
        );

        this.logger.info(`Synced batch ${i / this.SYNC_BATCH_SIZE + 1}: ${synced} products`);
      }

      this.logger.info(`Sync complete: ${synced} products updated`);
      return synced;
    } catch (error) {
      this.logger.error('Failed to sync stats to database:', error);
      throw error;
    }
  }

  /**
   * Sync a single product's stats from Redis to PostgreSQL
   */
  private async syncSingleProduct(productId: number): Promise<void> {
    // Get values from Redis
    const [views, clicks, organicClicks, carts, orders, boostScore] = await Promise.all([
      this.redisService.get(`stats:product:${productId}:views`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:clicks`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:organic_clicks`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:carts`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:orders`).then(v => parseInt(v || '0')),
      this.redisService.get(`stats:product:${productId}:boost_score`).then(v => parseFloat(v || '0')),
    ]);

    // Update database
    await this.productStatistics.update(
      { productId },
      {
        totalViews: views,
        clicks,
        organicClick: organicClicks,
        totalCarts: carts,
        totalOrders: orders,
        totalBoostScore: boostScore,
      },
    );
  }

  /**
   * Get all product IDs that have stats in Redis
   */
  private async getProductIdsWithStats(): Promise<number[]> {
    const keys = await this.redisService.scanKeys('stats:product:*:views');
    const productIds = new Set<number>();

    keys.forEach(key => {
      const match = key.match(/stats:product:(\d+):/);
      if (match) {
        productIds.add(parseInt(match[1]));
      }
    });

    return Array.from(productIds);
  }

  /**
   * Cron job to sync stats every 15 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledSync() {
    this.logger.info('Starting scheduled stats sync');
    await this.syncRedisToDatabase();
  }

  /**
   * Get top products by views
   */
  async getTopByViews(limit = 20): Promise<ProductStatsResponse[]> {
    const cacheKey = `stats:top:views:${limit}`;

    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database for accurate historical data
    const stats = await this.productStatistics.find({
      order: { totalViews: 'DESC' },
      take: limit,
    });

    const response = stats.map(stat => ({
      productId: stat.productId,
      totalViews: stat.totalViews,
      clicks: stat.clicks,
      organicClick: stat.organicClick,
      totalCarts: stat.totalCarts,
      totalOrders: stat.totalOrders,
      totalBoostScore: stat.totalBoostScore,
      conversionRate: stat.totalViews > 0 ? (stat.totalOrders / stat.totalViews) * 100 : 0,
      clickThroughRate: stat.totalViews > 0 ? (stat.clicks / stat.totalViews) * 100 : 0,
    }));

    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(response), 300);

    return response;
  }

  /**
   * Get top products by conversion rate
   */
  async getTopByConversion(limit = 20): Promise<ProductStatsResponse[]> {
    const cacheKey = `stats:top:conversion:${limit}`;

    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.productStatistics
      .createQueryBuilder('stats')
      .where('stats.totalViews > :minViews', { minViews: 100 }) // Minimum threshold
      .orderBy('(stats.totalOrders::float / stats.totalViews)', 'DESC')
      .limit(limit)
      .getMany();

    const response = stats.map(stat => ({
      productId: stat.productId,
      totalViews: stat.totalViews,
      clicks: stat.clicks,
      organicClick: stat.organicClick,
      totalCarts: stat.totalCarts,
      totalOrders: stat.totalOrders,
      totalBoostScore: stat.totalBoostScore,
      conversionRate: (stat.totalOrders / stat.totalViews) * 100,
      clickThroughRate: stat.totalViews > 0 ? (stat.clicks / stat.totalViews) * 100 : 0,
    }));

    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(response), 300);

    return response;
  }

  /**
   * Batch increment stats (for bulk operations)
   */
  async batchIncrementStats(updates: IncrementStatsDto[]): Promise<void> {
    const pipeline = this.redisService.getClient().multi();

    updates.forEach(dto => {
      if (dto.views) {
        pipeline.incrBy(`stats:product:${dto.productId}:views`, dto.views);
      }
      if (dto.clicks) {
        pipeline.incrBy(`stats:product:${dto.productId}:clicks`, dto.clicks);
      }
      if (dto.organicClicks) {
        pipeline.incrBy(`stats:product:${dto.productId}:organic_clicks`, dto.organicClicks);
      }
      if (dto.carts) {
        pipeline.incrBy(`stats:product:${dto.productId}:carts`, dto.carts);
      }
      if (dto.orders) {
        pipeline.incrBy(`stats:product:${dto.productId}:orders`, dto.orders);
      }
    });

    await pipeline.exec();

    this.logger.info(`Batch incremented stats for ${updates.length} products`);
  }

  /**
   * Reset stats for a product (admin operation)
   */
  async resetStats(productId: number): Promise<void> {
    // Reset in database
    await this.productStatistics.update(
      { productId },
      {
        totalViews: 0,
        clicks: 0,
        organicClick: 0,
        totalCarts: 0,
        totalOrders: 0,
        totalBoostScore: 0,
      },
    );

    // Reset Redis counters
    await this.initializeRedisCounters(productId);

    // Invalidate cache
    await this.redisService.delCache(`stats:cached:${productId}`);

    this.logger.info(`Stats reset for product ${productId}`);
  }

  /**
   * Get aggregated stats across multiple products
   */
  async getAggregatedStats(productIds: number[]): Promise<{
    totalViews: number;
    totalClicks: number;
    totalCarts: number;
    totalOrders: number;
    averageConversion: number;
  }> {
    const stats = await Promise.all(
      productIds.map(id => this.getStats(id)),
    );

    const totals = stats.reduce(
      (acc, stat) => ({
        totalViews: acc.totalViews + stat.totalViews,
        totalClicks: acc.totalClicks + stat.clicks,
        totalCarts: acc.totalCarts + stat.totalCarts,
        totalOrders: acc.totalOrders + stat.totalOrders,
      }),
      { totalViews: 0, totalClicks: 0, totalCarts: 0, totalOrders: 0 },
    );

    return {
      ...totals,
      averageConversion: totals.totalViews > 0 
        ? (totals.totalOrders / totals.totalViews) * 100 
        : 0,
    };
  }
}