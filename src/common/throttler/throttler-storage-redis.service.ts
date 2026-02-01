import { Injectable, Inject, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

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
  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<any> {
    const fullKey = `${this.KEY_PREFIX}${key}`;
    const now = Date.now();
    const windowStart = now - ttl;

    // 使用 Redis Lua 脚本实现原子操作
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      
      -- 移除窗口外的旧记录
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      
      -- 添加当前请求时间戳
      redis.call('ZADD', key, now, now)
      
      -- 设置过期时间
      redis.call('EXPIRE', key, math.ceil(ttl / 1000))
      
      -- 返回当前窗口内的请求数
      return redis.call('ZCARD', key)
    `;

    try {
      const count = await this.redis.eval(
        luaScript,
        1,
        fullKey,
        now,
        windowStart,
        ttl,
      ) as number;

      return {
        totalHits: count,
        timeToExpire: ttl,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to increment throttle count for key ${key}`, error);
      // 降级：允许请求通过
      return {
        totalHits: 0,
        timeToExpire: ttl,
        limit,
      };
    }
  }

  /**
   * 获取当前请求次数
   */
  async getCount(key: string, ttl: number): Promise<number> {
    const fullKey = `${this.KEY_PREFIX}${key}`;
    const now = Date.now();
    const windowStart = now - ttl;

    try {
      // 清理过期记录
      await this.redis.zremrangebyscore(fullKey, 0, windowStart);

      // 获取当前窗口内的记录数
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
  async clear(key: string): Promise<void> {
    const fullKey = `${this.KEY_PREFIX}${key}`;
    await this.redis.del(fullKey);
  }

  /**
   * 自定义限流检查（支持更细粒度的控制）
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const fullKey = `${this.KEY_PREFIX}${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local ttl = tonumber(ARGV[4])
      
      -- 移除窗口外的旧记录
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      
      -- 获取当前计数
      local current = redis.call('ZCARD', key)
      
      -- 检查是否超过限制
      if current >= limit then
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local resetTime = tonumber(oldest[2]) + ttl
        return {0, limit - current, resetTime}
      end
      
      -- 添加当前请求
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
      // 降级：允许请求
      return { allowed: true, remaining: 1, resetTime: now + windowMs };
    }
  }
}
