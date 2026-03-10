import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { RedisService } from "src/redis/redis.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Repository } from "typeorm";
import { Logger } from "winston";
import { ProductEvent, ProductEventType } from "./entities/events.entity";

export interface TrackEventDto {
  productId: number;
  userId: string;
  eventType: ProductEventType;
  quantity?: number;
  metadata?: Record<string, unknown>;
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

  async trackEvent(dto: TrackEventDto): Promise<{ tracked: boolean; buffered: boolean }> {
    try {
      await this.incrementEventCounters(dto.productId, dto.eventType, dto.userId);
      const buffered = await this.bufferEvent(dto);
      await this.queueEventJobs(dto);
      this.logger.debug(`Event tracked: ${dto.eventType} for product ${dto.productId}`);
      return { tracked: true, buffered };
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack);
      return { tracked: false, buffered: false };
    }
  }

  private async incrementEventCounters(
    productId: number,
    eventType: ProductEventType,
    userId: string
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    switch (eventType) {
      case ProductEventType.VIEW:
        promises.push(
          this.redisService.incr(`stats:product:${productId}:views`),
          this.redisService
            .getClient()
            .pfadd(`stats:product:${productId}:unique_viewers`, userId.toString())
        );
        break;

      case ProductEventType.ADD_TO_CART:
        promises.push(this.redisService.incr(`stats:product:${productId}:carts`));
        break;

      case ProductEventType.ORDER:
        promises.push(this.redisService.incr(`stats:product:${productId}:orders`));
        break;
    }

    const today = new Date().toISOString().split("T")[0];
    promises.push(this.redisService.incr(`stats:product:${productId}:${eventType}:${today}`));

    await Promise.all(promises);
  }

  private async bufferEvent(dto: TrackEventDto): Promise<boolean> {
    const bufferKey = `event:buffer:${dto.eventType}`;

    try {
      const event = {
        productId: dto.productId,
        userId: dto.userId,
        eventType: dto.eventType,
        quantity: dto.quantity || 1,
        timestamp: Date.now(),
        metadata: dto.metadata,
      };

      await this.redisService.getClient().rpush(bufferKey, JSON.stringify(event));

      const bufferSize = await this.redisService.getClient().llen(bufferKey);

      if (bufferSize >= this.BATCH_SIZE) {
        await this.eventQueue.add("flush-event-buffer", { eventType: dto.eventType });
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to buffer event: ${error.message}`);
      return false;
    }
  }

  private async queueEventJobs(dto: TrackEventDto): Promise<void> {
    const jobs: Promise<any>[] = [];

    switch (dto.eventType) {
      case ProductEventType.VIEW:
        jobs.push(
          this.productQueue.add(
            "increment-views",
            { productId: dto.productId },
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
          this.eventQueue.add("update-inventory", {
            productId: dto.productId,
            quantity: dto.quantity || 1,
          }),
          this.eventQueue.add("update-trending-score", {
            productId: dto.productId,
          })
        );
        break;
    }

    await Promise.all(jobs);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async flushAllBuffers() {
    const eventTypes = Object.values(ProductEventType);
    await Promise.all(
      eventTypes.map((type) => this.eventQueue.add("flush-event-buffer", { eventType: type }))
    );
  }

  async getEventStats(productId: number): Promise<EventStats> {
    const cacheKey = `stats:aggregated:${productId}`;
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const [views, carts, orders, uniqueViewers] = await Promise.all([
      this.redisService.get<string>(`stats:product:${productId}:views`).then((v) => parseInt(v || "0")),
      this.redisService.get<string>(`stats:product:${productId}:carts`).then((v) => parseInt(v || "0")),
      this.redisService.get<string>(`stats:product:${productId}:orders`).then((v) => parseInt(v || "0")),
      this.redisService.getClient().pfcount(`stats:product:${productId}:unique_viewers`),
    ]);

    const stats: EventStats = {
      totalViews: views,
      totalCarts: carts,
      totalOrders: orders,
      uniqueViewers,
    };

    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(stats), this.STATS_CACHE_TTL);
    return stats;
  }

  async getTrendingProducts(limit = 20): Promise<any[]> {
    const cacheKey = `trending:products:${limit}`;
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const viewKeys = await this.redisService.scanKeys(`stats:product:*:view:${today}`);
    const productIds = new Set<number>();

    viewKeys.forEach((key) => {
      const match = key.match(/stats:product:(\d+):/);
      if (match) productIds.add(parseInt(match[1]));
    });

    const products = await Promise.all(
      Array.from(productIds).map(async (productId) => {
        const [todayViews, todayCarts, todayOrders, yesterdayViews] = await Promise.all([
          this.redisService.get<string>(`stats:product:${productId}:view:${today}`).then((v) => parseInt(v || "0")),
          this.redisService
            .get<string>(`stats:product:${productId}:add_to_cart:${today}`)
            .then((v) => parseInt(v || "0")),
          this.redisService.get<string>(`stats:product:${productId}:order:${today}`).then((v) => parseInt(v || "0")),
          this.redisService
            .get<string>(`stats:product:${productId}:view:${yesterday}`)
            .then((v) => parseInt(v || "0")),
        ]);

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

    const trending = products.sort((a, b) => b.score - a.score).slice(0, limit);
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(trending), 120);
    return trending;
  }

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

  async getConversionFunnel(productId: number): Promise<any> {
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

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncStatsToDatabase() {
    await this.productQueue.add(
      "sync-redis-stats-to-db",
      {},
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );
  }

  async batchTrackEvents(events: TrackEventDto[]): Promise<{ tracked: number; failed: number }> {
    let tracked = 0;
    let failed = 0;
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
