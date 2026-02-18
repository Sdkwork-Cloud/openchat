import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { buildCacheKey, CacheTTL } from '../decorators/cache.decorator';

export interface CacheOptions {
  ttl?: number;
  refresh?: boolean;
  prefix?: string;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private localCache: Map<string, { value: any; expireAt: number }> = new Map();
  private readonly localCacheMaxSize: number = 1000;
  private readonly localCacheDefaultTTL: number = 60;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupLocalCache();
    }, 60000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const localValue = this.getFromLocalCache<T>(key);
    if (localValue !== null) {
      return localValue;
    }

    try {
      const redisValue = await this.redisService.get(key);
      if (redisValue) {
        const parsed = JSON.parse(redisValue) as T;
        this.setLocalCache(key, parsed, this.localCacheDefaultTTL);
        return parsed;
      }
    } catch (error) {
      this.logger.error(`Failed to get from Redis: ${key}`, error);
    }

    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || CacheTTL.MEDIUM;

    this.setLocalCache(key, value, Math.min(ttl, this.localCacheDefaultTTL));

    try {
      await this.redisService.set(key, JSON.stringify(value), ttl);
    } catch (error) {
      this.logger.error(`Failed to set to Redis: ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    this.localCache.delete(key);

    try {
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete from Redis: ${key}`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = this.localCache.keys();
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }

    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Failed to delete pattern from Redis: ${pattern}`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      if (options?.refresh) {
        this.refreshInBackground(key, factory, options);
      }
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    const missingKeys: string[] = [];
    for (const key of keys) {
      const localValue = this.getFromLocalCache<T>(key);
      if (localValue !== null) {
        result.set(key, localValue);
      } else {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      try {
        const client = this.redisService.getClient();
        const values = await client.mget(...missingKeys);
        for (let i = 0; i < missingKeys.length; i++) {
          const value = values[i];
          if (value) {
            const parsed = JSON.parse(value) as T;
            result.set(missingKeys[i], parsed);
            this.setLocalCache(missingKeys[i], parsed, this.localCacheDefaultTTL);
          } else {
            result.set(missingKeys[i], null);
          }
        }
      } catch (error) {
        this.logger.error('Failed to mget from Redis', error);
        for (const key of missingKeys) {
          result.set(key, null);
        }
      }
    }

    return result;
  }

  async mset<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    const actualTTL = ttl || CacheTTL.MEDIUM;

    for (const [key, value] of entries) {
      this.setLocalCache(key, value, Math.min(actualTTL, this.localCacheDefaultTTL));
    }

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();
      for (const [key, value] of entries) {
        pipeline.setex(key, actualTTL, JSON.stringify(value));
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to mset to Redis', error);
    }
  }

  async incr(key: string, delta: number = 1): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const result = await client.incrby(key, delta);
      return result;
    } catch (error) {
      this.logger.error(`Failed to incr: ${key}`, error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to expire: ${key}`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.localCache.has(key)) {
      const entry = this.localCache.get(key);
      if (entry && entry.expireAt > Date.now()) {
        return true;
      }
    }

    try {
      return await this.redisService.exists(key);
    } catch (error) {
      this.logger.error(`Failed to check exists: ${key}`, error);
      return false;
    }
  }

  private getFromLocalCache<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (entry && entry.expireAt > Date.now()) {
      return entry.value as T;
    }
    if (entry) {
      this.localCache.delete(key);
    }
    return null;
  }

  private setLocalCache<T>(key: string, value: T, ttl: number): void {
    if (this.localCache.size >= this.localCacheMaxSize) {
      const oldestKey = this.localCache.keys().next().value;
      if (oldestKey) {
        this.localCache.delete(oldestKey);
      }
    }

    this.localCache.set(key, {
      value,
      expireAt: Date.now() + ttl * 1000,
    });
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expireAt <= now) {
        this.localCache.delete(key);
      }
    }
  }

  private refreshInBackground<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): void {
    factory()
      .then(value => this.set(key, value, options))
      .catch(error => this.logger.error(`Failed to refresh cache: ${key}`, error));
  }
}
