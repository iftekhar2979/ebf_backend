// src/redis/redis.service.ts

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import Redis from "ioredis";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";
import { CacheOptions, ICacheManager } from "./interfaces/cache-manager.interface";

@Injectable()
export class RedisService implements ICacheManager, OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(
    @Inject(CACHE_MANAGER) private _cacheManager: Cache,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _configService: ConfigService
  ) {
    this.client = new Redis({
      host: this._configService.get<string>("REDIS_HOST"),
      port: this._configService.get<number>("REDIS_PORT"),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  async onModuleInit() {
    this._logger.log("Initializing ioredis connection...",RedisService.name);
    this.client.on("connect", () => this._logger.log("Redis connected successfully.",RedisService.name));
    this.client.on("error", (err) => this._logger.log("Redis connection error:", RedisService.name));
  }

  async onModuleDestroy() {
    this._logger.info("Gracefully shutting down Redis connection...");
    await this.client.quit();
  }

  // ========== Basic Operations (using cache-manager) ==========

  async getCache(key: string): Promise<string | undefined> {
    return await this._cacheManager.get(key);
  }

  async setCache(key: string, value: string): Promise<void> {
    await this._cacheManager.set(key, value);
  }

  async delCache(key: string): Promise<void> {
    await this._cacheManager.del(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this._cacheManager.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || this._configService.get<number>("DEFAULT_CACHE_TTL") || 3600;
    await this._cacheManager.set(key, value, ttl);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    if (keys.length === 1) {
      await this._cacheManager.del(keys[0]);
    } else {
      await this.client.del(...keys);
    }
  }

  async invalidCacheList(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this._cacheManager.del(key);
    }
  }

  async setCacheWithTTL(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this._cacheManager.set(key, value, ttlSeconds);
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.client.exists(key);
    return res > 0;
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length) {
      await this.client.del(keys);
    }
  }

  // ========== Advanced Redis Operations (direct client) ==========

  async zadd(key: string, score: number, value: string): Promise<void> {
    await this.client.zadd(key, score, value);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zrange(key, start, stop);
  }

  async zRevRangeWithPagination(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zrevrangebyscore(key, stop, start);
  }

  async zincrby(key: string, increment: number, value: string): Promise<void> {
    await this.client.zincrby(key, increment, value);
  }

  async zdel(key: string, value: string): Promise<void> {
    await this.client.zrem(key, value);
  }

  async zRemoveRangeByScore(key: string, min: number, max: number): Promise<void> {
    await this.client.zremrangebyscore(key, min, max);
  }

  async zRevRank(key: string, value: string): Promise<number | null> {
    return await this.client.zrevrank(key, value);
  }

  async delPattern(pattern: string): Promise<void> {
    await this.deleteByPatternSafe(pattern);
  }

  async setWithOptions(key: string, value: string, options?: any): Promise<string | null> {
    // ioredis set signature: set(key, value, [option, [option_value]], [NX|XX])
    const args: any[] = [key, value];
    if (options?.EX) args.push("EX", options.EX);
    if (options?.PX) args.push("PX", options.PX);
    if (options?.NX) args.push("NX");
    if (options?.XX) args.push("XX");
    return await (this.client as any).set(...args);
  }

  async getRaw(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, value);
  }

  async delRaw(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    return await this.client.eval(script, keys.length, ...keys, ...args);
  }

  async scanKeys(pattern: string): Promise<string[]> {
    let cursor = "0";
    let allKeys: string[] = [];
    do {
      const [newCursor, keys] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = newCursor;
      allKeys = allKeys.concat(keys);
    } while (cursor !== "0");
    return allKeys;
  }

  async deleteByPatternSafe(pattern: string): Promise<number> {
    const keys = await this.scanKeys(pattern);
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  // ========== Lock Operations ==========

  async acquireLock(key: string, token: string, ttlSeconds = 5): Promise<boolean> {
    const result = await this.client.set(key, token, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.client.eval(script, 1, key, token);
    return result === 1;
  }

  async waitForLock(key: string, retryDelay = 100, maxRetries = 10): Promise<boolean> {
    let retries = 0;
    while (retries < maxRetries) {
      const exists = await this.client.exists(key);
      if (exists === 0) return true; 
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retries++;
    }
    return false;
  }

  // ========== Counter Operations ==========

  async increment(key: string, amount = 1): Promise<number> {
    return await this.client.incrby(key, amount);
  }

  async decrement(key: string, amount = 1): Promise<number> {
    return await this.client.decrby(key, amount);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return await this.client.incrby(key, amount);
  }

  // ========== Utility Methods ==========

  getClient(): Redis {
    return this.client;
  }

  isConnected(): boolean {
    return this.client.status === "ready";
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      await this.deleteByPatternSafe(pattern);
    } else {
      await this.client.flushdb();
    }
  }
}
