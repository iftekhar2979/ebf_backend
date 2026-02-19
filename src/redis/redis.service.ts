// src/redis/redis.service.ts

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import { createClient } from "redis";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";

export type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class RedisService implements OnModuleInit {
  private client = createClient({
    socket: {
      host: this._configService.get<string>("REDIS_HOST"),
      port: this._configService.get<number>("REDIS_PORT"),
    },
  });

  constructor(
    @Inject(CACHE_MANAGER) private _cacheManager: Cache,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _configService: ConfigService
  ) {}

  async onModuleInit() {
    console.log("Redis are Connecting...");
    if (!this.client.isOpen) {
      await this.client.connect();
      console.log("Redis are Connected Successfully...");
    }
  }

  // ========== Basic Operations (using cache-manager) ==========
  
  async setCache(key: string, value: string): Promise<void> {
    await this._cacheManager.set(key, value);
  }

  async getCache(key: string): Promise<string | undefined> {
    return await this._cacheManager.get(key);
  }

  async delCache(key: string): Promise<void> {
    await this._cacheManager.del(key);
  }

  async invalidCacheList(keys: string[]): Promise<void> {
    this._logger.log("Cache Invalidated", keys);
    for (const key of keys) {
      await this._cacheManager.del(key);
    }
  }

  async setCacheWithTTL(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this._cacheManager.set(key, value, ttlSeconds);
    this._logger.debug(`Set key "${key}" with TTL ${ttlSeconds}s`);
  }

  async exists(key: string): Promise<boolean> {
    const val = await this._cacheManager.get(key);
    return val !== undefined && val !== null;
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const redis = (this._cacheManager as any).store.getClient();
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(keys);
      this._logger.debug(`Invalidated keys matching pattern: ${pattern}`);
    }
  }

  // ========== Advanced Redis Operations (direct client) ==========

  /**
   * Set a value with options (NX, EX, etc.)
   * @param key Redis key
   * @param value Value to store
   * @param options Redis SET options (NX, EX, etc.)
   */

  async zadd(key:string, score:number, value:string): Promise<void> {
    try {
      await this.client.zAdd(key, { score, value });  
    }catch (error) {
      this._logger.error(`Failed to zAdd to key ${key}:`, error);
      throw error;
    } 
  }

  async zrange(key:string, start:number, stop:number): Promise<string[]> {
    try {
      return await this.client.zRange(key, start, stop);
    }catch (error) {
      this._logger.error(`Failed to zRange key ${key}:`, error);
      throw error;
    }
  }

 
    async zincrby(key:string, increment:number, value:string): Promise<void> {
      try {
        await this.client.zIncrBy(key, increment, value); 
      }catch (error) {  
        this._logger.error(`Failed to zIncrBy key ${key}:`, error);
        throw error;
      }}

      async zdel(key:string, value:string): Promise<void> { 
        try{
          await this.client.zRem(key, value);
        }catch(error) {
          this._logger.error(`Failed to zRem from key ${key}:`, error);
          throw error;
        }
      }

      async zRemoveRangeByScore(key:string, min:number, max:number): Promise<void> {
        try {
          await this.client.zRemRangeByScore(key, min, max);  
        }catch (error) {  
          this._logger.error(`Failed to zRemRangeByScore key ${key}:`, error);
          throw error;  
        }}
        async zRevRank(key:string, value:string): Promise<number | null> {
          try {
            return await this.client.zRevRank(key, value);
          }catch (error) {
            this._logger.error(`Failed to zRevRank key ${key}:`, error);
            throw error;
          }}
          
  async setWithOptions(
    key: string, 
    value: string, 
    options?: {
      NX?: boolean;
      EX?: number;
      PX?: number;
    }
  ): Promise<string | null> {
    try {
      const args: any[] = [key, value];
      
      if (options?.NX) args.push('NX');
      if (options?.EX) args.push('EX', options.EX);
      if (options?.PX) args.push('PX', options.PX);
      
      const result = await this.client.set(key, value, options as any);
      return result;
    } catch (error) {
      this._logger.error(`Failed to set key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value using direct Redis client
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this._logger.error(`Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a value with TTL using direct Redis client
   */
  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.setEx(key, ttlSeconds, value);
      this._logger.debug(`Set key "${key}" with TTL ${ttlSeconds}s`);
    } catch (error) {
      this._logger.error(`Failed to setEx key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<number> {
    try {
      return await this.client.del(keys);
    } catch (error) {
      this._logger.error(`Failed to delete keys:`, error);
      throw error;
    }
  }

  /**
   * Execute a Lua script
   */
  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    try {
      return await this.client.eval(script, {
        keys,
        arguments: args,
      });
    } catch (error) {
      this._logger.error(`Failed to execute Lua script:`, error);
      throw error;
    }
  }

  /**
   * Scan for keys matching a pattern
   */
  async scanKeys(pattern: string): Promise<string[]> {
    try {
      const keys: string[] = [];
      for await (const key of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(key);
      }
      return keys;
    } catch (error) {
      this._logger.error(`Failed to scan keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Delete keys matching a pattern (using SCAN instead of KEYS for production safety)
   */
  async deleteByPatternSafe(pattern: string): Promise<number> {
    try {
      const keys = await this.scanKeys(pattern);
      if (keys.length === 0) return 0;
      
      const deleted = await this.del(...keys);
      this._logger.debug(`Deleted ${deleted} keys matching pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      this._logger.error(`Failed to delete by pattern ${pattern}:`, error);
      throw error;
    }
  }

  // ========== Lock Operations ==========

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    key: string,
    token: string,
    ttlSeconds = 5
  ): Promise<boolean> {
    try {
      const result = await this.client.set(key, token, {
        NX: true,
        EX: ttlSeconds,
      });
      return result === 'OK';
    } catch (error) {
      this._logger.error(`Failed to acquire lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Release a distributed lock (using Lua script for atomicity)
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.eval(luaScript, [key], [token]);
      return result === 1;
    } catch (error) {
      this._logger.error(`Failed to release lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Wait until lock is available
   */
  async waitForLock(
    key: string,
    retryDelay = 100,
    maxRetries = 10
  ): Promise<boolean> {
    let retries = 0;
    while (retries < maxRetries) {
      const exists = await this.client.exists(key);
      if (!exists) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retries++;
    }
    return false;
  }

  // ========== Counter Operations ==========

  async getLoginAttempts(key: string): Promise<number> {
    const value = await this.client.get(key);
    return value ? Number(value) : 0;
  }

  async incrementLoginAttempts(key: string): Promise<number> {
    const count = await this.client.incr(key);

    // Set TTL only on first failure
    if (count === 1) {
      await this.client.expire(key, 600); // 10 minutes
    }

    return count;
  }

  async resetLoginAttempts(key: string) {
    await this.client.del(key);
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this._logger.error(`Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment by a specific amount
   */
  async incrBy(key: string, amount: number): Promise<number> {
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      this._logger.error(`Failed to incrBy key ${key}:`, error);
      throw error;
    }
  }

  // ========== Utility Methods ==========

  /**
   * Get direct Redis client for advanced operations
   * Use sparingly - prefer abstracted methods
   */
  getClient(): RedisClient {
    this._logger.warn('Direct Redis client access - use abstracted methods when possible');
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.client.isOpen;
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<string> {
    return await this.client.ping();
  }
}