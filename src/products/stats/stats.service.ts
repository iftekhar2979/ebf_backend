import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { ProductCreatedJob } from "src/bull/processors/product/types/types";
import { RedisService } from "src/redis/redis.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Repository } from "typeorm";
import { Logger } from "winston";
import { ProductStat } from "./entities/product_stats.entity";

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATS_QUEUE = "stats_queue";
export const STATS_FLUSH_JOB = "stats_flush";

/** Redis key helpers */
const K = {
  views: (id: number) => `stats:product:${id}:views`,
  clicks: (id: number) => `stats:product:${id}:clicks`,
  organicClicks: (id: number) => `stats:product:${id}:organic_clicks`,
  carts: (id: number) => `stats:product:${id}:carts`,
  orders: (id: number) => `stats:product:${id}:orders`,
  likes: (id: number) => `stats:product:${id}:likes`,
  boostScore: (id: number) => `stats:product:${id}:boost_score`,
  cached: (id: number) => `stats:cached:${id}`,
  topViews: (limit: number) => `stats:top:views:${limit}`,
  topConversion: (limit: number) => `stats:top:conversion:${limit}`,
  /** Sorted set of productIds with pending DB sync */
  dirtySet: () => `stats:dirty:products`,
};

const COUNTER_TTL = 86_400; // 24h
const CACHE_TTL = 300; // 5 min
const DIRTY_FLUSH_THRESHOLD = 200;
const SYNC_BATCH_SIZE = 100;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface IncrementStatsDto {
  productId: number;
  views?: number;
  clicks?: number;
  organicClicks?: number;
  carts?: number;
  orders?: number;
  likes?: number;
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
  totalLikes: number;
  conversionRate: number;
  clickThroughRate: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class StatsService implements OnModuleInit, OnModuleDestroy {
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(ProductStat)
    private readonly productStatistics: Repository<ProductStat>,
    @InjectQueue(STATS_QUEUE)
    private readonly statsQueue: Queue,
    private readonly redisService: RedisService,
    @InjectLogger() private readonly logger: Logger
  ) {}

  onModuleInit() {}

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  async create(dto: ProductCreatedJob): Promise<void> {
    try {
      const product = this.productStatistics.create({
        productId: dto.productId,
        totalViews: 0,
        clicks: 0,
        organicClick: 0,
        totalBoostScore: 0,
        totalCarts: 0,
        totalOrders: 0,
        like: 0,
      });

      await this.productStatistics.save(product);
      await this.initializeRedisCounters(dto.productId);

      this.logger.log(`Stats initialized for product ${dto.productId}`, StatsService.name);
    } catch (err) {
      this.logger.error(`Failed to create stats for product ${dto.productId}:`, err);
      throw err;
    }
  }

  private async initializeRedisCounters(productId: number): Promise<void> {
    const pipeline = this.redisService.getClient().multi();
    pipeline.setex(K.views(productId), COUNTER_TTL, "0");
    pipeline.setex(K.clicks(productId), COUNTER_TTL, "0");
    pipeline.setex(K.organicClicks(productId), COUNTER_TTL, "0");
    pipeline.setex(K.carts(productId), COUNTER_TTL, "0");
    pipeline.setex(K.orders(productId), COUNTER_TTL, "0");
    pipeline.setex(K.likes(productId), COUNTER_TTL, "0");
    pipeline.setex(K.boostScore(productId), COUNTER_TTL, "0");
    await pipeline.exec();
  }

  async incrementStats(dto: IncrementStatsDto): Promise<void> {
    const client = this.redisService.getClient();
    const pipeline = client.multi();

    if (dto.views) pipeline.incrby(K.views(dto.productId), dto.views);
    if (dto.clicks) pipeline.incrby(K.clicks(dto.productId), dto.clicks);
    if (dto.organicClicks) pipeline.incrby(K.organicClicks(dto.productId), dto.organicClicks);
    if (dto.carts) pipeline.incrby(K.carts(dto.productId), dto.carts);
    if (dto.orders) pipeline.incrby(K.orders(dto.productId), dto.orders);
    if (dto.likes) pipeline.incrby(K.likes(dto.productId), dto.likes);
    if (dto.boostScore) pipeline.incrbyfloat(K.boostScore(dto.productId), dto.boostScore);

    pipeline.zadd(K.dirtySet(), "NX", Date.now(), String(dto.productId));
    pipeline.del(K.cached(dto.productId));

    await pipeline.exec();

    const dirtyCount = await client.zcard(K.dirtySet());
    if (dirtyCount >= DIRTY_FLUSH_THRESHOLD) {
      await this.enqueuFlush();
    }

    this.logger.debug(`Stats incremented for product ${dto.productId}`, dto);
  }

  async batchIncrementStats(updates: IncrementStatsDto[]): Promise<void> {
    const client = this.redisService.getClient();
    const pipeline = client.multi();
    const now = Date.now();

    for (const dto of updates) {
      if (dto.views) pipeline.incrby(K.views(dto.productId), dto.views);
      if (dto.clicks) pipeline.incrby(K.clicks(dto.productId), dto.clicks);
      if (dto.organicClicks) pipeline.incrby(K.organicClicks(dto.productId), dto.organicClicks);
      if (dto.carts) pipeline.incrby(K.carts(dto.productId), dto.carts);
      if (dto.orders) pipeline.incrby(K.orders(dto.productId), dto.orders);
      if (dto.likes) pipeline.incrby(K.likes(dto.productId), dto.likes);
      if (dto.boostScore) pipeline.incrbyfloat(K.boostScore(dto.productId), dto.boostScore);
      pipeline.zadd(K.dirtySet(), "NX", now, String(dto.productId));
      pipeline.del(K.cached(dto.productId));
    }

    await pipeline.exec();
    this.logger.info(`Batch incremented stats for ${updates.length} products`);
  }

  async getStats(productId: number): Promise<ProductStatsResponse> {
    const cached = await this.redisService.getCache(K.cached(productId));
    if (cached) return JSON.parse(cached as string);

    const client = this.redisService.getClient();
    const pipeline = client.multi();
    pipeline.get(K.views(productId));
    pipeline.get(K.clicks(productId));
    pipeline.get(K.organicClicks(productId));
    pipeline.get(K.carts(productId));
    pipeline.get(K.orders(productId));
    pipeline.get(K.likes(productId));
    pipeline.get(K.boostScore(productId));
    
    const rawResults = await pipeline.exec();
    const results = rawResults.map(([err, val]) => (err ? null : val)) as Array<string | null>;

    let [views, clicks, organicClicks, carts, orders, likes, boostScore] = results.map(Number);

    if (!views && !clicks && !carts) {
      const row = await this.productStatistics.findOne({ where: { productId } });
      if (row) {
        views = row.totalViews || 0;
        clicks = row.clicks || 0;
        organicClicks = row.organicClick || 0;
        carts = row.totalCarts || 0;
        orders = row.totalOrders || 0;
        likes = row.like || 0;
        boostScore = row.totalBoostScore || 0;
        await this.seedRedisFromDB(row);
      }
    }

    const stats: ProductStatsResponse = {
      productId,
      totalViews: views || 0,
      clicks: clicks || 0,
      organicClick: organicClicks || 0,
      totalCarts: carts || 0,
      totalOrders: orders || 0,
      totalLikes: likes || 0,
      totalBoostScore: boostScore || 0,
      conversionRate: views > 0 ? (orders / views) * 100 : 0,
      clickThroughRate: views > 0 ? (clicks / views) * 100 : 0,
    };

    await this.redisService.setCacheWithTTL(K.cached(productId), JSON.stringify(stats), CACHE_TTL);
    return stats;
  }

  async getStatsFromDB(productId: number): Promise<ProductStat | null> {
    return this.productStatistics.findOne({ where: { productId } });
  }

  async getAggregatedStats(productIds: number[]): Promise<any> {
    const stats = await Promise.all(productIds.map((id) => this.getStats(id)));

    const totals = stats.reduce(
      (acc, stat) => ({
        totalViews: acc.totalViews + stat.totalViews,
        totalClicks: acc.totalClicks + stat.clicks,
        totalCarts: acc.totalCarts + stat.totalCarts,
        totalOrders: acc.totalOrders + stat.totalOrders,
      }),
      { totalViews: 0, totalClicks: 0, totalCarts: 0, totalOrders: 0 }
    );

    return {
      ...totals,
      averageConversion: totals.totalViews > 0 ? (totals.totalOrders / totals.totalViews) * 100 : 0,
    };
  }

  async getTopByViews(limit = 20): Promise<ProductStatsResponse[]> {
    const cacheKey = K.topViews(limit);
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) return JSON.parse(cached as string);

    const rows = await this.productStatistics.find({
      order: { totalViews: "DESC" },
      take: limit,
    });

    const response = rows.map((r) => this.toResponse(r));
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(response), CACHE_TTL);
    return response;
  }

  async getTopByConversion(limit = 20): Promise<ProductStatsResponse[]> {
    const cacheKey = K.topConversion(limit);
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) return JSON.parse(cached as string);

    const rows = await this.productStatistics
      .createQueryBuilder("stats")
      .where("stats.totalViews > :minViews", { minViews: 100 })
      .orderBy("(stats.totalOrders::float / stats.totalViews)", "DESC")
      .limit(limit)
      .getMany();

    const response = rows.map((r) => this.toResponse(r));
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(response), CACHE_TTL);
    return response;
  }

  async syncRedisToDatabase(productIds?: number[]): Promise<number> {
    try {
      let idsToSync: number[];

      if (productIds?.length) {
        idsToSync = productIds;
      } else {
        idsToSync = await this.getProductIdsWithStats();
      }

      if (!idsToSync.length) return 0;

      let synced = 0;
      for (let i = 0; i < idsToSync.length; i += SYNC_BATCH_SIZE) {
        const batch = idsToSync.slice(i, i + SYNC_BATCH_SIZE);
        const client = this.redisService.getClient();
        const pipeline = client.multi();
        const now = Date.now();
        for (const id of batch) {
          pipeline.zadd(K.dirtySet(), now, String(id));
        }
        await pipeline.exec();
        synced += batch.length;
      }

      return synced;
    } catch (err) {
      this.logger.error("Failed to sync stats to database:", err);
      throw err;
    }
  }

  async resetStats(productId: number): Promise<void> {
    await this.productStatistics.update(
      { productId },
      { totalViews: 0, clicks: 0, organicClick: 0, totalCarts: 0, totalOrders: 0, totalBoostScore: 0, like: 0 }
    );
    await this.initializeRedisCounters(productId);
    await this.redisService.del(K.cached(productId));
    this.logger.log(`Stats reset for product ${productId}`, productId);
  }

  @Cron("*/10 * * * * *")
  async scheduledFlush() {}

  private async enqueuFlush(): Promise<void> {
    await this.statsQueue.add(
      STATS_FLUSH_JOB,
      {},
      {
        jobId: "stats-flush-singleton",
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );
  }

  private async getProductIdsWithStats(): Promise<number[]> {
    const keys = await this.redisService.scanKeys("stats:product:*:views");
    const ids = new Set<number>();
    for (const key of keys) {
      const match = key.match(/stats:product:(\d+):/);
      if (match) ids.add(parseInt(match[1], 10));
    }
    return Array.from(ids);
  }

  private async seedRedisFromDB(row: ProductStat): Promise<void> {
    const client = this.redisService.getClient();
    const pipeline = client.multi();
    pipeline.setex(K.views(row.productId), COUNTER_TTL, String(row.totalViews));
    pipeline.setex(K.clicks(row.productId), COUNTER_TTL, String(row.clicks));
    pipeline.setex(K.organicClicks(row.productId), COUNTER_TTL, String(row.organicClick));
    pipeline.setex(K.carts(row.productId), COUNTER_TTL, String(row.totalCarts));
    pipeline.setex(K.orders(row.productId), COUNTER_TTL, String(row.totalOrders));
    pipeline.setex(K.likes(row.productId), COUNTER_TTL, String(row.like));
    pipeline.setex(K.boostScore(row.productId), COUNTER_TTL, String(row.totalBoostScore));
    await pipeline.exec();
  }

  private toResponse(row: ProductStat): ProductStatsResponse {
    return {
      productId: row.productId,
      totalViews: row.totalViews,
      clicks: row.clicks,
      organicClick: row.organicClick,
      totalCarts: row.totalCarts,
      totalOrders: row.totalOrders,
      totalLikes: row.like,
      totalBoostScore: row.totalBoostScore,
      conversionRate: row.totalViews > 0 ? (row.totalOrders / row.totalViews) * 100 : 0,
      clickThroughRate: row.totalViews > 0 ? (row.clicks / row.totalViews) * 100 : 0,
    };
  }
}
