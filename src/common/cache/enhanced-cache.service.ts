/**
 * 增强型缓存服务
 * 提供多级缓存、缓存预热、缓存统计等功能
 *
 * @framework
 */

import { Injectable, Logger, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  /** 数据 */
  data: T;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt?: number;
  /** 访问次数 */
  accessCount: number;
  /** 最后访问时间 */
  lastAccessedAt: number;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 缓存键前缀 */
  prefix?: string;
  /** 是否缓存 null 值 */
  cacheNull?: boolean;
  /** 缓存组（用于批量清除） */
  group?: string;
  /** 序列化器 */
  serializer?: (value: any) => string;
  /** 反序列化器 */
  deserializer?: (value: string) => any;
  /** 是否启用本地缓存 */
  enableLocalCache?: boolean;
  /** 本地缓存过期时间（秒） */
  localTtl?: number;
}

/**
 * 缓存统计
 */
export interface CacheStats {
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 设置次数 */
  sets: number;
  /** 删除次数 */
  deletes: number;
  /** 命中率 */
  hitRate: number;
  /** 本地缓存大小 */
  localCacheSize: number;
}

/**
 * 本地缓存条目
 */
interface LocalCacheEntry<T> extends CacheEntry<T> {
  /** 定时器 */
  timeout?: NodeJS.Timeout;
}

/**
 * 增强型缓存服务
 */
@Injectable()
export class EnhancedCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(EnhancedCacheService.name);
  private readonly redisClient: Redis;
  private readonly localCache: Map<string, LocalCacheEntry<any>> = new Map();
  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    localCacheSize: 0,
  };
  private readonly defaultTtl: number;
  private readonly enableLocalCache: boolean;
  private readonly localTtl: number;
  private readonly maxLocalCacheSize: number;
  private readonly ownsRedisClient: boolean;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() @Inject(REDIS_CLIENT) redisClient?: Redis,
  ) {
    this.ownsRedisClient = !redisClient;
    this.redisClient = redisClient || this.createDefaultRedisClient();
    this.defaultTtl = this.configService?.get<number>('CACHE_TTL', 300) || 300;
    this.enableLocalCache = this.configService?.get<boolean>('ENABLE_LOCAL_CACHE', true) ?? true;
    this.localTtl = this.configService?.get<number>('LOCAL_CACHE_TTL', 60) || 60;
    this.maxLocalCacheSize = this.configService?.get<number>('MAX_LOCAL_CACHE_SIZE', 1000) || 1000;
  }

  private createDefaultRedisClient(): Redis {
    this.logger.warn('Creating fallback Redis client - consider injecting REDIS_CLIENT');
    const client = new Redis({
      host: this.configService?.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService?.get<number>('REDIS_PORT', 6379),
      password: this.configService?.get<string>('REDIS_PASSWORD') || undefined,
      db: this.configService?.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      keepAlive: 10000,
      connectTimeout: 10000,
      enableReadyCheck: true,
    });

    client.on('error', (err) => {
      if (!err.message.includes('ECONNRESET')) {
        this.logger.error('Redis client error:', err.message);
      }
    });

    return client;
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix);

    if (this.enableLocalCache && options?.enableLocalCache !== false) {
      const localEntry = this.localCache.get(fullKey);
      if (localEntry && (!localEntry.expiresAt || Date.now() < localEntry.expiresAt)) {
        localEntry.accessCount++;
        localEntry.lastAccessedAt = Date.now();
        this.stats.hits++;
        this.updateHitRate();
        return localEntry.data;
      }
    }

    try {
      const value = await this.redisClient.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const entry = JSON.parse(value) as CacheEntry<T>;
      this.stats.hits++;
      this.updateHitRate();

      if (this.enableLocalCache && options?.enableLocalCache !== false) {
        this.setLocalCache(fullKey, entry.data, options);
      }

      return entry.data;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${fullKey}:`, error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<void> {
    if (value === null && options?.cacheNull !== true) {
      return;
    }

    const fullKey = this.buildKey(key, options?.prefix);
    const ttl = options?.ttl ?? this.defaultTtl;

    const entry: CacheEntry<T> = {
      data: value,
      createdAt: Date.now(),
      expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : undefined,
      accessCount: 0,
      lastAccessedAt: Date.now(),
    };

    try {
      await this.redisClient.setex(fullKey, ttl, JSON.stringify(entry));
      this.stats.sets++;

      if (this.enableLocalCache && options?.enableLocalCache !== false) {
        this.setLocalCache(fullKey, value, options);
      }

      if (options?.group) {
        await this.addToGroup(fullKey, options.group);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key ${fullKey}:`, error);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string, options?: { prefix?: string }): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix);

    try {
      await this.redisClient.del(fullKey);
      this.stats.deletes++;

      if (this.enableLocalCache) {
        const entry = this.localCache.get(fullKey);
        if (entry?.timeout) {
          clearTimeout(entry.timeout);
        }
        this.localCache.delete(fullKey);
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${fullKey}:`, error);
    }
  }

  /**
   * 批量删除缓存组
   */
  async delGroup(group: string): Promise<void> {
    const groupKey = `cache:group:${group}`;
    const keys = await this.redisClient.smembers(groupKey);

    if (keys.length > 0) {
      await this.redisClient.del(...keys);
      await this.redisClient.del(groupKey);

      for (const key of keys) {
        const entry = this.localCache.get(key);
        if (entry?.timeout) {
          clearTimeout(entry.timeout);
        }
        this.localCache.delete(key);
      }

      this.stats.deletes += keys.length;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string, options?: { prefix?: string }): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix);

    if (this.enableLocalCache) {
      const entry = this.localCache.get(fullKey);
      if (entry && (!entry.expiresAt || Date.now() < entry.expiresAt)) {
        return true;
      }
    }

    const exists = await this.redisClient.exists(fullKey);
    return exists === 1;
  }

  /**
   * 获取或设置缓存
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    const lockKey = `lock:${key}`;
    const acquired = await this.acquireLock(lockKey);

    if (acquired) {
      try {
        const doubleCheck = await this.get<T>(key, options);
        if (doubleCheck !== null) {
          return doubleCheck;
        }

        const value = await factory();
        await this.set(key, value, options);
        return value;
      } finally {
        await this.releaseLock(lockKey);
      }
    } else {
      await this.sleep(100);
      return this.getOrSet(key, factory, options);
    }
  }

  /**
   * 预热缓存
   */
  async warmup<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions & { refreshInterval?: number },
  ): Promise<void> {
    const warmup = async () => {
      try {
        const value = await factory();
        await this.set(key, value, options);
        this.logger.debug(`Cache warmed up: ${key}`);
      } catch (error) {
        this.logger.error(`Failed to warmup cache ${key}:`, error);
      }
    };

    await warmup();

    if (options?.refreshInterval) {
      setInterval(warmup, options.refreshInterval * 1000).unref();
    }
  }

  /**
   * 批量获取缓存
   */
  async mget<T>(keys: string[], options?: { prefix?: string }): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => this.buildKey(key, options?.prefix));

    const values = await this.redisClient.mget(fullKeys);

    return values.map((value, index) => {
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      const entry = JSON.parse(value) as CacheEntry<T>;

      if (this.enableLocalCache) {
        this.setLocalCache(fullKeys[index], entry.data, options);
      }

      return entry.data;
    });
  }

  /**
   * 批量设置缓存
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
    options?: { prefix?: string; group?: string },
  ): Promise<void> {
    const pipeline = this.redisClient.pipeline();

    for (const entry of entries) {
      const fullKey = this.buildKey(entry.key, options?.prefix);
      const ttl = entry.ttl ?? this.defaultTtl;

      const cacheEntry: CacheEntry<T> = {
        data: entry.value,
        createdAt: Date.now(),
        expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : undefined,
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };

      pipeline.setex(fullKey, ttl, JSON.stringify(cacheEntry));
      this.stats.sets++;

      if (options?.group) {
        this.addToGroup(fullKey, options.group);
      }
    }

    await pipeline.exec();

    if (this.enableLocalCache) {
      for (const entry of entries) {
        const fullKey = this.buildKey(entry.key, options?.prefix);
        this.setLocalCache(fullKey, entry.value, { ...options, ttl: entry.ttl });
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    this.stats.localCacheSize = this.localCache.size;
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    Object.assign(this.stats, {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      localCacheSize: 0,
    });
  }

  /**
   * 清除所有缓存
   */
  async clear(prefix?: string): Promise<void> {
    if (prefix) {
      const keys = await this.redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.stats.deletes += keys.length;
      }
    } else {
      await this.redisClient.flushdb();
    }

    for (const [, entry] of this.localCache.entries()) {
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
    }
    this.localCache.clear();
  }

  /**
   * 模块销毁
   */
  onModuleDestroy() {
    for (const [, entry] of this.localCache.entries()) {
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
    }
    this.localCache.clear();

    if (this.ownsRedisClient) {
      this.redisClient.quit();
    }
  }

  /**
   * 构建缓存键
   */
  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}:${key}`;
    }
    return `cache:${key}`;
  }

  /**
   * 设置本地缓存
   */
  private setLocalCache<T>(key: string, value: T, options?: CacheOptions): void {
    if (this.localCache.size >= this.maxLocalCacheSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        const entry = this.localCache.get(oldestKey);
        if (entry?.timeout) {
          clearTimeout(entry.timeout);
        }
        this.localCache.delete(oldestKey);
      }
    }

    const ttl = options?.localTtl ?? this.localTtl;
    const timeout = ttl > 0
      ? setTimeout(() => {
          this.localCache.delete(key);
        }, ttl * 1000)
      : undefined;

    this.localCache.set(key, {
      data: value,
      createdAt: Date.now(),
      expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : undefined,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      timeout,
    });
  }

  /**
   * 查找最久未使用的条目
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.localCache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * 添加到缓存组
   */
  private async addToGroup(key: string, group: string): Promise<void> {
    const groupKey = `cache:group:${group}`;
    await this.redisClient.sadd(groupKey, key);
    await this.redisClient.expire(groupKey, 86400 * 7);
  }

  /**
   * 获取锁
   */
  private async acquireLock(key: string, ttlMs: number = 5000): Promise<boolean> {
    const result = await this.redisClient.set(key, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /**
   * 释放锁
   */
  private async releaseLock(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
