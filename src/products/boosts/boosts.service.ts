import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThan } from "typeorm";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { RedisService } from "src/redis/redis.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BoostingStatus, ProductBoosting } from "./entities/boosts.entity";

export interface CreateBoostDto {
  productId: number;
  boostScore: number;
  durationDays: number;
  userId: string;
}

export interface BoostResponse {
  id: number;
  productId: number;
  boostScore: number;
  status: BoostingStatus;
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class BoostsService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BOOST_LOCK_TTL = 10; // 10 seconds

  constructor(
    @InjectRepository(ProductBoosting)
    private readonly boostRepository: Repository<ProductBoosting>,
    private readonly redisService: RedisService,
    @InjectQueue("product-queue") private productQueue: Queue,
    @InjectQueue("boost-queue") private boostQueue: Queue,
    @InjectLogger() private readonly logger: Logger
  ) {}

  /**
   * Create a new product boost with distributed locking
   */
  async createBoost(dto: CreateBoostDto): Promise<BoostResponse> {
    const lockKey = `boost:lock:product:${dto.productId}`;
    const lockToken = `${Date.now()}-${Math.random()}`;

    try {
      // Acquire distributed lock to prevent race conditions
      const lockAcquired = await this.redisService.acquireLock(lockKey, lockToken, this.BOOST_LOCK_TTL);

      if (!lockAcquired) {
        throw new BadRequestException("Boost operation in progress for this product");
      }

      // Check if product already has an active boost
      const existingBoost = await this.getActiveBoostByProduct(dto.productId);
      if (existingBoost) {
        throw new BadRequestException("Product already has an active boost");
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + dto.durationDays);

      const boost = this.boostRepository.create({
        productId: dto.productId,
        boostScore: dto.boostScore,
        startDate,
        endDate,
        status: BoostingStatus.PENDING,
      });

      const savedBoost = await this.boostRepository.save(boost);

      // Queue background jobs
      await Promise.all([
        // Activate boost immediately
        this.boostQueue.add(
          "activate-boost",
          {
            boostId: savedBoost.id,
            productId: dto.productId,
            boostScore: dto.boostScore,
          },
          { delay: 1000 }
        ), // Activate after 1 second

        // Schedule boost expiry
        this.boostQueue.add(
          "expire-boost",
          {
            boostId: savedBoost.id,
            productId: dto.productId,
          },
          { delay: dto.durationDays * 24 * 60 * 60 * 1000 }
        ),

        // Update product stats
        this.productQueue.add("update-boost-stats", {
          productId: dto.productId,
          boostScore: dto.boostScore,
          action: "add",
        }),
      ]);

      // Invalidate caches
      await this.invalidateBoostCaches(dto.productId);

      console.log(`Boost created for product ${dto.productId}`, {
        boostId: savedBoost.id,
        boostScore: dto.boostScore,
      });

      return this.mapToResponse(savedBoost);
    } finally {
      // Always release the lock
      await this.redisService.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * Get active boost for a product with caching
   */
  async getActiveBoostByProduct(productId: number): Promise<BoostResponse | null> {
    const cacheKey = `boost:active:product:${productId}`;

    // Try cache first
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for active boost: ${cacheKey}`);
      return JSON.parse(cached);
    }

    // Query database
    const boost = await this.boostRepository.findOne({
      where: {
        productId,
        status: BoostingStatus.ACTIVE,
        endDate: MoreThan(new Date()),
      },
    });

    if (!boost) {
      return null;
    }

    const response = this.mapToResponse(boost);

    // Cache the result
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(response), this.CACHE_TTL);

    return response;
  }

  /**
   * Get boost score for ranking calculations (heavily cached)
   */
  async getBoostScore(productId: number): Promise<number> {
    const cacheKey = `boost:score:${productId}`;

    // Try Redis counter first
    const cachedScore = await this.redisService.get(cacheKey);
    if (cachedScore !== null) {
      return Number(cachedScore);
    }

    // Fallback to database
    const boost = await this.getActiveBoostByProduct(productId);
    const score = boost?.boostScore || 0;

    // Cache for quick access (shorter TTL for scores)
    await this.redisService.setEx(cacheKey, score.toString(), 300); // 5 minutes

    return score;
  }

  /**
   * Cancel an active boost
   */
  async cancelBoost(boostId: number, userId: string): Promise<BoostResponse> {
    const boost = await this.boostRepository.findOne({
      where: { id: boostId },
    });

    if (!boost) {
      throw new NotFoundException("Boost not found");
    }

    if (boost.status === BoostingStatus.CANCELED || boost.status === BoostingStatus.EXPIRED) {
      throw new BadRequestException("Boost is already inactive");
    }

    boost.status = BoostingStatus.CANCELED;
    const updated = await this.boostRepository.save(boost);

    // Background jobs
    await Promise.all([
      // Update product stats
      this.productQueue.add("update-boost-stats", {
        productId: boost.productId,
        boostScore: boost.boostScore,
        action: "remove",
      }),

      // Log the cancellation
      this.boostQueue.add("log-boost-cancellation", {
        boostId,
        userId,
        reason: "user_cancelled",
      }),
    ]);

    // Invalidate caches
    await this.invalidateBoostCaches(boost.productId);

    console.log(`Boost cancelled: ${boostId}`, { userId });

    return this.mapToResponse(updated);
  }

  /**
   * Get all boosts for a product with pagination
   */
  async getProductBoostHistory(
    productId: number,
    page = 1,
    limit = 20
  ): Promise<{ data: BoostResponse[]; total: number; page: number; pages: number }> {
    const cacheKey = `boost:history:${productId}:${page}:${limit}`;

    // Try cache
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [boosts, total] = await this.boostRepository.findAndCount({
      where: { productId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = {
      data: boosts.map(this.mapToResponse),
      total,
      page,
      pages: Math.ceil(total / limit),
    };

    // Cache for shorter duration (5 minutes)
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  /**
   * Get top boosted products (for ranking)
   */
  async getTopBoostedProducts(limit = 100): Promise<{ productId: number; boostScore: number }[]> {
    const cacheKey = `boost:top:${limit}`;

    // Try cache
    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const boosts = await this.boostRepository
      .createQueryBuilder("boost")
      .select("boost.productId", "productId")
      .addSelect("boost.boostScore", "boostScore")
      .where("boost.status = :status", { status: BoostingStatus.ACTIVE })
      .andWhere("boost.endDate > :now", { now: new Date() })
      .orderBy("boost.boostScore", "DESC")
      .limit(limit)
      .getRawMany();

    // Cache for 2 minutes (frequently updated)
    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(boosts), 120);

    return boosts;
  }

  /**
   * Bulk activate boosts (internal method called by job processor)
   */
  async activateBoost(boostId: number): Promise<void> {
    const boost = await this.boostRepository.findOne({
      where: { id: boostId, status: BoostingStatus.PENDING },
    });

    if (!boost) {
      this.logger.warn(`Boost ${boostId} not found or not pending`);
      return;
    }

    boost.status = BoostingStatus.ACTIVE;
    await this.boostRepository.save(boost);

    // Update Redis cache immediately
    const cacheKey = `boost:score:${boost.productId}`;
    await this.redisService.setEx(cacheKey, boost.boostScore.toString(), 300);

    await this.invalidateBoostCaches(boost.productId);

    console.log(`Boost ${boostId} activated for product ${boost.productId}`);
  }

  /**
   * Expire boosts (called by cron or job)
   */
  async expireBoost(boostId: number): Promise<void> {
    const boost = await this.boostRepository.findOne({
      where: { id: boostId },
    });

    if (!boost || boost.status === BoostingStatus.EXPIRED) {
      return;
    }

    boost.status = BoostingStatus.EXPIRED;
    await this.boostRepository.save(boost);

    // Update stats
    await this.productQueue.add("update-boost-stats", {
      productId: boost.productId,
      boostScore: boost.boostScore,
      action: "remove",
    });

    await this.invalidateBoostCaches(boost.productId);

    console.log(`Boost ${boostId} expired for product ${boost.productId}`);
  }

  /**
   * Cron job to expire old boosts (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredBoosts() {
    console.log("Running expired boosts cleanup");

    const expiredBoosts = await this.boostRepository.find({
      where: {
        status: BoostingStatus.ACTIVE,
        endDate: LessThan(new Date()),
      },
    });

    if (expiredBoosts.length === 0) {
      return;
    }

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < expiredBoosts.length; i += batchSize) {
      const batch = expiredBoosts.slice(i, i + batchSize);

      await Promise.all(
        batch.map((boost) =>
          this.boostQueue.add("expire-boost", {
            boostId: boost.id,
            productId: boost.productId,
          })
        )
      );
    }

    console.log(`Queued ${expiredBoosts.length} boosts for expiration`);
  }

  /**
   * Get boost analytics
   */
  async getBoostAnalytics(productId: number): Promise<{
    totalBoosts: number;
    activeBoosts: number;
    totalBoostScore: number;
    averageBoostScore: number;
  }> {
    const cacheKey = `boost:analytics:${productId}`;

    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.boostRepository
      .createQueryBuilder("boost")
      .select("COUNT(*)", "totalBoosts")
      .addSelect("SUM(CASE WHEN boost.status = :status THEN 1 ELSE 0 END)", "activeBoosts")
      .addSelect("SUM(boost.boostScore)", "totalBoostScore")
      .addSelect("AVG(boost.boostScore)", "averageBoostScore")
      .where("boost.productId = :productId", { productId })
      .setParameter("status", BoostingStatus.ACTIVE)
      .getRawOne();

    const analytics = {
      totalBoosts: parseInt(result.totalBoosts) || 0,
      activeBoosts: parseInt(result.activeBoosts) || 0,
      totalBoostScore: parseFloat(result.totalBoostScore) || 0,
      averageBoostScore: parseFloat(result.averageBoostScore) || 0,
    };

    await this.redisService.setCacheWithTTL(cacheKey, JSON.stringify(analytics), 600);

    return analytics;
  }

  /**
   * Invalidate all boost-related caches for a product
   */
  private async invalidateBoostCaches(productId: number): Promise<void> {
    const patterns = [
      `boost:active:product:${productId}`,
      `boost:score:${productId}`,
      `boost:analytics:${productId}`,
      `boost:history:${productId}:*`,
      `boost:top:*`,
    ];

    await Promise.all(
      patterns.map((pattern) =>
        pattern.includes("*")
          ? this.redisService.deleteByPatternSafe(pattern)
          : this.redisService.delCache(pattern)
      )
    );
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponse(boost: ProductBoosting): BoostResponse {
    return {
      id: boost.id,
      productId: boost.productId,
      boostScore: boost.boostScore,
      status: boost.status,
      startDate: boost.startDate,
      endDate: boost.endDate,
    };
  }
}
