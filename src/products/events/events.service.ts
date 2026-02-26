import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { RedisService } from "src/redis/redis.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Repository } from "typeorm";
import { Logger } from "winston";
import { ProductEvent, ProductEventType } from "./entities/events.entity";

export interface TrackEventDto {
  productId: number;
  userId: number;
  eventType: ProductEventType;
  quantity?: number;
  metadata?: Record<string, any>;
}

export interface EventStats {
  totalViews: number;
  totalCarts: number;
  totalOrders: number;
  uniqueViewers: number;
}

@Injectable()
export class EventsService {
  private readonly EVENT_BUFFER_TTL = 300; // 5 minutes
  private readonly BATCH_SIZE = 100;
  private readonly STATS_CACHE_TTL = 60; // 1 minute for stats

  constructor(
    @InjectRepository(ProductEvent)
    private readonly eventRepository: Repository<ProductEvent>,
    private readonly redisService: RedisService,
    @InjectQueue("product-queue") private productQueue: Queue,
    @InjectQueue("event-queue") private eventQueue: Queue,
    @InjectLogger() private readonly logger: Logger
  ) {}

  /**
   * Track a product event with high-performance buffering
   * Uses Redis for fast writes, then batch processes to PostgreSQL
   */
  async trackEvent(dto: TrackEventDto): Promise<{ tracked: boolean; buffered: boolean }> {
    try {
      // 1. Immediate Redis increment for real-time stats
      await this.incrementEventCounters(dto.productId, dto.eventType, dto.userId);

      // 2. Buffer event for batch processing
      const buffered = await this.bufferEvent(dto);

      // 3. Queue async jobs based on event type
      await this.queueEventJobs(dto);

      this.logger.debug(`Event tracked: ${dto.eventType} for product ${dto.productId}`);

      return { tracked: true, buffered };
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack);
      // Don't throw - tracking failures shouldn't break user flow
      return { tracked: false, buffered: false };
    }
  }

  /**
   * Increment Redis counters for real-time stats (super fast)
   */
  private async incrementEventCounters(
    productId: number,
    eventType: ProductEventType,
    userId: number
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    // Product-level counters
    switch (eventType) {
      case ProductEventType.VIEW:
        promises.push(
          this.redisService.incr(`stats:product:${productId}:views`),
          // Track unique viewers using HyperLogLog (memory efficient)
          this.redisService
            .getClient()
            .pfAdd(`stats:product:${productId}:unique_viewers`, [userId.toString()])
        );
        break;

      case ProductEventType.ADD_TO_CART:
        promises.push(this.redisService.incr(`stats:product:${productId}:carts`));
        break;

      case ProductEventType.ORDER:
        promises.push(this.redisService.incr(`stats:product:${productId}:orders`));
        break;
    }

    // Daily counters for trending analysis
    const today = new Date().toISOString().split("T")[0];
    promises.push(this.redisService.incr(`stats:product:${productId}:${eventType}:${today}`));

    await Promise.all(promises);
  }

  /**
   * Buffer event for batch processing to PostgreSQL
   */
  private async bufferEvent(dto: TrackEventDto): Promise<boolean> {
    const bufferKey = `event:buffer:${dto.eventType}`;

    try {
      // Add to Redis List for batch processing
      const event = {
        productId: dto.productId,
        userId: dto.userId,
        eventType: dto.eventType,
        quantity: dto.quantity || 1,
        timestamp: Date.now(),
        metadata: dto.metadata,
      };

      await this.redisService.getClient().rPush(bufferKey, JSON.stringify(event));

      // Check if buffer is ready for flush
      const bufferSize = await this.redisService.getClient().lLen(bufferKey);

      if (bufferSize >= this.BATCH_SIZE) {
        // Trigger immediate flush
        await this.eventQueue.add("flush-event-buffer", { eventType: dto.eventType });
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to buffer event: ${error.message}`);
      return false;
    }
  }

  /**
   * Queue async jobs based on event type
   */
  private async queueEventJobs(dto: TrackEventDto): Promise<void> {
    const jobs: Promise<any>[] = [];

    switch (dto.eventType) {
      case ProductEventType.VIEW:
        jobs.push(
          this.productQueue.add(
            "increment-views",
            {
              productId: dto.productId,
            },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
            }
          )
        );
        break;

      case ProductEventType.ADD_TO_CART:
        jobs.push(
          this.productQueue.add("increment-carts", {
            productId: dto.productId,
            userId: dto.userId,
            quantity: dto.quantity || 1,
          }),
          // Update user's cart cache
          this.eventQueue.add("update-user-cart", {
            userId: dto.userId,
            productId: dto.productId,
          })
        );
        break;

      case ProductEventType.ORDER:
        jobs.push(
          this.productQueue.add("increment-orders", {
            productId: dto.productId,
            userId: dto.userId,
            quantity: dto.quantity || 1,
          }),
          // Trigger inventory update
          this.eventQueue.add("update-inventory", {
            productId: dto.productId,
            quantity: dto.quantity || 1,
          }),
          // Calculate trending score
          this.eventQueue.add("update-trending-score", {
            productId: dto.productId,
          })
        );
        break;
    }

    await Promise.all(jobs);
  }

  /**
   * Flush event buffer to PostgreSQL (called by cron or when buffer is full)
   */
  //   async flushEventBuffer(eventType: ProductEventType): Promise<number> {
  //     const bufferKey = `event:buffer:${eventType}`;
  //     const lockKey = `lock:flush:${eventType}`;
  //     const lockToken = `${Date.now()}-${Math.random()}`;

  //     try {
  //       // Acquire lock to prevent concurrent flushes
  //       const locked = await this.redisService.acquireLock(lockKey, lockToken, 30);
  //       if (!locked) {
  //         this.logger.warn(`Already flushing ${eventType} events`);
  //         return 0;
  //       }

  //       // Get all buffered events atomically
  //       const client = this.redisService.getClient();
  //       const pipeline = client.multi();
  //       pipeline.lRange(bufferKey, 0, -1);
  //       pipeline.del(bufferKey);
  //     //   const [[_, events]] = await pipeline.exec();
  //     const [[,events]]= await pipeline.exec()

  //       if (!events || events.length === 0) {
  //         return 0;
  //       }

  //       // Parse events
  //       const parsedEvents = events.map(e => JSON.parse(e as string));

  //       // Batch insert to PostgreSQL
  //       const entities = parsedEvents.map(e =>
  //         this.eventRepository.create({
  //           productId: e.productId,
  //           userId: e.userId,
  //           eventType: e.eventType,
  //           quantity: e.quantity,
  //         }),
  //       );

  //       await this.eventRepository.save(entities, { chunk: 500 });

  //       this.logger.info(`Flushed ${entities.length} ${eventType} events to database`);

  //       return entities.length;
  //     } catch (error) {
  //       this.logger.error(`Failed to flush event buffer: ${error.message}`, error.stack);
  //       throw error;
  //     } finally {
  //       await this.redisService.releaseLock(lockKey, lockToken);
  //     }
  //   }

  /**
   * Cron job to flush all event buffers every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async flushAllBuffers() {
    const eventTypes = Object.values(ProductEventType);

    await Promise.all(
      eventTypes.map((type) => this.eventQueue.add("flush-event-buffer", { eventType: type }))
    );
  }

  /**
   * Get real-time event stats from Redis (ultra-fast)
   */
  async getEventStats(productId: number): Promise<EventStats> {
    const cacheKey = `stats:aggregated:${productId}`;

    // Try aggregated cache first
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from Redis counters
    const [views, carts, orders, uniqueViewers] = await Promise.all([
      this.redisService.get(`stats:product:${productId}:views`).then((v) => parseInt(v || "0")),
      this.redisService.get(`stats:product:${productId}:carts`).then((v) => parseInt(v || "0")),
      this.redisService.get(`stats:product:${productId}:orders`).then((v) => parseInt(v || "0")),
      this.redisService.getClient().pfCount(`stats:product:${productId}:unique_viewers`),
    ]);

    const stats: EventStats = {
      totalViews: views,
      totalCarts: carts,
      totalOrders: orders,
      uniqueViewers,
    };

    // Cache aggregated stats
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(stats), this.STATS_CACHE_TTL);

    return stats;
  }

  /**
   * Get trending products (based on recent events)
   */
  async getTrendingProducts(limit = 20): Promise<
    {
      productId: number;
      score: number;
      views: number;
      carts: number;
      orders: number;
    }[]
  > {
    const cacheKey = `trending:products:${limit}`;

    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Get all product IDs that have recent activity
    const viewKeys = await this.redisService.scanKeys(`stats:product:*:view:${today}`);
    const productIds = new Set<number>();

    viewKeys.forEach((key) => {
      const match = key.match(/stats:product:(\d+):/);
      if (match) productIds.add(parseInt(match[1]));
    });

    // Calculate trending scores
    const products = await Promise.all(
      Array.from(productIds).map(async (productId) => {
        const [todayViews, todayCarts, todayOrders, yesterdayViews] = await Promise.all([
          this.redisService.get(`stats:product:${productId}:view:${today}`).then((v) => parseInt(v || "0")),
          this.redisService
            .get(`stats:product:${productId}:add_to_cart:${today}`)
            .then((v) => parseInt(v || "0")),
          this.redisService.get(`stats:product:${productId}:order:${today}`).then((v) => parseInt(v || "0")),
          this.redisService
            .get(`stats:product:${productId}:view:${yesterday}`)
            .then((v) => parseInt(v || "0")),
        ]);

        // Trending score: weighted by recency and conversion
        const viewGrowth = yesterdayViews > 0 ? (todayViews - yesterdayViews) / yesterdayViews : todayViews;
        const conversionRate = todayViews > 0 ? (todayCarts + todayOrders * 2) / todayViews : 0;
        const score =
          todayViews * 0.3 + todayCarts * 0.5 + todayOrders * 2 + viewGrowth * 10 + conversionRate * 100;

        return {
          productId,
          score: Math.round(score * 100) / 100,
          views: todayViews,
          carts: todayCarts,
          orders: todayOrders,
        };
      })
    );

    // Sort by score and take top N
    const trending = products.sort((a, b) => b.score - a.score).slice(0, limit);

    // Cache for 2 minutes
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(trending), 120);

    return trending;
  }

  /**
   * Get event history from PostgreSQL (for analytics)
   */
  async getEventHistory(
    productId: number,
    eventType?: ProductEventType,
    limit = 100
  ): Promise<ProductEvent[]> {
    const query = this.eventRepository
      .createQueryBuilder("event")
      .where("event.productId = :productId", { productId })
      .orderBy("event.createdAt", "DESC")
      .limit(limit);

    if (eventType) {
      query.andWhere("event.eventType = :eventType", { eventType });
    }

    return query.getMany();
  }

  /**
   * Get conversion funnel metrics
   */
  async getConversionFunnel(productId: number): Promise<{
    views: number;
    carts: number;
    orders: number;
    viewToCartRate: number;
    cartToOrderRate: number;
    viewToOrderRate: number;
  }> {
    const stats = await this.getEventStats(productId);

    return {
      views: stats.totalViews,
      carts: stats.totalCarts,
      orders: stats.totalOrders,
      viewToCartRate: stats.totalViews > 0 ? (stats.totalCarts / stats.totalViews) * 100 : 0,
      cartToOrderRate: stats.totalCarts > 0 ? (stats.totalOrders / stats.totalCarts) * 100 : 0,
      viewToOrderRate: stats.totalViews > 0 ? (stats.totalOrders / stats.totalViews) * 100 : 0,
    };
  }

  /**
   * Sync Redis stats to PostgreSQL (run periodically)
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncStatsToDatabase() {
    // this.logger.info("Starting stats sync to database");

    // This will be handled by the stats service
    // We just need to trigger the job
    await this.productQueue.add(
      "sync-redis-stats-to-db",
      {},
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );
  }

  /**
   * Batch track events (for high-throughput scenarios)
   */
  async batchTrackEvents(events: TrackEventDto[]): Promise<{ tracked: number; failed: number }> {
    let tracked = 0;
    let failed = 0;

    // Process in parallel with concurrency limit
    const batchSize = 50;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      const results = await Promise.allSettled(batch.map((event) => this.trackEvent(event)));

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.tracked) {
          tracked++;
        } else {
          failed++;
        }
      });
    }

    this.logger.info(`Batch tracking complete: ${tracked} tracked, ${failed} failed`);

    return { tracked, failed };
  }
}
