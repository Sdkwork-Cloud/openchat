import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface CacheOptions {
  ttl?: number;
  nullTtl?: number;
  lockTimeout?: number;
}

@Injectable()
export class CacheProtectionService {
  private readonly logger = new Logger(CacheProtectionService.name);
  private readonly NULL_VALUE = 'NULL_PLACEHOLDER';
  private readonly locks = new Map<string, Promise<any>>();

  constructor(private readonly redisService: RedisService) {}

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    options: CacheOptions = {},
  ): Promise<T | null> {
    const { ttl = 300, nullTtl = 60, lockTimeout = 5000 } = options;

    const cached = await this.redisService.get(key);
    if (cached !== null) {
      if (cached === this.NULL_VALUE) {
        return null;
      }
      try {
        return JSON.parse(cached) as T;
      } catch {
        return cached as unknown as T;
      }
    }

    return this.fetchWithLock(key, fetcher, ttl, nullTtl, lockTimeout);
  }

  private async fetchWithLock<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttl: number,
    nullTtl: number,
    lockTimeout: number,
  ): Promise<T | null> {
    const lockKey = `lock:${key}`;
    
    const existingLock = this.locks.get(key);
    if (existingLock) {
      return existingLock;
    }

    const lockPromise = this.executeWithLock(key, fetcher, ttl, nullTtl, lockTimeout);
    this.locks.set(key, lockPromise);

    try {
      const result = await lockPromise;
      return result;
    } finally {
      this.locks.delete(key);
    }
  }

  private async executeWithLock<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttl: number,
    nullTtl: number,
    lockTimeout: number,
  ): Promise<T | null> {
    const lockKey = `lock:${key}`;
    const lockAcquired = await this.redisService.acquireLock(lockKey, lockTimeout);

    if (!lockAcquired) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const cached = await this.redisService.get(key);
      if (cached !== null) {
        if (cached === this.NULL_VALUE) {
          return null;
        }
        try {
          return JSON.parse(cached) as T;
        } catch {
          return cached as unknown as T;
        }
      }
      return null;
    }

    try {
      const data = await fetcher();
      
      if (data === null || data === undefined) {
        await this.redisService.set(key, this.NULL_VALUE, nullTtl);
        return null;
      }

      const value = typeof data === 'string' ? data : JSON.stringify(data);
      await this.redisService.set(key, value, ttl);
      return data;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async getOrSetBatch<T>(
    keys: string[],
    fetcher: (missingKeys: string[]) => Promise<Map<string, T | null>>,
    options: CacheOptions = {},
  ): Promise<Map<string, T | null>> {
    const { ttl = 300, nullTtl = 60 } = options;
    const result = new Map<string, T | null>();
    const missingKeys: string[] = [];

    for (const key of keys) {
      const cached = await this.redisService.get(key);
      if (cached !== null) {
        if (cached === this.NULL_VALUE) {
          result.set(key, null);
        } else {
          try {
            result.set(key, JSON.parse(cached) as T);
          } catch {
            result.set(key, cached as unknown as T);
          }
        }
      } else {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      const fetched = await fetcher(missingKeys);
      
      for (const key of missingKeys) {
        const value = fetched.get(key);
        result.set(key, value || null);

        if (value === null || value === undefined) {
          await this.redisService.set(key, this.NULL_VALUE, nullTtl);
        } else {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          await this.redisService.set(key, serialized, ttl);
        }
      }
    }

    return result;
  }

  async invalidate(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const client = this.redisService.getClient();
    const keys = await client.keys(`openchat:${pattern}*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
