export interface ProductCreatedJob {
  productId: number;
  userId: string;
  subCategoryId: number;
}

export interface ProductStatsUpdateJob {
  productId: number;
  incrementViews?: boolean;
  incrementWishlists?: boolean;
  incrementCarts?: boolean;
}

export interface IncrementViewsJob {
  productId: number;
}

export interface IncrementCartsJob {
  productId: number;
  userId: number;
  quantity: number;
}

export interface IncrementOrdersJob {
  productId: number;
  userId: number;
  quantity: number;
}

export interface SyncRedisStatsJob {
  productIds?: number[];
}

export interface CacheWarmingJob {
  productIds: number[];
}

export interface ImageProcessingJob {
  productId: number;
  imageUrls: string[];
}

export enum PRODUCT_PROCESSORS {
  PROCESSOR = "product-queue",
  PRODUCT_CREATION = "product-created",
  INCREAMENT_PRODUCT_VIEWS = "increment-views",
  INCREMENT_CARTS = "increment-carts",
  INCREMENT_ORDERS = "increment-orders",
  SYNC_REDIS_STATISTICS_TO_DB = "sync-redis-stats-to-db",
  UPDATE_PRODUCT_STATISTICS = "update-product-stats",
  CACHE_WARMING = "cache-warming",
  IMAGE_PROCESSING = "process-images",
  INVALID_CACHE = "invalidate-cache",
}
