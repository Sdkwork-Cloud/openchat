import { Injectable, Logger, Inject } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * WebSocket 限流配置
 */
interface WsThrottlerConfig {
  // 消息发送限流
  message: { ttl: number; limit: number };
  // 连接限流
  connection: { ttl: number; limit: number };
  // 通用事件限流
  default: { ttl: number; limit: number };
}

/**
 * WebSocket 限流守卫
 * 基于 Redis 实现分布式限流
 * 使用滑动窗口算法
 */
@Injectable()
export class WsThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(WsThrottlerGuard.name);

  // 限流配置
  private readonly config: WsThrottlerConfig = {
    message: { ttl: 1000, limit: 5 }, // 5条消息/秒
    connection: { ttl: 60000, limit: 10 }, // 10次连接/分钟
    default: { ttl: 1000, limit: 20 }, // 20个事件/秒
  };

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * 检查是否允许请求通过
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const data = context.switchToWs().getData();
    const event = context.getHandler().name;

    // 获取用户ID或IP作为标识
    const identifier = this.getIdentifier(client, data);

    // 根据事件类型选择限流策略
    const limitType = this.getLimitType(event);
    const config = this.config[limitType];

    // 构建限流键
    const key = `ws:throttle:${limitType}:${identifier}`;

    // 检查限流
    const isAllowed = await this.checkLimit(key, config.ttl, config.limit);

    if (!isAllowed) {
      this.logger.warn(`WebSocket rate limit exceeded: ${identifier} for ${event}`);

      // 向客户端发送限流通知
      client.emit('rateLimitExceeded', {
        event,
        retryAfter: Math.ceil(config.ttl / 1000),
        timestamp: Date.now(),
      });

      return false;
    }

    return true;
  }

  /**
   * 获取限流标识符
   */
  private getIdentifier(client: any, data: any): string {
    // 优先使用用户ID
    if (data?.fromUserId) {
      return data.fromUserId;
    }

    // 其次使用 socket ID
    if (client.id) {
      return client.id;
    }

    // 最后使用 IP 地址
    return client.handshake?.address || 'unknown';
  }

  /**
   * 根据事件类型获取限流配置
   */
  private getLimitType(event: string): keyof WsThrottlerConfig {
    // 消息相关事件
    if (['handleSendMessage', 'handleSendGroupMessage'].includes(event)) {
      return 'message';
    }

    // 连接相关事件
    if (['handleRegister', 'handleConnection'].includes(event)) {
      return 'connection';
    }

    // 默认限流
    return 'default';
  }

  /**
   * 检查是否超过限流阈值
   * 使用 Redis 滑动窗口算法
   */
  private async checkLimit(key: string, ttl: number, limit: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - ttl;

    try {
      // 使用 Redis 有序集合实现滑动窗口
      // 1. 移除窗口外的旧记录
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // 2. 获取当前窗口内的请求数
      const currentCount = await this.redis.zcard(key);

      if (currentCount >= limit) {
        return false;
      }

      // 3. 添加当前请求记录
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // 4. 设置过期时间
      await this.redis.pexpire(key, ttl);

      return true;
    } catch (error) {
      this.logger.error('Rate limit check failed:', error);
      // 限流检查失败时，允许请求通过（降级策略）
      return true;
    }
  }

  /**
   * 获取限流状态
   */
  async getRateLimitStatus(identifier: string): Promise<{
    message: { remaining: number; resetTime: number };
    connection: { remaining: number; resetTime: number };
    default: { remaining: number; resetTime: number };
  }> {
    const now = Date.now();

    const getStatus = async (type: keyof WsThrottlerConfig) => {
      const key = `ws:throttle:${type}:${identifier}`;
      const config = this.config[type];
      const windowStart = now - config.ttl;

      // 清理旧记录
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // 获取当前计数
      const currentCount = await this.redis.zcard(key);
      const remaining = Math.max(0, config.limit - currentCount);

      // 获取窗口重置时间
      const oldestScore = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldestScore.length > 0
        ? parseInt(oldestScore[1]) + config.ttl
        : now + config.ttl;

      return { remaining, resetTime };
    };

    return {
      message: await getStatus('message'),
      connection: await getStatus('connection'),
      default: await getStatus('default'),
    };
  }
}
