import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisService } from 'src/redis/redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductCacheService {
  // Cache TTL configurations (in seconds)
  private readonly PRODUCT_TTL = 3600; // 1 hour
  private readonly PRODUCT_LIST_TTL = 300; // 5 minutes
  private readonly PRODUCT_STATS_TTL = 600; // 10 minutes
 private readonly cacheManager;
  constructor(
    private readonly redisService:RedisService,) {
    this.cacheManager = this.redisService.getClient()
}

  // Generate cache keys
  private getProductKey(productId: number): string {
    return `product:${productId}`;
  }

  private getProductListKey(filters: any): string {
    const filterStr = JSON.stringify(filters);
    return `product:list:${Buffer.from(filterStr).toString('base64')}`;
  }

  private getProductStatsKey(productId: number): string {
    return `product:stats:${productId}`;
  }

  private getUserProductsKey(userId: string): string {
    return `user:${userId}:products`;
  }
 async acquireLock(
    key: string,
    ttlSeconds = 5,
  ): Promise<string | null> {
    const token = randomUUID();

    const result = await this.cacheManager.set(
      key,
      token,
      'NX',
      'EX',
      ttlSeconds,
    );

    if (result === 'OK') {
      return token;
    }

    return null;
  }

  private getSubCategoryProductsKey(subCategoryId: number): string {
    return `subcategory:${subCategoryId}:products`;
  }

  // Product caching
  async getProduct(productId: number): Promise<any> {
    return await this.cacheManager.get(this.getProductKey(productId));
  }

  async setProduct(productId: number, product: any): Promise<void> {
    await this.cacheManager.set(
      this.getProductKey(productId),
      product,
      this.PRODUCT_TTL * 1000,
    );
  }

  async waitUntilLock(key:string,retryDelay=100,maxRetries=10){
    let retries =0 
    while(retries <maxRetries){
        const exist= await this.cacheManager.exists(key)
        if(!exist){
            await new Promise((resolve)=>{
                setTimeout(resolve, retryDelay)
            })
        }
        retries++
    }

  }

  async releaseLock(key: string, token: string): Promise<void> {
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  await this.cacheManager.eval(luaScript, 1, key, token);
}

  async deleteProduct(productId: number): Promise<void> {
    await this.cacheManager.del(this.getProductKey(productId));
  }

  // Product list caching
  async getProductList(filters: any): Promise<any> {
    return await this.cacheManager.get(this.getProductListKey(filters));
  }

  async setProductList(filters: any, products: any): Promise<void> {
    await this.cacheManager.set(
      this.getProductListKey(filters),
      products,
      this.PRODUCT_LIST_TTL * 1000,
    );
  }

  // Invalidate related caches
  async invalidateProductCaches(productId: number, userId: string, subCategoryId: number): Promise<void> {
    const keysToDelete = [
      this.getProductKey(productId),
      this.getProductStatsKey(productId),
      this.getUserProductsKey(userId),
      this.getSubCategoryProductsKey(subCategoryId),
    ];

    await Promise.all(keysToDelete.map(key => this.cacheManager.del(key)));
    
    // Invalidate all product lists (pattern-based deletion if supported)
    await this.invalidateProductLists();
  }

  async invalidateProductLists(): Promise<void> {
    // Note: This requires Redis SCAN for pattern-based deletion
    // For cache-manager, you might need to track list keys separately
    // or use Redis directly for pattern matching
    const store: any = this.cacheManager.store;
    if (store.keys) {
      const keys = await store.keys('product:list:*');
      if (keys.length > 0) {
        await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
      }
    }
  }

  async invalidateUserProducts(userId: string): Promise<void> {
    await this.cacheManager.del(this.getUserProductsKey(userId));
  }

  async invalidateSubCategoryProducts(subCategoryId: number): Promise<void> {
    await this.cacheManager.del(this.getSubCategoryProductsKey(subCategoryId));
  }

  // Bulk operations
  async setMultipleProducts(products: Array<{ id: number; data: any }>): Promise<void> {
    await Promise.all(
      products.map(({ id, data }) => this.setProduct(id, data)),
    );
  }

  async deleteMultipleProducts(productIds: number[]): Promise<void> {
    await Promise.all(productIds.map(id => this.deleteProduct(id)));
  }

  // Cache warming
  async warmCache(productIds: number[], productData: any[]): Promise<void> {
    await Promise.all(
      productIds.map((id, index) => this.setProduct(id, productData[index])),
    );
  }
}