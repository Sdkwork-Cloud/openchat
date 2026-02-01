import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { User } from '../../modules/user/user.entity';

/**
   * 用户缓存服务
   * 提供多级缓存策略：L1 本地内存 + L2 Redis
   * 用于缓存用户信息，减少数据库查询压力
   */
@Injectable()
export class UserCacheService {
  private readonly logger = new Logger(UserCacheService.name);

  // 本地内存缓存（L1）
  private localCache = new Map<string, { user: User; expireAt: number; lastAccessTime: number }>();

  // 缓存配置
  private readonly LOCAL_CACHE_TTL = 60 * 1000; // 本地缓存 60 秒
  private readonly REDIS_CACHE_TTL = 300; // Redis 缓存 5 分钟
  private readonly MAX_LOCAL_CACHE_SIZE = 10000; // 本地缓存最大条目数
  private readonly CLEANUP_INTERVAL = 60000; // 清理间隔 60 秒
  private readonly CLEANUP_BATCH_SIZE = 100; // 每次清理的批处理大小

  // 缓存键前缀
  private readonly REDIS_KEY_PREFIX = 'user:cache:';
  private readonly REDIS_BATCH_KEY_PREFIX = 'user:batch:';

  // 缓存统计
  private cacheStats = {
    localCacheHits: 0,
    localCacheMisses: 0,
    redisCacheHits: 0,
    redisCacheMisses: 0,
    dbFetches: 0,
    totalRequests: 0,
  };

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    // 启动本地缓存清理任务
    this.startLocalCacheCleanup();
    // 启动统计重置任务（每小时）
    this.startStatsResetTask();
  }

  /**
   * 获取单个用户缓存
   * 优先级：本地缓存 > Redis > 数据库（回调获取）
   */
  async getUser(userId: string, fetchFromDb?: () => Promise<User | null>): Promise<User | null> {
    this.cacheStats.totalRequests++;

    // 1. 尝试从本地缓存获取
    const localUser = this.getFromLocalCache(userId);
    if (localUser) {
      this.cacheStats.localCacheHits++;
      this.logger.debug(`User ${userId} hit local cache`);
      return localUser;
    }

    this.cacheStats.localCacheMisses++;

    // 2. 尝试从 Redis 获取
    const redisUser = await this.getFromRedis(userId);
    if (redisUser) {
      this.cacheStats.redisCacheHits++;
      this.logger.debug(`User ${userId} hit Redis cache`);
      // 回填本地缓存
      this.setToLocalCache(userId, redisUser);
      return redisUser;
    }

    this.cacheStats.redisCacheMisses++;

    // 3. 从数据库获取（如果提供了回调）
    if (fetchFromDb) {
      this.cacheStats.dbFetches++;
      const dbUser = await fetchFromDb();
      if (dbUser) {
        await this.setUser(userId, dbUser);
        return dbUser;
      }
    }

    return null;
  }

  /**
   * 批量获取用户缓存
   * 优化批量查询性能
   */
  async getUsersBatch(
    userIds: string[],
    fetchFromDb?: (ids: string[]) => Promise<User[]>,
  ): Promise<Map<string, User>> {
    const result = new Map<string, User>();
    const missingIds: string[] = [];

    // 1. 从本地缓存获取
    for (const userId of userIds) {
      const user = this.getFromLocalCache(userId);
      if (user) {
        result.set(userId, user);
      } else {
        missingIds.push(userId);
      }
    }

    if (missingIds.length === 0) {
      return result;
    }

    // 2. 从 Redis 批量获取
    const redisResults = await this.getBatchFromRedis(missingIds);
    const stillMissingIds: string[] = [];

    for (const [userId, user] of redisResults.entries()) {
      if (user) {
        result.set(userId, user);
        this.setToLocalCache(userId, user); // 回填本地缓存
      } else {
        stillMissingIds.push(userId);
      }
    }

    if (stillMissingIds.length === 0 || !fetchFromDb) {
      return result;
    }

    // 3. 从数据库批量获取
    const dbUsers = await fetchFromDb(stillMissingIds);
    for (const user of dbUsers) {
      result.set(user.id, user);
      await this.setUser(user.id, user);
    }

    return result;
  }

  /**
   * 设置用户缓存
   */
  async setUser(userId: string, user: User): Promise<void> {
    // 1. 设置本地缓存
    this.setToLocalCache(userId, user);

    // 2. 设置 Redis 缓存
    await this.setToRedis(userId, user);
  }

  /**
   * 批量设置用户缓存
   */
  async setUsersBatch(users: User[]): Promise<void> {
    // 1. 设置本地缓存
    for (const user of users) {
      this.setToLocalCache(user.id, user);
    }

    // 2. 批量设置 Redis 缓存
    await this.setBatchToRedis(users);
  }

  /**
   * 删除用户缓存
   */
  async deleteUser(userId: string): Promise<void> {
    // 1. 删除本地缓存
    this.localCache.delete(userId);

    // 2. 删除 Redis 缓存
    await this.redis.del(`${this.REDIS_KEY_PREFIX}${userId}`);

    this.logger.debug(`User ${userId} cache deleted`);
  }

  /**
   * 批量删除用户缓存
   */
  async deleteUsersBatch(userIds: string[]): Promise<void> {
    // 1. 删除本地缓存
    for (const userId of userIds) {
      this.localCache.delete(userId);
    }

    // 2. 批量删除 Redis 缓存
    const keys = userIds.map(id => `${this.REDIS_KEY_PREFIX}${id}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    this.logger.debug(`Batch deleted ${userIds.length} user caches`);
  }

  /**
   * 更新用户缓存（部分字段）
   */
  async updateUserFields(userId: string, fields: Partial<User>): Promise<void> {
    // 1. 更新本地缓存
    const localUser = this.localCache.get(userId);
    if (localUser) {
      Object.assign(localUser.user, fields);
      localUser.expireAt = Date.now() + this.LOCAL_CACHE_TTL;
    }

    // 2. 更新 Redis 缓存
    const redisUser = await this.getFromRedis(userId);
    if (redisUser) {
      Object.assign(redisUser, fields);
      await this.setToRedis(userId, redisUser);
    }

    this.logger.debug(`User ${userId} cache fields updated`);
  }

  /**
   * 检查用户是否在缓存中
   */
  async hasUser(userId: string): Promise<boolean> {
    if (this.localCache.has(userId)) {
      return true;
    }
    const exists = await this.redis.exists(`${this.REDIS_KEY_PREFIX}${userId}`);
    return exists === 1;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    localCacheSize: number;
    localCacheHitRate: number;
    redisCacheHitRate: number;
    overallCacheHitRate: number;
    totalRequests: number;
    localCacheHits: number;
    localCacheMisses: number;
    redisCacheHits: number;
    redisCacheMisses: number;
    dbFetches: number;
  } {
    const { localCacheHits, localCacheMisses, redisCacheHits, redisCacheMisses, totalRequests, dbFetches } = this.cacheStats;
    
    // 计算命中率
    const localCacheHitRate = localCacheHits > 0 
      ? localCacheHits / (localCacheHits + localCacheMisses) 
      : 0;
    
    const redisCacheHitRate = redisCacheHits > 0 
      ? redisCacheHits / (redisCacheHits + redisCacheMisses) 
      : 0;
    
    const overallCacheHitRate = totalRequests > 0 
      ? (localCacheHits + redisCacheHits) / totalRequests 
      : 0;

    return {
      localCacheSize: this.localCache.size,
      localCacheHitRate,
      redisCacheHitRate,
      overallCacheHitRate,
      totalRequests,
      localCacheHits,
      localCacheMisses,
      redisCacheHits,
      redisCacheMisses,
      dbFetches,
    };
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    this.localCache.clear();

    // 删除所有用户缓存
    const keys = await this.redis.keys(`${this.REDIS_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    this.logger.log('All user caches cleared');
  }

  // ==================== 私有方法 ====================

  /**
   * 从本地缓存获取
   */
  private getFromLocalCache(userId: string): User | null {
    const cached = this.localCache.get(userId);
    if (cached && cached.expireAt > Date.now()) {
      // 更新最后访问时间，用于LRU策略
      cached.lastAccessTime = Date.now();
      this.localCache.set(userId, cached);
      return cached.user;
    }
    // 过期则删除
    if (cached) {
      this.localCache.delete(userId);
    }
    return null;
  }

  /**
   * 设置本地缓存
   */
  private setToLocalCache(userId: string, user: User): void {
    // 检查缓存大小，如果超过限制则清理最旧的条目
    if (this.localCache.size >= this.MAX_LOCAL_CACHE_SIZE) {
      this.evictOldestLocalCache();
    }

    this.localCache.set(userId, {
      user,
      expireAt: Date.now() + this.LOCAL_CACHE_TTL,
      lastAccessTime: Date.now(),
    });
  }

  /**
   * 从 Redis 获取
   */
  private async getFromRedis(userId: string): Promise<User | null> {
    try {
      const data = await this.redis.get(`${this.REDIS_KEY_PREFIX}${userId}`);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId} from Redis:`, error);
      return null;
    }
  }

  /**
   * 批量从 Redis 获取
   */
  private async getBatchFromRedis(userIds: string[]): Promise<Map<string, User | null>> {
    const result = new Map<string, User | null>();

    if (userIds.length === 0) {
      return result;
    }

    try {
      const keys = userIds.map(id => `${this.REDIS_KEY_PREFIX}${id}`);
      const values = await this.redis.mget(...keys);

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const data = values[i];
        if (data) {
          result.set(userId, JSON.parse(data));
        } else {
          result.set(userId, null);
        }
      }
    } catch (error) {
      this.logger.error('Failed to get batch from Redis:', error);
      // 返回空结果，让调用方从数据库获取
      for (const userId of userIds) {
        result.set(userId, null);
      }
    }

    return result;
  }

  /**
   * 设置到 Redis
   */
  private async setToRedis(userId: string, user: User): Promise<void> {
    try {
      await this.redis.setex(
        `${this.REDIS_KEY_PREFIX}${userId}`,
        this.REDIS_CACHE_TTL,
        JSON.stringify(user),
      );
    } catch (error) {
      this.logger.error(`Failed to set user ${userId} to Redis:`, error);
    }
  }

  /**
   * 批量设置到 Redis
   */
  private async setBatchToRedis(users: User[]): Promise<void> {
    if (users.length === 0) return;

    try {
      const pipeline = this.redis.pipeline();

      for (const user of users) {
        pipeline.setex(
          `${this.REDIS_KEY_PREFIX}${user.id}`,
          this.REDIS_CACHE_TTL,
          JSON.stringify(user),
        );
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to set batch to Redis:', error);
    }
  }

  /**
   * 清理最旧的本地缓存条目（LRU策略）
   * @param count 清理的条目数量
   */
  private evictOldestLocalCache(count: number = 10): void {
    // 按最后访问时间排序，找出最旧的条目
    const entries = Array.from(this.localCache.entries());
    entries.sort((a, b) => a[1].lastAccessTime - b[1].lastAccessTime);

    // 清理最旧的条目
    const toRemove = entries.slice(0, count);
    toRemove.forEach(([key]) => {
      this.localCache.delete(key);
    });

    if (toRemove.length > 0) {
      this.logger.debug(`Evicted ${toRemove.length} oldest local cache entries`);
    }
  }

  /**
   * 启动本地缓存清理任务
   */
  private startLocalCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;
      let sizeBefore = this.localCache.size;

      // 1. 清理过期条目
      for (const [key, value] of this.localCache.entries()) {
        if (value.expireAt < now) {
          this.localCache.delete(key);
          expiredCount++;
        }
      }

      // 2. 如果缓存大小仍然超过限制，使用LRU策略清理
      if (this.localCache.size > this.MAX_LOCAL_CACHE_SIZE * 0.8) { // 当缓存达到80%容量时开始清理
        const overCapacity = this.localCache.size - Math.floor(this.MAX_LOCAL_CACHE_SIZE * 0.7); // 清理到70%容量
        this.evictOldestLocalCache(overCapacity);
      }

      // 3. 记录清理结果
      const sizeAfter = this.localCache.size;
      const totalCleaned = sizeBefore - sizeAfter;

      if (totalCleaned > 0) {
        this.logger.debug(`Cleaned up ${totalCleaned} local cache entries (${expiredCount} expired, ${totalCleaned - expiredCount} LRU)`);
      }
    }, this.CLEANUP_INTERVAL); // 按配置的间隔清理
  }

  /**
   * 启动统计重置任务
   * 每小时重置一次缓存统计信息
   */
  private startStatsResetTask(): void {
    setInterval(() => {
      const stats = this.getCacheStats();
      this.logger.debug(`Cache stats reset. Previous stats:`, stats);
      
      // 重置统计信息
      this.cacheStats = {
        localCacheHits: 0,
        localCacheMisses: 0,
        redisCacheHits: 0,
        redisCacheMisses: 0,
        dbFetches: 0,
        totalRequests: 0,
      };
    }, 3600000); // 每小时重置一次
  }
}
