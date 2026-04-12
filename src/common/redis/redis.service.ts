import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from './redis.constants';

type MessageSubscriptionListener = {
  event: 'message';
  listener: (receivedChannel: string, message: string) => void;
};

type PatternSubscriptionListener = {
  event: 'pmessage';
  listener: (pattern: string, receivedChannel: string, message: string) => void;
};

type RedisSubscriptionListener = MessageSubscriptionListener | PatternSubscriptionListener;

/**
 * Redis 服务封装
 * 提供通用的 Redis 操作方法和 WebSocket 状态管理
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly subscriptionListeners: Map<
    string,
    RedisSubscriptionListener[]
  > = new Map();

  // Redis Key 前缀
  private readonly KEY_PREFIX = 'openchat:';
  private readonly WS_USER_PREFIX = 'ws:user:';
  private readonly WS_ROOM_PREFIX = 'ws:room:';
  private readonly WS_SERVER_PREFIX = 'ws:server:';
  private readonly ONLINE_USERS_KEY = 'online:users';
  private readonly USER_HEARTBEAT_PREFIX = 'hb:';
  private readonly USER_PRESENCE_VERSION_PREFIX = 'presence:version:';
  private readonly CLEANUP_SCAN_COUNT = 1000;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_PUB_CLIENT) private readonly pubRedis: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly subRedis: Redis,
  ) {}

  private isPatternChannel(channel: string): boolean {
    return channel.includes('*') || channel.includes('?') || channel.includes('[');
  }

  /**
   * 生成带前缀的 key
   */
  private prefixKey(key: string): string {
    return `${this.KEY_PREFIX}${key}`;
  }

  /**
   * WebSocket 状态管理 - 用户连接
   */
  async addUserSocket(userId: string, socketId: string, serverId: string): Promise<boolean> {
    const key = this.prefixKey(`${this.WS_USER_PREFIX}${userId}`);
    await this.redis.hset(key, socketId, serverId);
    await this.redis.expire(key, 86400); // 24小时过期

    const onlineUsersKey = this.prefixKey(this.ONLINE_USERS_KEY);
    const becameOnline = (await this.redis.zadd(onlineUsersKey, 'NX', Date.now(), userId)) > 0;
    // 刷新在线用户最新活动时间
    await this.redis.zadd(onlineUsersKey, Date.now(), userId);

    return becameOnline;
  }

  /**
   * 移除用户 socket 连接
   */
  async removeUserSocket(userId: string, socketId: string): Promise<boolean> {
    const key = this.prefixKey(`${this.WS_USER_PREFIX}${userId}`);
    await this.redis.hdel(key, socketId);

    // 检查用户是否还有其他连接
    const remaining = await this.redis.hlen(key);
    if (remaining === 0) {
      await this.redis.del(key);
      // 从在线用户集合移除
      const removed = await this.redis.zrem(this.prefixKey(this.ONLINE_USERS_KEY), userId);
      return removed > 0;
    }

    return false;
  }

  /**
   * 获取用户的所有 socket 连接
   */
  async getUserSockets(userId: string): Promise<{ socketId: string; serverId: string }[]> {
    const key = this.prefixKey(`${this.WS_USER_PREFIX}${userId}`);
    const result = await this.redis.hgetall(key);
    return Object.entries(result).map(([socketId, serverId]) => ({
      socketId,
      serverId,
    }));
  }

  /**
   * 获取用户在线状态
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const key = this.prefixKey(`${this.WS_USER_PREFIX}${userId}`);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * 获取所有在线用户数量
   */
  async getOnlineUserCount(): Promise<number> {
    return this.redis.zcard(this.prefixKey(this.ONLINE_USERS_KEY));
  }

  /**
   * 获取所有在线用户ID列表
   */
  async getOnlineUsers(limit: number = 1000, offset: number = 0): Promise<string[]> {
    return this.redis.zrange(
      this.prefixKey(this.ONLINE_USERS_KEY),
      offset,
      offset + limit - 1,
    );
  }

  /**
   * 更新用户心跳时间
   */
  async updateUserHeartbeat(userId: string): Promise<void> {
    const key = this.prefixKey(`${this.USER_HEARTBEAT_PREFIX}${userId}`);
    await this.redis.setex(key, 300, Date.now().toString()); // 5分钟过期
  }

  /**
   * 获取用户最后心跳时间
   */
  async getUserLastHeartbeat(userId: string): Promise<number | null> {
    const key = this.prefixKey(`${this.USER_HEARTBEAT_PREFIX}${userId}`);
    const timestamp = await this.redis.get(key);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  /**
   * 清理离线用户（心跳超时的用户）
   */
  async cleanupOfflineUsers(): Promise<string[]> {
    const offlineUsers: string[] = [];
    const now = Date.now();
    const onlineUsersKey = this.prefixKey(this.ONLINE_USERS_KEY);
    let cursor = '0';

    do {
      const [nextCursor, entries] = await this.redis.zscan(
        onlineUsersKey,
        cursor,
        'COUNT',
        this.CLEANUP_SCAN_COUNT,
      );
      cursor = nextCursor;

      const userIds: string[] = [];
      for (let i = 0; i < entries.length; i += 2) {
        const userId = entries[i];
        if (userId) {
          userIds.push(userId);
        }
      }

      if (userIds.length === 0) {
        continue;
      }

      const heartbeatPipeline = this.redis.pipeline();
      userIds.forEach((userId) => {
        heartbeatPipeline.get(this.prefixKey(`${this.USER_HEARTBEAT_PREFIX}${userId}`));
      });
      const heartbeatResults = await heartbeatPipeline.exec();

      if (!heartbeatResults) {
        continue;
      }

      const cleanupPipeline = this.redis.pipeline();
      userIds.forEach((userId, index) => {
        const [heartbeatError, heartbeatValue] = heartbeatResults[index];
        if (heartbeatError) {
          return;
        }

        const lastHeartbeat = typeof heartbeatValue === 'string' ? parseInt(heartbeatValue, 10) : null;
        if (!lastHeartbeat || now - lastHeartbeat > 300000) {
          // 5分钟无心跳视为离线
          offlineUsers.push(userId);
          cleanupPipeline.del(this.prefixKey(`${this.WS_USER_PREFIX}${userId}`));
          cleanupPipeline.zrem(onlineUsersKey, userId);
        }
      });

      if (cleanupPipeline.length > 0) {
        await cleanupPipeline.exec();
      }
    } while (cursor !== '0');

    return offlineUsers;
  }

  /**
   * 房间管理 - 用户加入房间
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    const key = this.prefixKey(`${this.WS_ROOM_PREFIX}${roomId}`);
    await this.redis.sadd(key, userId);
  }

  /**
   * 房间管理 - 用户离开房间
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const key = this.prefixKey(`${this.WS_ROOM_PREFIX}${roomId}`);
    await this.redis.srem(key, userId);
  }

  /**
   * 获取房间所有成员
   */
  async getRoomMembers(roomId: string): Promise<string[]> {
    const key = this.prefixKey(`${this.WS_ROOM_PREFIX}${roomId}`);
    return this.redis.smembers(key);
  }

  /**
   * 获取房间成员数量
   */
  async getRoomMemberCount(roomId: string): Promise<number> {
    const key = this.prefixKey(`${this.WS_ROOM_PREFIX}${roomId}`);
    return this.redis.scard(key);
  }

  /**
   * 服务器节点注册（用于多实例广播）
   */
  async registerServer(serverId: string): Promise<void> {
    const key = this.prefixKey(`${this.WS_SERVER_PREFIX}nodes`);
    await this.redis.sadd(key, serverId);
    await this.redis.setex(
      this.prefixKey(`${this.WS_SERVER_PREFIX}${serverId}`),
      30,
      Date.now().toString(),
    );
  }

  /**
   * 服务器心跳
   */
  async updateServerHeartbeat(serverId: string): Promise<void> {
    await this.redis.setex(
      this.prefixKey(`${this.WS_SERVER_PREFIX}${serverId}`),
      30,
      Date.now().toString(),
    );
  }

  /**
   * 获取所有活跃的服务器节点
   */
  async getActiveServers(): Promise<string[]> {
    const key = this.prefixKey(`${this.WS_SERVER_PREFIX}nodes`);
    const servers = await this.redis.smembers(key);
    const activeServers: string[] = [];

    for (const serverId of servers) {
      const exists = await this.redis.exists(
        this.prefixKey(`${this.WS_SERVER_PREFIX}${serverId}`),
      );
      if (exists) {
        activeServers.push(serverId);
      } else {
        await this.redis.srem(key, serverId);
      }
    }

    return activeServers;
  }

  /**
   * 发布消息到频道（用于跨服务器广播）
   */
  async publish(channel: string, message: any): Promise<void> {
    await this.pubRedis.publish(channel, JSON.stringify(message));
  }

  /**
   * 通用的 get/set 方法
   */
  async get(key: string): Promise<string | null> {
    return this.redis.get(this.prefixKey(key));
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const fullKey = this.prefixKey(key);
    if (ttl) {
      await this.redis.setex(fullKey, ttl, value);
    } else {
      await this.redis.set(fullKey, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.prefixKey(key));
  }

  async setJson(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Failed to parse JSON for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(this.prefixKey(key));
    return result === 1;
  }

  async setIfNotExists(key: string, value: string, ttlMs?: number): Promise<boolean> {
    const fullKey = this.prefixKey(key);
    const result = ttlMs
      ? await this.redis.set(fullKey, value, 'PX', ttlMs, 'NX')
      : await this.redis.set(fullKey, value, 'NX');
    return result === 'OK';
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.redis.zadd(this.prefixKey(key), score, member);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) {
      return 0;
    }
    return this.redis.zrem(this.prefixKey(key), ...members);
  }

  async zrangeByScore(
    key: string,
    min: number | string,
    max: number | string,
    limit?: { offset: number; count: number },
  ): Promise<string[]> {
    const fullKey = this.prefixKey(key);
    if (limit) {
      return this.redis.zrangebyscore(fullKey, min, max, 'LIMIT', limit.offset, limit.count);
    }
    return this.redis.zrangebyscore(fullKey, min, max);
  }

  /**
   * 批量操作（Pipeline）
   */
  async pipeline(operations: (pipeline: any) => void): Promise<any[]> {
    const pipeline = this.redis.pipeline();
    operations(pipeline);
    const result = await pipeline.exec();
    return result || [];
  }

  getClient(): Redis {
    return this.redis;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const prefixedKey = this.prefixKey(key);
    const result = await this.redis.incr(prefixedKey);
    if (ttlSeconds && result === 1) {
      await this.redis.expire(prefixedKey, ttlSeconds);
    }
    return result;
  }

  async decrement(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key);
    const result = await this.redis.decr(prefixedKey);
    if (result < 0) {
      await this.redis.set(prefixedKey, '0');
      return 0;
    }
    return result;
  }

  async nextUserPresenceVersion(userId: string): Promise<number> {
    return this.increment(`${this.USER_PRESENCE_VERSION_PREFIX}${userId}`, 30 * 24 * 60 * 60);
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const prefixedKey = this.prefixKey(`lock:${key}`);
    const result = await this.redis.set(prefixedKey, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    const prefixedKey = this.prefixKey(`lock:${key}`);
    await this.redis.del(prefixedKey);
  }

  /**
   * 订阅频道
   */
  async subscribe(channel: string, callback?: (message: string, channel?: string) => void): Promise<void> {
    const listeners = this.subscriptionListeners.get(channel) || [];

    if (callback) {
      if (this.isPatternChannel(channel)) {
        const listener = (pattern: string, receivedChannel: string, message: string) => {
          if (pattern === channel) {
            callback(message, receivedChannel);
          }
        };
        this.subRedis.on('pmessage', listener);
        listeners.push({ event: 'pmessage', listener });
      } else {
        const listener = (receivedChannel: string, message: string) => {
          if (receivedChannel === channel) {
            callback(message, receivedChannel);
          }
        };
        this.subRedis.on('message', listener);
        listeners.push({ event: 'message', listener });
      }
      this.subscriptionListeners.set(channel, listeners);
    }

    if (this.isPatternChannel(channel)) {
      await this.subRedis.psubscribe(channel);
      return;
    }
    await this.subRedis.subscribe(channel);
  }

  /**
   * 取消订阅
   */
  async unsubscribe(channel?: string): Promise<void> {
    if (channel) {
      const listeners = this.subscriptionListeners.get(channel) || [];
      for (const listener of listeners) {
        if (listener.event === 'pmessage') {
          this.subRedis.off('pmessage', listener.listener);
          continue;
        }
        this.subRedis.off('message', listener.listener);
      }
      this.subscriptionListeners.delete(channel);

      if (this.isPatternChannel(channel)) {
        await this.subRedis.punsubscribe(channel);
        return;
      }
      await this.subRedis.unsubscribe(channel);
    } else {
      for (const listeners of this.subscriptionListeners.values()) {
        for (const listener of listeners) {
          if (listener.event === 'pmessage') {
            this.subRedis.off('pmessage', listener.listener);
            continue;
          }
          this.subRedis.off('message', listener.listener);
        }
      }
      this.subscriptionListeners.clear();

      await this.subRedis.unsubscribe();
      await this.subRedis.punsubscribe();
    }
  }

  async onModuleDestroy() {
    // 不在这里关闭连接，由 RedisModule 统一管理
    this.logger.log('RedisService destroyed');
  }
}
