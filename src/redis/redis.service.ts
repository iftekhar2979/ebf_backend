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

    // Add password if needed:
    // password: process.env.REDIS_PASSWORD,
  });
  constructor(
    @Inject(CACHE_MANAGER) private _cacheManager: Cache, // Inject CacheManager
    @InjectLogger() private readonly _logger: Logger,
    private readonly _configService: ConfigService
  ) {}
  async onModuleInit() {
    console.log("Redis are Connecting...");
    if (!this.client.isOpen) {
      await this.client.connect();
      console.log("Redis are Connected Successfully...");
    }

    // this.redis.monitor((err, monitor) => {
    //   if (err) {
    //     console.error("Monitor error", err);
    //     return;
    //   }
    //   console.log("Redis MONITOR mode started");
    //   // monitor.on("monitor", (time, args, source, db) => {
    //   //   console.log(`[DB${db}] ${source}:`, args);
    //   // });
    // });
  }

  // Set a value in the Redis cache
  async setCache(key: string, value: string): Promise<void> {
    await this._cacheManager.set(key, value);
  }

  // Get a value from the Redis cache
  async getCache(key: string): Promise<string | undefined> {
    return await this._cacheManager.get(key);
  }

  // Delete a key from the Redis cache
  async delCache(key: string): Promise<void> {
    await this._cacheManager.del(key);
  }
  async invalidCacheList(keys: string[]): Promise<void> {
    this._logger.log("Cache Invalided", keys);
    for (const key of keys) {
      await this._cacheManager.del(key);
    }
  }
  // Set a value with TTL (in seconds)
  async setCacheWithTTL(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this._cacheManager.set(key, value, ttlSeconds);
    this._logger.debug(`Set key "${key}" with TTL ${ttlSeconds}s`);
  }
  async exists(key: string): Promise<boolean> {
    const val = await this._cacheManager.get(key);
    return val !== undefined && val !== null;
  }

  // ⚠️ Requires direct Redis client (not available by default in cache-manager)
  async deleteByPattern(pattern: string): Promise<void> {
    const redis = (this._cacheManager as any).store.getClient();
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(keys);
      this._logger.debug(`Invalidated keys matching pattern: ${pattern}`);
    }
  }

  getClient(): RedisClient {
    return this.client;
  }

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
}
