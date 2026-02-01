/**
 * WebSocket 心跳检测服务
 *
 * 功能：
 * 1. 记录客户端心跳
 * 2. 检测超时连接
 * 3. 自动清理过期连接
 * 4. 支持分布式部署
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

export interface HeartbeatInfo {
  userId: string;
  socketId: string;
  lastHeartbeat: number;
  serverId: string;
}

export interface ConnectionStatus {
  userId: string;
  socketId: string;
  isAlive: boolean;
  lastSeen: number;
}

@Injectable()
export class WSHeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WSHeartbeatService.name);
  private readonly HEARTBEAT_KEY_PREFIX = 'ws:hb:';
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60秒超时
  private readonly CHECK_INTERVAL = 10000; // 10秒检查一次
  private checkInterval: NodeJS.Timeout | null = null;
  private serverId: string;

  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private eventEmitter: EventEmitter2,
  ) {
    // 生成唯一的服务器ID
    this.serverId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  onModuleInit() {
    this.startHeartbeatCheck();
    this.logger.log(`WSHeartbeatService initialized with serverId: ${this.serverId}`);
  }

  onModuleDestroy() {
    this.stopHeartbeatCheck();
  }

  /**
   * 记录客户端心跳
   *
   * @param userId 用户ID
   * @param socketId Socket ID
   */
  async recordHeartbeat(userId: string, socketId: string): Promise<void> {
    const key = this.getHeartbeatKey(userId, socketId);
    const data: HeartbeatInfo = {
      userId,
      socketId,
      lastHeartbeat: Date.now(),
      serverId: this.serverId,
    };

    await this.redis.setex(
      key,
      Math.ceil(this.HEARTBEAT_TIMEOUT / 1000),
      JSON.stringify(data),
    );

    this.logger.debug(`Heartbeat recorded for user ${userId}, socket ${socketId}`);
  }

  /**
   * 批量记录心跳
   *
   * @param heartbeats 心跳信息数组
   */
  async recordHeartbeats(heartbeats: Array<{ userId: string; socketId: string }>): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const { userId, socketId } of heartbeats) {
      const key = this.getHeartbeatKey(userId, socketId);
      const data: HeartbeatInfo = {
        userId,
        socketId,
        lastHeartbeat: Date.now(),
        serverId: this.serverId,
      };

      pipeline.setex(
        key,
        Math.ceil(this.HEARTBEAT_TIMEOUT / 1000),
        JSON.stringify(data),
      );
    }

    await pipeline.exec();
    this.logger.debug(`Batch recorded ${heartbeats.length} heartbeats`);
  }

  /**
   * 检查客户端是否存活
   *
   * @param userId 用户ID
   * @param socketId Socket ID
   * @returns 是否存活
   */
  async isClientAlive(userId: string, socketId: string): Promise<boolean> {
    const key = this.getHeartbeatKey(userId, socketId);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * 获取客户端心跳信息
   *
   * @param userId 用户ID
   * @param socketId Socket ID
   * @returns 心跳信息
   */
  async getHeartbeatInfo(userId: string, socketId: string): Promise<HeartbeatInfo | null> {
    const key = this.getHeartbeatKey(userId, socketId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as HeartbeatInfo;
    } catch {
      return null;
    }
  }

  /**
   * 获取用户的所有连接
   *
   * @param userId 用户ID
   * @returns 连接列表
   */
  async getUserConnections(userId: string): Promise<ConnectionStatus[]> {
    const pattern = `${this.HEARTBEAT_KEY_PREFIX}${userId}:*`;
    const keys = await this.redis.keys(pattern);
    const connections: ConnectionStatus[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const info = JSON.parse(data) as HeartbeatInfo;
          const ttl = await this.redis.ttl(key);

          connections.push({
            userId: info.userId,
            socketId: info.socketId,
            isAlive: ttl > 0,
            lastSeen: info.lastHeartbeat,
          });
        } catch {
          // 忽略解析错误
        }
      }
    }

    return connections;
  }

  /**
   * 删除客户端心跳记录
   *
   * @param userId 用户ID
   * @param socketId Socket ID
   */
  async removeHeartbeat(userId: string, socketId: string): Promise<void> {
    const key = this.getHeartbeatKey(userId, socketId);
    await this.redis.del(key);

    this.logger.debug(`Removed heartbeat for user ${userId}, socket ${socketId}`);
  }

  /**
   * 获取所有过期连接
   *
   * @returns 过期连接列表
   */
  async getExpiredConnections(): Promise<Array<{ userId: string; socketId: string; serverId: string }>> {
    const pattern = `${this.HEARTBEAT_KEY_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    const expired: Array<{ userId: string; socketId: string; serverId: string }> = [];

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);

      // TTL <= 0 表示已过期或不存在
      if (ttl <= 0) {
        const data = await this.redis.get(key);
        if (data) {
          try {
            const info = JSON.parse(data) as HeartbeatInfo;
            expired.push({
              userId: info.userId,
              socketId: info.socketId,
              serverId: info.serverId,
            });
          } catch {
            // 解析错误，直接删除
            await this.redis.del(key);
          }
        }
      }
    }

    return expired;
  }

  /**
   * 获取当前服务器的所有连接
   *
   * @returns 连接列表
   */
  async getServerConnections(): Promise<HeartbeatInfo[]> {
    const pattern = `${this.HEARTBEAT_KEY_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    const connections: HeartbeatInfo[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const info = JSON.parse(data) as HeartbeatInfo;
          if (info.serverId === this.serverId) {
            connections.push(info);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    return connections;
  }

  /**
   * 获取全局在线用户数量
   *
   * @returns 在线用户数量
   */
  async getOnlineUserCount(): Promise<number> {
    const pattern = `${this.HEARTBEAT_KEY_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    const uniqueUsers = new Set<string>();

    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 3) {
        uniqueUsers.add(parts[2]);
      }
    }

    return uniqueUsers.size;
  }

  /**
   * 获取全局连接数量
   *
   * @returns 连接数量
   */
  async getConnectionCount(): Promise<number> {
    const pattern = `${this.HEARTBEAT_KEY_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    return keys.length;
  }

  // ========== 私有方法 ==========

  private getHeartbeatKey(userId: string, socketId: string): string {
    return `${this.HEARTBEAT_KEY_PREFIX}${userId}:${socketId}`;
  }

  private startHeartbeatCheck(): void {
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkExpiredConnections();
      } catch (error) {
        this.logger.error('Error checking expired connections:', error);
      }
    }, this.CHECK_INTERVAL);
  }

  private stopHeartbeatCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkExpiredConnections(): Promise<void> {
    const expired = await this.getExpiredConnections();

    for (const conn of expired) {
      // 只处理当前服务器的过期连接
      if (conn.serverId === this.serverId) {
        this.logger.warn(`Connection expired: user ${conn.userId}, socket ${conn.socketId}`);

        // 发布过期事件
        this.eventEmitter.emit('websocket:connectionExpired', {
          userId: conn.userId,
          socketId: conn.socketId,
          serverId: conn.serverId,
        });

        // 删除过期记录
        await this.removeHeartbeat(conn.userId, conn.socketId);
      }
    }

    if (expired.length > 0) {
      this.logger.debug(`Cleaned up ${expired.length} expired connections`);
    }
  }
}
