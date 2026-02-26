import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Repository } from "typeorm";
import { BoostingStatus, ProductBoosting } from "../boosts/entities/boosts.entity";
import { Product } from "../entities/product.entity";
import { ProductStat } from "../stats/entities/product_stats.entity";

export interface RankingWeights {
  viewWeight: number;
  wishlistWeight: number;
  cartWeight: number;
  orderWeight: number;
  boostMultiplier: number;
  recencyWeight: number;
}
@Injectable()
export class RankingsService {
  // Sorted set keys
  private readonly TRENDING_KEY = "ranking:trending";
  private readonly POPULAR_KEY = "ranking:popular";
  private readonly NEW_ARRIVALS_KEY = "ranking:new-arrivals";
  private readonly DISCOUNTED_KEY = "ranking:discounted";

  // Default ranking weights
  private readonly weights: RankingWeights = {
    viewWeight: 1,
    wishlistWeight: 3,
    cartWeight: 5,
    orderWeight: 10,
    boostMultiplier: 2.0,
    recencyWeight: 0.1,
  };

  constructor(
    private readonly _redisService: RedisService,
    @InjectRepository(Product)
    private _productRepository: Repository<Product>,
    @InjectRepository(ProductStat)
    private _productStatRepository: Repository<ProductStat>,
    @InjectRepository(ProductBoosting)
    private _productBoostingRepository: Repository<ProductBoosting>,
    @InjectLogger() private readonly _logger: Logger
  ) {}

  /**
   * Calculate trending score for a product
   */
  private calculateTrendingScore(
    stats: ProductStat,
    boost: ProductBoosting | null,
    createdDaysAgo: number
  ): number {
    const baseScore =
      (stats.totalViews || 0) * this.weights.viewWeight +
      (stats.totalCarts || 0) * this.weights.wishlistWeight +
      (stats.clicks || 0) * this.weights.cartWeight +
      (stats.totalOrders || 0) * this.weights.orderWeight;

    // Apply boost multiplier if active
    const boostMultiplier = boost && this.isBoostActive(boost) ? this.weights.boostMultiplier : 1.0;

    // Recency decay: newer products get higher scores
    const recencyScore = Math.max(0, 30 - createdDaysAgo) * this.weights.recencyWeight;

    return (baseScore + recencyScore) * boostMultiplier;
  }

  /**
   * Check if boost is currently active
   */
  private isBoostActive(boost: ProductBoosting): boolean {
    if (!boost || boost.status !== BoostingStatus.ACTIVE) return false;

    const now = new Date();
    if (boost.startDate && now < boost.startDate) return false;
    if (boost.endDate && now > boost.endDate) return false;

    return true;
  }

  /**
   * Update ranking for a single product
   */
  async updateProductRanking(productId: number): Promise<void> {
    try {
      const product = await this._productRepository.findOne({
        where: { id: productId },
        relations: ["stats", "boosting"],
      });
      // console.log(product);

      if (!product) {
        this._logger.warn(`Product ${productId} not found for ranking update`);
        return;
      }

      const createdDaysAgo = Math.floor(
        (Date.now() - new Date(product.id).getTime()) / (1000 * 60 * 60 * 24)
      );

      const score = this.calculateTrendingScore(product.stats, product.boosting, createdDaysAgo);
      console.log("Score", score);
      // Add to trending sorted set
      await this._redisService.zadd(this.TRENDING_KEY, score, productId.toString());

      // If has discount, add to discounted sorted set
      if (this.hasActiveDiscount(product)) {
        const discountScore = product.discountPercentage || 0;
        await this._redisService.zadd(this.DISCOUNTED_KEY, discountScore, productId.toString());
      } else {
        // Remove from discounted if discount expired
        await this._redisService.zdel(this.DISCOUNTED_KEY, productId.toString());
      }

      // Add to new arrivals if less than 30 days old
      if (createdDaysAgo <= 30) {
        await this._redisService.zadd(this.NEW_ARRIVALS_KEY, Date.now(), productId.toString());
      }

      this._logger.debug(`Updated ranking for product ${productId} with score ${score}`);
    } catch (error) {
      this._logger.error(`Failed to update ranking for product  ${error.message}`);
    }
  }

  /**
   * Check if product has active discount
   */
  private hasActiveDiscount(product: Product): boolean {
    if (!product.discountPercentage) return false;

    const now = new Date();
    if (product.discountStartDate && now < product.discountStartDate) return false;
    if (product.discountEndDate && now > product.discountEndDate) return false;

    return true;
  }

  /**
   * Batch update rankings for multiple products
   */
  async batchUpdateRankings(productIds: number[]): Promise<void> {
    const batchSize = 100;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      await Promise.all(batch.map((id) => this.updateProductRanking(id)));
    }
  }

  /**
   * Get trending products (highest scores)
   */
  async getTrendingProducts(limit: number = 20, offset: number = 0): Promise<number[]> {
    try {
      console.log(this.TRENDING_KEY, offset, limit);
      // Get product IDs from sorted set (highest score first)
      const results = await this._redisService.zrange(this.TRENDING_KEY, offset, limit);
      console.log(results);
      return results.map((id: string) => parseInt(id, 10));
    } catch (error) {
      this._logger.error(`Failed to get trending products: ${error.message}`);
      return [];
    }
  }

  /**
   * Get discounted products (highest discount first)
   */
  async getDiscountedProducts(limit: number = 20, offset: number = 0): Promise<number[]> {
    try {
      const results = await this._redisService.zrange(this.DISCOUNTED_KEY, offset, offset + limit - 1);

      return results.map((id: string) => parseInt(id, 10));
    } catch (error) {
      this._logger.error(`Failed to get discounted products: ${error.message}`);
      return [];
    }
  }

  /**
   * Get new arrival products
   */
  async getNewArrivals(limit: number = 20, offset: number = 0): Promise<number[]> {
    try {
      const results = await this._redisService.zrange(this.NEW_ARRIVALS_KEY, offset, offset + limit - 1);

      return results.map((id: string) => parseInt(id, 10));
    } catch (error) {
      this._logger.error(`Failed to get new arrivals: ${error.message}`);
      return [];
    }
  }

  /**
   * Rebuild all rankings (run periodically)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async rebuildAllRankings(): Promise<void> {
    this._logger.log("Starting full ranking rebuild...");

    try {
      const products = await this._productRepository.find({
        relations: ["stats", "boosting"],
        select: ["id"],
      });

      const productIds = products.map((p) => p.id);
      await this.batchUpdateRankings(productIds);

      this._logger.log(`Completed ranking rebuild for ${productIds.length} products`);
    } catch (error) {
      this._logger.error(`Failed to rebuild rankings: ${error.message}`);
    }
  }

  /**
   * Clean up old entries from sorted sets
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldRankings(): Promise<void> {
    try {
      // Remove products older than 30 days from new arrivals
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      await this._redisService.zRemoveRangeByScore(this.NEW_ARRIVALS_KEY, 0, thirtyDaysAgo);

      // Remove products with zero score from trending
      await this._redisService.zRemoveRangeByScore(this.TRENDING_KEY, 0, 0);

      this._logger.log("Completed ranking cleanup");
    } catch (error) {
      this._logger.error(`Failed to cleanup rankings: ${error.message}`);
    }
  }

  /**
   * Get product rank in trending
   */
  async getProductTrendingRank(productId: number): Promise<number | null> {
    try {
      const rank = await this._redisService.zRevRank(this.TRENDING_KEY, productId.toString());
      return rank !== null ? rank + 1 : null; // Convert to 1-based ranking
    } catch (error) {
      this._logger.error(`Failed to get product rank: ${error.message}`);
      return null;
    }
  }

  /**
   * Increment product views and update ranking
   */
  async incrementViewsAndUpdateRanking(productId: number): Promise<void> {
    // Update stats
    await this._productStatRepository.increment({ productId }, "totalViews", 1);
    console.log(productId);
    // Update ranking
    await this.updateProductRanking(productId);
  }

  /**
   * Remove product from all rankings
   */
  async removeProductFromRankings(productId: number): Promise<void> {
    try {
      await Promise.all([
        this._redisService.zdel(this.TRENDING_KEY, productId.toString()),
        this._redisService.zdel(this.DISCOUNTED_KEY, productId.toString()),
        this._redisService.zdel(this.NEW_ARRIVALS_KEY, productId.toString()),
        this._redisService.zdel(this.POPULAR_KEY, productId.toString()),
      ]);
    } catch (error) {
      this._logger.error(`Failed to remove product from rankings: ${error.message}`);
    }
  }
}
