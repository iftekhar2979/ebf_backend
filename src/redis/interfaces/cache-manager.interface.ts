export interface CacheOptions {
  ttl?: number; // Time-to-live in seconds
  refreshThreshold?: number; // Time in seconds before expiry where cache should be refreshed (Sliding Window)
}

/**
 * Interface for Enterprise Caching Layer.
 * Decouples business logic from specific cache implementations (Redis, In-Memory, etc.).
 */
export interface ICacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  del(key: string): Promise<void>;
  
  // Distributed Locking
  acquireLock(key: string, token: string, ttlSeconds?: number): Promise<boolean>;
  releaseLock(key: string, token: string): Promise<boolean>;
  
  // Advanced Counters
  increment(key: string, amount?: number): Promise<number>;
  decrement(key: string, amount?: number): Promise<number>;
  
  // Maintenance
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<void>;
  ping(): Promise<string>;
}
