import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class ProductCacheService {
  // Cache TTL configurations (in seconds)
  private readonly PRODUCT_TTL = 3600; // 1 hour
  private readonly PRODUCT_LIST_TTL = 300; // 5 minutes
  private readonly PRODUCT_STATS_TTL = 600; // 10 minutes
  readonly RECOMMENDATION_TTL = 600; // 10 minutes

  constructor(private readonly redisService: RedisService) {}

  // ========== Cache Key Generators ==========

  private getProductKey(productId: number): string {
    return `product:${productId}`;
  }

  private getProductListKey(filters: any): string {
    const filterStr = JSON.stringify(filters);
    return `product:list:${Buffer.from(filterStr).toString("base64")}`;
  }

  private getProductStatsKey(productId: number): string {
    return `product:stats:${productId}`;
  }

  private getUserProductsKey(userId: string): string {
    return `user:${userId}:products`;
  }

  private getSubCategoryProductsKey(subCategoryId: number): string {
    return `subcategory:${subCategoryId}:products`;
  }

  private getRecommendationKey(cacheKey: string): string {
    return `product:rec:${cacheKey}`;
  }

  private getSubCategoryRecommendationPattern(subCategoryId: number): string {
    return `product:rec:product:recommendations:subcat:${subCategoryId}:*`;
  }

  private getLockKey(key: string): string {
    return `lock:${key}`;
  }

  // ========== Lock Operations ==========

  async acquireLock(key: string, ttlSeconds = 5): Promise<string | null> {
    const token = randomUUID();
    const lockKey = this.getLockKey(key);
    const acquired = await this.redisService.acquireLock(lockKey, token, ttlSeconds);
    return acquired ? token : null;
  }

  async waitUntilLock(key: string, retryDelay = 100, maxRetries = 10): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    return await this.redisService.waitForLock(lockKey, retryDelay, maxRetries);
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    return await this.redisService.releaseLock(lockKey, token);
  }

  // ========== Product Caching ==========

  async getProduct(productId: number): Promise<any> {
    const key = this.getProductKey(productId);
    const value = await this.redisService.get<string>(key);
    return value ? JSON.parse(value) : null;
  }

  async setProduct(productId: number, product: any): Promise<void> {
    const key = this.getProductKey(productId);
    const value = JSON.stringify(product);
    await this.redisService.setEx(key, value, this.PRODUCT_TTL);
  }

  async deleteProduct(productId: number): Promise<void> {
    const key = this.getProductKey(productId);
    await this.redisService.del(key);
  }

  // ========== Product List Caching ==========

  async getProductList(filters: any): Promise<any> {
    const key = this.getProductListKey(filters);
    const value = await this.redisService.get<string>(key);
    return value ? JSON.parse(value) : null;
  }

  async setProductList(filters: any, products: any): Promise<void> {
    const key = this.getProductListKey(filters);
    const value = JSON.stringify(products);
    await this.redisService.setEx(key, value, this.PRODUCT_LIST_TTL);
  }

  // ========== Product Stats Caching ==========

  async getProductStats(productId: number): Promise<any> {
    const key = this.getProductStatsKey(productId);
    const value = await this.redisService.get<string>(key);
    return value ? JSON.parse(value) : null;
  }

  async setProductStats(productId: number, stats: any): Promise<void> {
    const key = this.getProductStatsKey(productId);
    const value = JSON.stringify(stats);
    await this.redisService.setEx(key, value, this.PRODUCT_STATS_TTL);
  }

  // ========== Invalidation Operations ==========

  async invalidateProductCaches(productId: number, userId: string, subCategoryId: number): Promise<void> {
    const keysToDelete = [
      this.getProductKey(productId),
      this.getProductStatsKey(productId),
      this.getUserProductsKey(userId),
      this.getSubCategoryProductsKey(subCategoryId),
    ];

    await this.redisService.del(...keysToDelete);
    await this.invalidateProductLists();
  }

  async invalidateProductLists(): Promise<void> {
    const pattern = "product:list:*";
    await this.redisService.deleteByPatternSafe(pattern);
  }

  async invalidateUserProducts(userId: string): Promise<void> {
    const key = this.getUserProductsKey(userId);
    await this.redisService.del(key);
  }

  async invalidateSubCategoryProducts(subCategoryId: number): Promise<void> {
    const key = this.getSubCategoryProductsKey(subCategoryId);
    await this.redisService.del(key);
  }

  // ========== Recommendation Caching ==========

  async getRecommendations(cacheKey: string): Promise<any | null> {
    const key = this.getRecommendationKey(cacheKey);
    const value = await this.redisService.get<string>(key);
    return value ? JSON.parse(value) : null;
  }

  async setRecommendations(cacheKey: string, data: any[], ttl: number): Promise<void> {
    const key = this.getRecommendationKey(cacheKey);
    await this.redisService.setEx(key, JSON.stringify(data), ttl);
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    await this.redisService.deleteByPatternSafe(pattern);
  }

  async invalidateRecommendationsForSubCategory(subCategoryId: number): Promise<void> {
    const pattern = this.getSubCategoryRecommendationPattern(subCategoryId);
    await this.invalidateByPattern(pattern);
  }

  async invalidateRecommendationsForProduct(productId: number): Promise<void> {
    const pattern = `product:rec:product:recommendations:${productId}:*`;
    await this.invalidateByPattern(pattern);
  }

  // ========== Bulk Operations ==========

  async setMultipleProducts(products: Array<{ id: number; data: any }>): Promise<void> {
    await Promise.all(products.map(({ id, data }) => this.setProduct(id, data)));
  }

  async deleteMultipleProducts(productIds: number[]): Promise<void> {
    const keys = productIds.map((id) => this.getProductKey(id));
    await this.redisService.del(...keys);
  }

  async warmCache(productIds: number[], productData: any[]): Promise<void> {
    if (productIds.length !== productData.length) {
      throw new Error("Product IDs and data arrays must have the same length");
    }
    await Promise.all(productIds.map((id, index) => this.setProduct(id, productData[index])));
  }

  // ========== Cache-Aside Pattern Helper ==========

  async getProductWithFallback(productId: number, fetchFromDb: () => Promise<any>): Promise<any> {
    const cached = await this.getProduct(productId);
    if (cached) return cached;

    const lockKey = `product:${productId}`;
    const token = await this.acquireLock(lockKey, 10);

    if (!token) {
      await this.waitUntilLock(lockKey, 100, 20);
      const cachedAfterWait = await this.getProduct(productId);
      if (cachedAfterWait) return cachedAfterWait;
    }

    try {
      const product = await fetchFromDb();
      if (product) await this.setProduct(productId, product);
      return product;
    } finally {
      if (token) await this.releaseLock(lockKey, token);
    }
  }

  async getProductListWithFallback(filters: any, fetchFromDb: () => Promise<any>): Promise<any> {
    const cached = await this.getProductList(filters);
    if (cached) return cached;

    const lockKey = `product:list:${JSON.stringify(filters)}`;
    const token = await this.acquireLock(lockKey, 10);

    if (!token) {
      await this.waitUntilLock(lockKey, 100, 20);
      const cachedAfterWait = await this.getProductList(filters);
      if (cachedAfterWait) return cachedAfterWait;
    }

    try {
      const products = await fetchFromDb();
      if (products) await this.setProductList(filters, products);
      return products;
    } finally {
      if (token) await this.releaseLock(lockKey, token);
    }
  }
}
