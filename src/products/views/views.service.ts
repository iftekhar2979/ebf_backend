/* eslint-disable prettier/prettier */
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { PRODUCT_VIEW_BUFFER_KEY, PRODUCT_VIEW_FLUSH_JOB, PRODUCT_VIEW_FLUSH_THRESHOLD, PRODUCT_VIEW_QUEUE, ProductViewJobData } from "src/bull/types/product.view.types";
import { RedisService } from "src/redis/redis.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Repository } from "typeorm";
import { Logger } from "winston";
import { ProductView } from "./entities/views.entity";
@Injectable()
export class ViewsService implements OnModuleInit, OnModuleDestroy {
  /**
   * In-memory micro-buffer (single instance).
   * For multi-instance deployments, this is backed by Redis list (see pushToBuffer).
   */
  private localBuffer: ProductViewJobData[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(ProductView)
    private readonly productViewRepo: Repository<ProductView>,
    @InjectQueue(PRODUCT_VIEW_QUEUE)
    private readonly viewQueue: Queue,
    private readonly redisService: RedisService,
    @InjectLogger() private readonly logger: Logger
  ) {}

  onModuleInit() {
    // Kick off periodic flush as fallback to threshold-based flush
    this.flushTimer = setInterval(() => this.flushBuffer(), 5_000);
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Track a product view.
   * O(1) – writes to Redis buffer. Does NOT touch the DB.
   */
  async trackView(productId: number, userId: number): Promise<void> {
    const payload = {
      productId,
      userId,
      viewedAt: new Date().toISOString(),
    };

    // Push to Redis list (atomic, works across replicas)
    await this.redisService
      .eval(
        `redis.call('RPUSH', KEYS[1], ARGV[1])
       return redis.call('LLEN', KEYS[1])`,
        [PRODUCT_VIEW_BUFFER_KEY],
        [JSON.stringify(payload)]
      )
      .then(async (length: number) => {
        if (length >= PRODUCT_VIEW_FLUSH_THRESHOLD) {
          // Enqueue a flush job immediately (debounced by BullMQ deduplication)
          await this.enqueueFlusJob();
        }
      });
  }

  /**
   * Read paginated view history for a user.
   * Uses the DB index `user_history` [userId, viewedAt].
   */
  async getUserViewHistory(userId: number, page = 1, limit = 20): Promise<ProductView[]> {
    return this.productViewRepo.find({
      where: { userId },
      order: { viewedAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
      select: ["id", "productId", "viewedAt"],
    });
  }

  /**
   * Get total view count for a product (served from Redis counter – O(1)).
   */
  async getProductViewCount(productId: number): Promise<number> {
    const raw = await this.redisService.get(`product:${productId}:views`);
    return raw ? parseInt(raw, 10) : 0;
  }

  // ─── Flush Logic ─────────────────────────────────────────────────────────────

  /**
   * Drain the Redis buffer and bulk-insert into PostgreSQL.
   * Called either by BullMQ worker or by the cron fallback.
   */
  async flushBuffer(): Promise<void> {
    // LMPOP atomically pops N items – no double processing.
    const items = await this.drainRedisBuffer();
    if (!items.length) return;

    const views = items.map((raw) => {
      const d: ProductViewJobData = JSON.parse(raw);
      return this.productViewRepo.create({
        productId: d.productId,
        userId: d.userId,
        viewedAt: new Date(d.viewedAt),
      });
    });

    try {
      // Single bulk INSERT – one DB round-trip for the whole batch
      await this.productViewRepo
        .createQueryBuilder()
        .insert()
        .into(ProductView)
        .values(views)
        .orIgnore() // idempotent on duplicate (productId+userId+viewedAt)
        .execute();

      // Fire-and-forget: update Redis counters per product
      const countMap = this.groupByProduct(items);
      await this.incrementViewCounters(countMap);

      // Enqueue stat aggregation job (one per flush batch)
      await this.viewQueue.add(
        "aggregate_view_stats",
        { countMap },
        { jobId: `agg-views-${Date.now()}`, removeOnComplete: 100 }
      );

      this.logger.info(`[ProductView] Flushed ${views.length} views to DB`);
    } catch (err) {
      this.logger.error("[ProductView] Flush failed, re-queuing", err);
      // Re-push failed items back to buffer head for retry
      await this.requeueItems(items);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async enqueueFlusJob(): Promise<void> {
    await this.viewQueue.add(
      PRODUCT_VIEW_FLUSH_JOB,
      {},
      {
        jobId: "flush-views-singleton", // deduplication key
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );
  }

  /**
   * Atomically drain up to 500 items from the Redis list.
   */
  private async drainRedisBuffer(): Promise<string[]> {
    const BATCH = 500;
    const script = `
      local items = redis.call('LRANGE', KEYS[1], 0, ARGV[1] - 1)
      redis.call('LTRIM', KEYS[1], ARGV[1], -1)
      return items
    `;
    const result = await this.redisService.eval(script, [PRODUCT_VIEW_BUFFER_KEY], [String(BATCH)]);
    return result as string[];
  }

  private groupByProduct(rawItems: string[]): Record<number, number> {
    return rawItems.reduce(
      (acc, raw) => {
        const { productId } = JSON.parse(raw);
        acc[productId] = (acc[productId] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );
  }

  private async incrementViewCounters(countMap: Record<number, number>): Promise<void> {
    const pipeline = this.redisService.getClient().multi();
    for (const [productId, count] of Object.entries(countMap)) {
      pipeline.incrBy(`product:${productId}:views`, count);
    }
    await pipeline.exec();
  }

  private async requeueItems(items: string[]): Promise<void> {
    const script = `
      for i = #ARGV, 1, -1 do
        redis.call('LPUSH', KEYS[1], ARGV[i])
      end
    `;
    await this.redisService.eval(script, [PRODUCT_VIEW_BUFFER_KEY], items);
  }
}
