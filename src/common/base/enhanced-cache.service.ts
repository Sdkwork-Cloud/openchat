/**
 * 增强型缓存服务
 * 
 * 提供多级缓存、缓存链、分布式锁等高级功能
 * 支持本地缓存 + Redis 缓存的两级缓存架构
 * 
 * @framework
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 缓存条目接口
 */
export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expireAt: number;
  accessCount: number;
  lastAccessAt: number;
  tags?: string[];
  version?: number;
}

/**
 * 缓存配置选项
 */
export interface EnhancedCacheOptions {
  /** 前缀 */
  prefix?: string;
  /** 默认 TTL（秒） */
  defaultTTL?: number;
  /** 最大本地缓存条目数 */
  maxLocalEntries?: number;
  /** 是否启用多级缓存 */
  enableMultiLevel?: boolean;
  /** 是否启用缓存预热 */
  enableWarmup?: boolean;
  /** 是否启用缓存保护 */
  enableProtection?: boolean;
  /** 缓存穿透保护阈值 */
  penetrationThreshold?: number;
  /** 缓存雪崩保护 jitter */
  snowballJitter?: number;
  /** 是否启用统计 */
  enableStats?: boolean;
  /** 是否启用事件通知 */
  enableEvents?: boolean;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  localEntries: number;
  memoryUsage?: number;
}

/**
 * 缓存事件
 */
export interface CacheEvent<T> {
  key: string;
  value?: T;
  timestamp: number;
  source: 'local' | 'redis' | 'external';
}

/**
 * 批量缓存操作结果
 */
export interface BatchCacheResult<T> {
  results: Map<string, T | null>;
  fromLocal: number;
  fromRedis: number;
  misses: number;
}

/**
 * 增强型缓存服务
 */
@Injectable()
export class EnhancedCacheService implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(EnhancedCacheService.name);
  
  private localCache: Map<string, CacheEntry<any>> = new Map();
  private options: Required<EnhancedCacheOptions>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0,
    localEntries: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;
  private statsInterval?: NodeJS.Timeout;
  private readonly pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(
    protected readonly redisService: RedisService,
    protected readonly configService: ConfigService,
    protected readonly eventEmitter: EventEmitter2,
  ) {
    this.options = {
      prefix: this.configService.get<string>('CACHE_PREFIX', 'cache'),
      defaultTTL: this.configService.get<number>('CACHE_DEFAULT_TTL', 300),
      maxLocalEntries: this.configService.get<number>('CACHE_MAX_LOCAL_ENTRIES', 10000),
      enableMultiLevel: this.configService.get<boolean>('CACHE_ENABLE_MULTI_LEVEL', true),
      enableWarmup: this.configService.get<boolean>('CACHE_ENABLE_WARMUP', false),
      enableProtection: this.configService.get<boolean>('CACHE_ENABLE_PROTECTION', true),
      penetrationThreshold: this.configService.get<number>('CACHE_PENETRATION_THRESHOLD', 100),
      snowballJitter: this.configService.get<number>('CACHE_SNOWBALL_JITTER', 300),
      enableStats: this.configService.get<boolean>('CACHE_ENABLE_STATS', true),
      enableEvents: this.configService.get<boolean>('CACHE_ENABLE_EVENTS', true),
    };
  }

  onModuleInit() {
    this.startCleanupInterval();
    if (this.options.enableStats) {
      this.startStatsInterval();
    }
    this.logger.log(`EnhancedCacheService initialized with prefix: ${this.options.prefix}`);
  }

  onModuleDestroy() {
    this.clearIntervals();
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string, options?: { useLocalOnly?: boolean; skipLocal?: boolean }): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const startTime = Date.now();

    try {
      // 尝试本地缓存
      if (!options?.skipLocal && this.options.enableMultiLevel) {
        const localValue = this.getFromLocalCache<T>(fullKey);
        if (localValue !== null) {
          this.recordHit();
          this.emitEvent('hit', { key, value: localValue, timestamp: startTime, source: 'local' });
          return localValue;
        }
      }

      // 尝试 Redis
      if (!options?.useLocalOnly) {
        const redisValue = await this.getFromRedis<T>(fullKey);
        if (redisValue !== null) {
          // 回填本地缓存
          if (!options?.skipLocal && this.options.enableMultiLevel) {
            this.setLocalCache(fullKey, redisValue, this.options.defaultTTL);
          }
          this.recordHit();
          this.emitEvent('hit', { key, value: redisValue, timestamp: startTime, source: 'redis' });
          return redisValue;
        }
      }

      // 缓存未命中
      this.recordMiss();
      this.emitEvent('miss', { key, timestamp: startTime, source: 'local' });
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.recordMiss();
      return null;
    }
  }

  /**
   * 获取或设置缓存（防止缓存击穿）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: EnhancedCacheOptions & { refresh?: boolean },
  ): Promise<T> {
    const fullKey = this.buildKey(key);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ttl = options?.defaultTTL ?? this.options.defaultTTL;

    // 检查现有缓存
    if (!options?.refresh) {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // 使用请求合并防止缓存击穿
    const pendingKey = `pending:${fullKey}`;
    const existingPending = this.pendingRequests.get(pendingKey);
    
    if (existingPending) {
      this.logger.debug(`Request合并 for key: ${key}`);
      return existingPending;
    }

    try {
      const factoryPromise = factory().then(async (value) => {
        await this.set(key, value, options);
        return value;
      });

      this.pendingRequests.set(pendingKey, factoryPromise);
      return await factoryPromise;
    } finally {
      this.pendingRequests.delete(pendingKey);
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(
    key: string,
    value: T,
    options?: EnhancedCacheOptions & { tags?: string[] },
  ): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = this.calculateTTL(options?.defaultTTL ?? this.options.defaultTTL);
    const startTime = Date.now();

    try {
      // 设置本地缓存
      if (this.options.enableMultiLevel) {
        this.setLocalCache(fullKey, value, ttl, options?.tags);
      }

      // 设置 Redis 缓存
      await this.setToRedis(fullKey, value, ttl);

      this.recordSet();
      this.emitEvent('set', { key, value, timestamp: startTime, source: 'local' });
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * 批量获取缓存
   */
  async mget<T>(keys: string[]): Promise<BatchCacheResult<T>> {
    const result: BatchCacheResult<T> = {
      results: new Map(),
      fromLocal: 0,
      fromRedis: 0,
      misses: 0,
    };

    const missingKeys: string[] = [];

    // 先尝试本地缓存
    for (const key of keys) {
      const fullKey = this.buildKey(key);
      const localValue = this.getFromLocalCache<T>(fullKey);
      
      if (localValue !== null) {
        result.results.set(key, localValue);
        result.fromLocal++;
      } else {
        missingKeys.push(key);
      }
    }

    // 从 Redis 获取缺失的
    if (missingKeys.length > 0) {
      const fullKeys = missingKeys.map(k => this.buildKey(k));
      const redisValues = await this.redisService.getClient().mget(...fullKeys);

      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i];
        const redisValue = redisValues[i];

        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T;
          result.results.set(key, parsed);
          result.fromRedis++;
          
          // 回填本地缓存
          if (this.options.enableMultiLevel) {
            this.setLocalCache(this.buildKey(key), parsed, this.options.defaultTTL);
          }
        } else {
          result.results.set(key, null);
          result.misses++;
        }
      }
    }

    return result;
  }

  /**
   * 批量设置缓存
   */
  async mset<T>(
    entries: Map<string, T>,
    options?: EnhancedCacheOptions,
  ): Promise<void> {
    const ttl = this.calculateTTL(options?.defaultTTL ?? this.options.defaultTTL);
    const startTime = Date.now();

    try {
      // 设置本地缓存
      if (this.options.enableMultiLevel) {
        for (const [key, value] of entries) {
          this.setLocalCache(this.buildKey(key), value, ttl);
        }
      }

      // 批量设置 Redis
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      for (const [key, value] of entries) {
        const fullKey = this.buildKey(key);
        pipeline.setex(fullKey, ttl, JSON.stringify(value));
      }

      await pipeline.exec();
      this.recordSet();
      this.emitEvent('mset', { key: 'batch', timestamp: startTime, source: 'local' });
    } catch (error) {
      this.logger.error('Cache mset error:', error);
      throw error;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string | string[], _options?: { pattern?: boolean }): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let deletedCount = 0;

    try {
      for (const k of keys) {
        const fullKey = this.buildKey(k);
        
        // 删除本地缓存
        if (this.localCache.delete(fullKey)) {
          deletedCount++;
        }

        // 删除 Redis 缓存
        await this.redisService.del(fullKey);
        deletedCount++;
      }

      this.recordDelete();
      this.emitEvent('delete', { key: 'batch', timestamp: Date.now(), source: 'local' });

      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache delete error:`, error);
      throw error;
    }
  }

  /**
   * 按标签删除缓存
   */
  async deleteByTag(tag: string): Promise<number> {
    let deletedCount = 0;

    // 删除本地缓存中带标签的条目
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.localCache.delete(key);
        deletedCount++;
      }
    }

    // TODO: Redis 中按标签删除需要使用 Set 结构存储标签映射

    this.emitEvent('deleteByTag', { key: `tag:${tag}`, timestamp: Date.now(), source: 'local' });
    return deletedCount;
  }

  /**
   * 删除匹配模式的缓存
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = `${this.options.prefix}:${pattern}`;
      const client = this.redisService.getClient();
      const keys = await client.keys(fullPattern);

      if (keys.length > 0) {
        await client.del(...keys);
        
        // 清理本地缓存中匹配的条目
        for (const [key] of this.localCache.entries()) {
          if (key.includes(pattern)) {
            this.localCache.delete(key);
          }
        }

        this.logger.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        return keys.length;
      }

      return 0;
    } catch (error) {
      this.logger.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    // 检查本地缓存
    if (this.localCache.has(fullKey)) {
      const entry = this.localCache.get(fullKey);
      if (entry && entry.expireAt > Date.now()) {
        return true;
      }
    }

    // 检查 Redis
    return this.redisService.exists(fullKey);
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    this.stats.localEntries = this.localCache.size;

    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      localEntries: 0,
    };
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.localCache.clear();
    await this.deletePattern('*');
    this.logger.log('Cache cleared');
  }

  /**
   * 构建缓存键
   */
  protected buildKey(key: string): string {
    return `${this.options.prefix}:${key}`;
  }

  /**
   * 计算带 jitter 的 TTL
   */
  protected calculateTTL(baseTTL: number): number {
    if (this.options.snowballJitter > 0) {
      const jitter = Math.floor(Math.random() * this.options.snowballJitter);
      return baseTTL + jitter;
    }
    return baseTTL;
  }

  /**
   * 从本地缓存获取
   */
  private getFromLocalCache<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    
    if (!entry) return null;
    
    if (entry.expireAt <= Date.now()) {
      this.localCache.delete(key);
      this.stats.evictions++;
      return null;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessAt = Date.now();

    return entry.value as T;
  }

  /**
   * 设置本地缓存
   */
  private setLocalCache<T>(
    key: string,
    value: T,
    ttl: number,
    tags?: string[],
  ): void {
    // LRU 淘汰
    if (this.localCache.size >= this.options.maxLocalEntries) {
      this.evictLRU();
    }

    this.localCache.set(key, {
      value,
      createdAt: Date.now(),
      expireAt: Date.now() + ttl * 1000,
      accessCount: 0,
      lastAccessAt: Date.now(),
      tags,
      version: 1,
    });
  }

  /**
   * LRU 淘汰
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.localCache.entries()) {
      if (entry.lastAccessAt < oldestTime) {
        oldestTime = entry.lastAccessAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.localCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 从 Redis 获取
   */
  private async getFromRedis<T>(key: string): Promise<T | null> {
    const value = await this.redisService.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  /**
   * 设置到 Redis
   */
  private async setToRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.redisService.set(key, JSON.stringify(value), ttl);
  }

  /**
   * 记录命中
   */
  private recordHit(): void {
    if (this.options.enableStats) {
      this.stats.hits++;
    }
  }

  /**
   * 记录未命中
   */
  private recordMiss(): void {
    if (this.options.enableStats) {
      this.stats.misses++;
    }
  }

  /**
   * 记录设置
   */
  private recordSet(): void {
    if (this.options.enableStats) {
      this.stats.sets++;
    }
  }

  /**
   * 记录删除
   */
  private recordDelete(): void {
    if (this.options.enableStats) {
      this.stats.deletes++;
    }
  }

  /**
   * 发射缓存事件
   */
  private emitEvent<T>(event: string, data: CacheEvent<T>): void {
    if (this.options.enableEvents) {
      this.eventEmitter.emit(`cache.${event}`, data);
    }
  }

  /**
   * 启动清理间隔
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocalCache();
    }, 60000);
  }

  /**
   * 启动统计间隔
   */
  private startStatsInterval(): void {
    this.statsInterval = setInterval(() => {
      const stats = this.getStats();
      this.logger.debug(`Cache stats: hits=${stats.hits}, misses=${stats.misses}, hitRate=${stats.hitRate.toFixed(2)}%`);
    }, 300000);
  }

  /**
   * 清理过期本地缓存
   */
  private cleanupExpiredLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expireAt <= now) {
        this.localCache.delete(key);
        this.stats.evictions++;
      }
    }
  }

  /**
   * 清除定时器
   */
  private clearIntervals(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }
}
