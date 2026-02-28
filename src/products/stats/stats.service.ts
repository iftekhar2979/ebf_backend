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
  boostScore: (id: number) => `stats:product:${id}:boost_score`,
  cached: (id: number) => `stats:cached:${id}`,
  topViews: (limit: number) => `stats:top:views:${limit}`,
  topConversion: (limit: number) => `stats:top:conversion:${limit}`,
  /** Sorted set of productIds with pending DB sync */
  dirtySet: () => `stats:dirty:products`,
};

const COUNTER_TTL = 86_400; // 24h — individual counter keys
const CACHE_TTL = 300; // 5 min — computed response cache
const DIRTY_FLUSH_THRESHOLD = 200; // enqueue immediate flush above this
const SYNC_BATCH_SIZE = 100;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

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

  onModuleInit() {
    // Fallback timer — flushes every 30s even if dirty threshold isn't hit
    // this.flushTimer = setInterval(() => this.flushDirtyStats(), 30_000);
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  // ─── Lifecycle: Initialize ─────────────────────────────────────────────────

  /**
   * Initialize stats row + Redis counters for a newly created product.
   */
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
      });

      await this.productStatistics.save(product);
      await this.initializeRedisCounters(dto.productId);

      this.logger.info(`Stats initialized for product ${dto.productId}`);
    } catch (err) {
      this.logger.error(`Failed to create stats for product ${dto.productId}:`, err);
      throw err;
    }
  }

  private async initializeRedisCounters(productId: number): Promise<void> {
    const pipeline = this.redisService.getClient().multi();
    pipeline.setEx(K.views(productId), COUNTER_TTL, "0");
    pipeline.setEx(K.clicks(productId), COUNTER_TTL, "0");
    pipeline.setEx(K.organicClicks(productId), COUNTER_TTL, "0");
    pipeline.setEx(K.carts(productId), COUNTER_TTL, "0");
    pipeline.setEx(K.orders(productId), COUNTER_TTL, "0");
    pipeline.setEx(K.boostScore(productId), COUNTER_TTL, "0");
    await pipeline.exec();
  }

  // ─── Write: Increment (hot path) ──────────────────────────────────────────

  /**
   * Increment one or more stat counters atomically via Redis pipeline.
   * O(1) — zero DB involvement. Marks product dirty for next flush.
   *
   * Primary method called by ProductViewWorker, CartWorker, OrderWorker, etc.
   */
  async incrementStats(dto: IncrementStatsDto): Promise<void> {
    const client = this.redisService.getClient();
    const pipeline = client.multi();

    if (dto.views) pipeline.incrBy(K.views(dto.productId), dto.views);
    if (dto.clicks) pipeline.incrBy(K.clicks(dto.productId), dto.clicks);
    if (dto.organicClicks) pipeline.incrBy(K.organicClicks(dto.productId), dto.organicClicks);
    if (dto.carts) pipeline.incrBy(K.carts(dto.productId), dto.carts);
    if (dto.orders) pipeline.incrBy(K.orders(dto.productId), dto.orders);
    if (dto.boostScore) pipeline.incrByFloat(K.boostScore(dto.productId), dto.boostScore);

    // Mark as dirty for DB sync (ZADD NX — only sets score on first write)
    pipeline.zAdd(K.dirtySet(), { score: Date.now(), value: String(dto.productId) }, { NX: true });

    // Invalidate computed cache
    pipeline.del(K.cached(dto.productId));

    await pipeline.exec();

    // Check dirty set size — enqueue immediate flush if above threshold
    const dirtyCount = await client.zCard(K.dirtySet());
    if (dirtyCount >= DIRTY_FLUSH_THRESHOLD) {
      await this.enqueuFlush();
    }

    this.logger.debug(`Stats incremented for product ${dto.productId}`, dto);
  }

  /**
   * Batch increment stats across multiple products in a single pipeline.
   * Use for bulk operations (order batch processing, import, etc.).
   */
  async batchIncrementStats(updates: IncrementStatsDto[]): Promise<void> {
    const client = this.redisService.getClient();
    const pipeline = client.multi();
    const now = Date.now();

    for (const dto of updates) {
      if (dto.views) pipeline.incrBy(K.views(dto.productId), dto.views);
      if (dto.clicks) pipeline.incrBy(K.clicks(dto.productId), dto.clicks);
      if (dto.organicClicks) pipeline.incrBy(K.organicClicks(dto.productId), dto.organicClicks);
      if (dto.carts) pipeline.incrBy(K.carts(dto.productId), dto.carts);
      if (dto.orders) pipeline.incrBy(K.orders(dto.productId), dto.orders);
      if (dto.boostScore) pipeline.incrByFloat(K.boostScore(dto.productId), dto.boostScore);
      pipeline.zAdd(K.dirtySet(), { score: now, value: String(dto.productId) }, { NX: true });
      pipeline.del(K.cached(dto.productId));
    }

    await pipeline.exec();
    this.logger.info(`Batch incremented stats for ${updates.length} products`);
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  /**
   * Get real-time stats for a product.
   * Reads from Redis counters (computed cache → raw counters → DB fallback).
   */
  async getStats(productId: number): Promise<ProductStatsResponse> {
    // L1: computed response cache
    const cached = await this.redisService.getCache(K.cached(productId));
    if (cached) return JSON.parse(cached as string);

    // L2: raw Redis counters (parallel reads)
    const client = this.redisService.getClient();
    const pipeline = client.multi();
    pipeline.get(K.views(productId));
    pipeline.get(K.clicks(productId));
    pipeline.get(K.organicClicks(productId));
    pipeline.get(K.carts(productId));
    pipeline.get(K.orders(productId));
    pipeline.get(K.boostScore(productId));
    const results = (await pipeline.exec()) as Array<string | null>;

    let [views, clicks, organicClicks, carts, orders, boostScore] = results.map(Number);

    // L3: DB fallback if counters missing (e.g. after Redis eviction)
    if (!views && !clicks && !carts) {
      const row = await this.productStatistics.findOne({ where: { productId } });
      if (row) {
        views = row.totalViews;
        clicks = row.clicks;
        organicClicks = row.organicClick;
        carts = row.totalCarts;
        orders = row.totalOrders;
        boostScore = row.totalBoostScore;
        // Re-seed Redis from DB
        await this.seedRedisFromDB(row);
      }
    }

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

    await this.redisService.setCacheWithTTL(K.cached(productId), JSON.stringify(stats), CACHE_TTL);
    return stats;
  }

  /**
   * Get raw DB row (for admin/reporting — bypasses cache).
   */
  async getStatsFromDB(productId: number): Promise<ProductStat | null> {
    return this.productStatistics.findOne({ where: { productId } });
  }

  /**
   * Get aggregated stats across multiple products.
   */
  async getAggregatedStats(productIds: number[]): Promise<{
    totalViews: number;
    totalClicks: number;
    totalCarts: number;
    totalOrders: number;
    averageConversion: number;
  }> {
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

  /**
   * Top products by total views (DB-backed for historical accuracy).
   */
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

  /**
   * Top products by conversion rate (min 100 views threshold).
   */
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

  // ─── DB Flush (core sync logic) ────────────────────────────────────────────

  /**
   * Flush all dirty product stats to PostgreSQL in a single bulk UPSERT.
   *
   * Algorithm:
   * 1. ZPOPMIN dirty set → up to 500 product IDs (atomic claim)
   * 2. Pipeline MGET all counters for each product
   * 3. One INSERT ... ON CONFLICT DO UPDATE (all products, one DB round-trip)
   * 4. Re-seed TTL on Redis keys so they don't evict between syncs
   */
  // async flushDirtyStats(): Promise<void> {
  //   const productIds = await this.popDirtyProducts(500);
  //   if (!productIds.length) return;

  //   // Batch-read all counters in one pipeline
  //   const client = this.redisService.getClient();
  //   const pipeline = client.multi();
  //   for (const id of productIds) {
  //     pipeline.get(K.views(id));
  //     pipeline.get(K.clicks(id));
  //     pipeline.get(K.organicClicks(id));
  //     pipeline.get(K.carts(id));
  //     pipeline.get(K.orders(id));
  //     pipeline.get(K.boostScore(id));
  //   }
  //   const raw = (await pipeline.exec()) as Array<string | null>;

  //   // Parse into upsert values
  //   const values = productIds.map((productId, i) => {
  //     const base = i * 6;
  //     return {
  //       productId,
  //       totalViews: parseInt(raw[base] ?? "0", 10),
  //       clicks: parseInt(raw[base + 1] ?? "0", 10),
  //       organicClick: parseInt(raw[base + 2] ?? "0", 10),
  //       totalCarts: parseInt(raw[base + 3] ?? "0", 10),
  //       totalOrders: parseInt(raw[base + 4] ?? "0", 10),
  //       totalBoostScore: parseFloat(raw[base + 5] ?? "0"),
  //     };
  //   });

  //   try {
  //     /**
  //      * Single SQL statement — all products in one round-trip:
  //      *
  //      * INSERT INTO product_stats (productId, totalViews, ...)
  //      * VALUES ($1,$2,...), ($7,$8,...), ...
  //      * ON CONFLICT (productId) DO UPDATE SET
  //      *   totalViews      = EXCLUDED.totalViews,
  //      *   clicks          = EXCLUDED.clicks,
  //      *   ...
  //      */
  //     await this.productStatistics
  //       .createQueryBuilder()
  //       .insert()
  //       .into(ProductStat)
  //       .values(values)
  //       .orUpdate(
  //         ["totalViews", "clicks", "organicClick", "totalCarts", "totalOrders", "totalBoostScore"],
  //         ["productId"],
  //         { skipUpdateIfNoValuesChanged: true }
  //       )
  //       .execute();

  //     // Refresh TTL on counter keys so they don't evict before next sync
  //     const ttlPipeline = client.multi();
  //     for (const id of productIds) {
  //       ttlPipeline.expire(K.views(id), COUNTER_TTL);
  //       ttlPipeline.expire(K.clicks(id), COUNTER_TTL);
  //       ttlPipeline.expire(K.organicClicks(id), COUNTER_TTL);
  //       ttlPipeline.expire(K.carts(id), COUNTER_TTL);
  //       ttlPipeline.expire(K.orders(id), COUNTER_TTL);
  //       ttlPipeline.expire(K.boostScore(id), COUNTER_TTL);
  //     }
  //     await ttlPipeline.exec();

  //     this.logger.info(`[StatsService] Flushed ${values.length} products to DB`);
  //   } catch (err) {
  //     this.logger.error("[StatsService] Flush failed — re-marking products as dirty", err);
  //     // Re-add to dirty set so they're retried next cycle
  //     const retryPipeline = client.multi();
  //     const now = Date.now();
  //     for (const id of productIds) {
  //       retryPipeline.zAdd(K.dirtySet(), { score: now, value: String(id) }, { NX: true });
  //     }
  //     await retryPipeline.exec();
  //   }
  // }

  /**
   * Explicit sync by product IDs (admin / on-demand use).
   * Still goes through the dirty-set flush path for consistency.
   */
  async syncRedisToDatabase(productIds?: number[]): Promise<number> {
    try {
      let idsToSync: number[];

      if (productIds?.length) {
        idsToSync = productIds;
      } else {
        idsToSync = await this.getProductIdsWithStats();
      }

      if (!idsToSync.length) {
        this.logger.log("No products to sync", 0);
        return 0;
      }

      this.logger.log(`Syncing stats for ${idsToSync.length} products`, idsToSync.length);
      let synced = 0;

      // Process in SYNC_BATCH_SIZE chunks to avoid overwhelming the DB
      for (let i = 0; i < idsToSync.length; i += SYNC_BATCH_SIZE) {
        const batch = idsToSync.slice(i, i + SYNC_BATCH_SIZE);

        // Mark them all dirty then flush — reuses flushDirtyStats logic
        const client = this.redisService.getClient();
        const pipeline = client.multi();
        const now = Date.now();
        for (const id of batch) {
          pipeline.zAdd(K.dirtySet(), { score: now, value: String(id) });
        }
        await pipeline.exec();

        // await this.flushDirtyStats();
        synced += batch.length;

        this.logger.log(`Synced batch ${Math.ceil(i / SYNC_BATCH_SIZE) + 1}: ${synced} total`, synced);
      }

      this.logger.log(`Sync complete: ${synced} products updated`, synced);
      return synced;
    } catch (err) {
      this.logger.error("Failed to sync stats to database:", err);
      throw err;
    }
  }

  // ─── Admin Operations ──────────────────────────────────────────────────────

  async resetStats(productId: number): Promise<void> {
    await this.productStatistics.update(
      { productId },
      { totalViews: 0, clicks: 0, organicClick: 0, totalCarts: 0, totalOrders: 0, totalBoostScore: 0 }
    );
    await this.initializeRedisCounters(productId);
    await this.redisService.del(K.cached(productId));
    this.logger.log(`Stats reset for product ${productId}`, productId);
  }

  // ─── Cron Jobs ─────────────────────────────────────────────────────────────

  /** Flush dirty products every 10 seconds (fast path) */
  @Cron("*/10 * * * * *")
  async scheduledFlush() {
    // await this.flushDirtyStats();
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async enqueuFlush(): Promise<void> {
    await this.statsQueue.add(
      STATS_FLUSH_JOB,
      {},
      {
        jobId: "stats-flush-singleton", // deduplication — only one in queue at a time
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );
  }

  /** Atomically claim up to `limit` dirty product IDs */
  // private async popDirtyProducts(limit: number): Promise<number[]> {
  //   console.log(K.dirtySet());
  //   const items = await this.redisService.popMinMembers(K.dirtySet());
  //   return items.map((item) => parseInt(item.value, 10));
  // }

  /** Discover all product IDs that have Redis counter keys (via SCAN) */
  private async getProductIdsWithStats(): Promise<number[]> {
    const keys = await this.redisService.scanKeys("stats:product:*:views");
    const ids = new Set<number>();
    for (const key of keys) {
      const match = key.match(/stats:product:(\d+):/);
      if (match) ids.add(parseInt(match[1], 10));
    }
    return Array.from(ids);
  }

  /** Re-seed Redis counters from a DB row (after eviction) */
  private async seedRedisFromDB(row: ProductStat): Promise<void> {
    const client = this.redisService.getClient();
    const pipeline = client.multi();
    pipeline.setEx(K.views(row.productId), COUNTER_TTL, String(row.totalViews));
    pipeline.setEx(K.clicks(row.productId), COUNTER_TTL, String(row.clicks));
    pipeline.setEx(K.organicClicks(row.productId), COUNTER_TTL, String(row.organicClick));
    pipeline.setEx(K.carts(row.productId), COUNTER_TTL, String(row.totalCarts));
    pipeline.setEx(K.orders(row.productId), COUNTER_TTL, String(row.totalOrders));
    pipeline.setEx(K.boostScore(row.productId), COUNTER_TTL, String(row.totalBoostScore));
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
      totalBoostScore: row.totalBoostScore,
      conversionRate: row.totalViews > 0 ? (row.totalOrders / row.totalViews) * 100 : 0,
      clickThroughRate: row.totalViews > 0 ? (row.clicks / row.totalViews) * 100 : 0,
    };
  }
}
