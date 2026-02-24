import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * 限流存储记录接口
 */
export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis 限流存储接口
 */
export interface ThrottlerStorage {
  increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord>;
}

/**
 * 滑动窗口限流存储实现
 * 基于 Redis 实现分布式限流
 */
@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  private readonly logger = new Logger(ThrottlerStorageRedisService.name);
  private readonly KEY_PREFIX = 'throttle:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * 增加请求计数（滑动窗口算法）
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const fullKey = `${this.KEY_PREFIX}${throttlerName}:${key}`;
    const now = Date.now();
    const windowStart = now - ttl;

    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      local limit = tonumber(ARGV[4])
      local blockDuration = tonumber(ARGV[5])
      
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      redis.call('ZADD', key, now, now)
      redis.call('EXPIRE', key, math.ceil(ttl / 1000))
      
      local count = redis.call('ZCARD', key)
      local isBlocked = 0
      local timeToBlockExpire = 0
      
      if count > limit then
        isBlocked = 1
        timeToBlockExpire = now + blockDuration
      end
      
      return {count, ttl, isBlocked, timeToBlockExpire}
    `;

    try {
      const result = await this.redis.eval(
        luaScript,
        1,
        fullKey,
        now,
        windowStart,
        ttl,
        limit,
        blockDuration,
      ) as [number, number, number, number];

      return {
        totalHits: result[0],
        timeToExpire: result[1],
        isBlocked: result[2] === 1,
        timeToBlockExpire: result[3],
      };
    } catch (error) {
      this.logger.error(`Failed to increment throttle count for key ${key}`, error);
      return {
        totalHits: 0,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  /**
   * 获取当前请求次数
   */
  async getCount(key: string, ttl: number, throttlerName: string = 'default'): Promise<number> {
    const fullKey = `${this.KEY_PREFIX}${throttlerName}:${key}`;
    const now = Date.now();
    const windowStart = now - ttl;

    try {
      await this.redis.zremrangebyscore(fullKey, 0, windowStart);
      const count = await this.redis.zcard(fullKey);
      return count;
    } catch (error) {
      this.logger.error(`Failed to get throttle count for key ${key}`, error);
      return 0;
    }
  }

  /**
   * 清除限流记录
   */
  async clear(key: string, throttlerName: string = 'default'): Promise<void> {
    const fullKey = `${this.KEY_PREFIX}${throttlerName}:${key}`;
    await this.redis.del(fullKey);
  }

  /**
   * 自定义限流检查（支持更细粒度的控制）
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    throttlerName: string = 'default',
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const fullKey = `${this.KEY_PREFIX}${throttlerName}:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local ttl = tonumber(ARGV[4])
      
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      local current = redis.call('ZCARD', key)
      
      if current >= limit then
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local resetTime = tonumber(oldest[2]) + ttl
        return {0, limit - current, resetTime}
      end
      
      redis.call('ZADD', key, now, now)
      redis.call('EXPIRE', key, math.ceil(ttl / 1000))
      
      return {1, limit - current - 1, now + ttl}
    `;

    try {
      const result = await this.redis.eval(
        luaScript,
        1,
        fullKey,
        now,
        windowStart,
        limit,
        windowMs,
      ) as [number, number, number];

      return {
        allowed: result[0] === 1,
        remaining: result[1],
        resetTime: result[2],
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for key ${key}`, error);
      return { allowed: true, remaining: 1, resetTime: now + windowMs };
    }
  }
}
