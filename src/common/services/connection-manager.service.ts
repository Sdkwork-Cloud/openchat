/**
 * 统一连接管理器
 * 管理所有外部服务连接，确保连接复用和资源优化
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export interface ConnectionStats {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: Date;
  lastActivity: Date;
  totalCommands: number;
}

/**
 * 统一连接管理器
 * 确保所有 Redis 连接复用，避免连接泄漏
 */
@Injectable()
export class ConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionManager.name);
  private readonly connections: Map<string, Redis> = new Map();
  private readonly stats: Map<string, ConnectionStats> = new Map();
  private readonly configService: ConfigService;
  private primaryClient: Redis | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(@Optional() configService?: ConfigService) {
    this.configService = configService || new ConfigService();
  }

  async onModuleInit() {
    this.logger.log('ConnectionManager initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Closing all connections...');
    
    for (const [name, client] of this.connections) {
      try {
        await client.quit();
        this.logger.log(`Closed connection: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to close connection ${name}:`, error);
      }
    }
    
    this.connections.clear();
    this.stats.clear();
    this.primaryClient = null;
    this.pubClient = null;
    this.subClient = null;
    
    this.logger.log('All connections closed');
  }

  /**
   * 获取 Redis 配置
   */
  private getRedisOptions(): RedisOptions {
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const options: RedisOptions = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error(`Redis connection retry exhausted after ${times} attempts`);
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 10000,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      lazyConnect: false,
    };

    if (password && password.trim()) {
      options.password = password;
    }

    return options;
  }

  /**
   * 创建或获取 Redis 客户端
   */
  private async createClient(name: string, options?: Partial<RedisOptions>): Promise<Redis> {
    if (this.connections.has(name)) {
      const client = this.connections.get(name)!;
      if (client.status === 'ready' || client.status === 'connecting') {
        return client;
      }
      // 连接已断开，移除旧连接
      this.connections.delete(name);
      this.stats.delete(name);
    }

    const redisOptions = { ...this.getRedisOptions(), ...options };
    const client = new Redis(redisOptions);

    // 设置事件监听
    client.on('ready', () => {
      this.logger.log(`Redis client '${name}' ready`);
      this.updateStats(name, 'connected');
    });

    client.on('error', (err) => {
      if (!err.message.includes('ECONNRESET') && !err.message.includes('ECONNABORTED')) {
        this.logger.error(`Redis client '${name}' error: ${err.message}`);
      }
      this.updateStats(name, 'error');
    });

    client.on('close', () => {
      this.logger.warn(`Redis client '${name}' connection closed`);
      this.updateStats(name, 'disconnected');
    });

    client.on('reconnecting', () => {
      this.logger.log(`Redis client '${name}' reconnecting...`);
    });

    // 等待连接就绪
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Redis client '${name}' connection timeout`));
      }, 10000);

      if (client.status === 'ready') {
        clearTimeout(timeout);
        resolve();
        return;
      }

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    this.connections.set(name, client);
    this.stats.set(name, {
      name,
      status: 'connected',
      createdAt: new Date(),
      lastActivity: new Date(),
      totalCommands: 0,
    });

    return client;
  }

  /**
   * 更新连接统计
   */
  private updateStats(name: string, status: 'connected' | 'disconnected' | 'error') {
    const stat = this.stats.get(name);
    if (stat) {
      stat.status = status;
      stat.lastActivity = new Date();
    }
  }

  /**
   * 获取主 Redis 客户端
   */
  async getPrimaryClient(): Promise<Redis> {
    if (!this.primaryClient) {
      this.primaryClient = await this.createClient('primary');
    }
    return this.primaryClient;
  }

  /**
   * 获取发布客户端
   */
  async getPubClient(): Promise<Redis> {
    if (!this.pubClient) {
      const primary = await this.getPrimaryClient();
      this.pubClient = primary.duplicate();
      
      this.pubClient.on('error', (err) => {
        if (!err.message.includes('ECONNRESET')) {
          this.logger.error(`Redis pub client error: ${err.message}`);
        }
      });
      
      this.connections.set('pub', this.pubClient);
      this.stats.set('pub', {
        name: 'pub',
        status: 'connected',
        createdAt: new Date(),
        lastActivity: new Date(),
        totalCommands: 0,
      });
    }
    return this.pubClient;
  }

  /**
   * 获取订阅客户端
   */
  async getSubClient(): Promise<Redis> {
    if (!this.subClient) {
      const primary = await this.getPrimaryClient();
      this.subClient = primary.duplicate();
      
      this.subClient.on('error', (err) => {
        if (!err.message.includes('ECONNRESET')) {
          this.logger.error(`Redis sub client error: ${err.message}`);
        }
      });
      
      this.connections.set('sub', this.subClient);
      this.stats.set('sub', {
        name: 'sub',
        status: 'connected',
        createdAt: new Date(),
        lastActivity: new Date(),
        totalCommands: 0,
      });
    }
    return this.subClient;
  }

  /**
   * 获取指定数据库的客户端
   */
  async getClientForDb(db: number): Promise<Redis> {
    const name = `db_${db}`;
    return this.createClient(name, { db });
  }

  /**
   * 获取所有连接统计
   */
  getStats(): ConnectionStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * 获取连接数量
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ name: string; status: string; latency: number }[]> {
    const results: { name: string; status: string; latency: number }[] = [];

    for (const [name, client] of this.connections) {
      const start = Date.now();
      try {
        await client.ping();
        results.push({
          name,
          status: 'healthy',
          latency: Date.now() - start,
        });
      } catch (error) {
        results.push({
          name,
          status: 'unhealthy',
          latency: Date.now() - start,
        });
      }
    }

    return results;
  }

  /**
   * 关闭指定连接
   */
  async closeConnection(name: string): Promise<void> {
    const client = this.connections.get(name);
    if (client) {
      await client.quit();
      this.connections.delete(name);
      this.stats.delete(name);
      
      if (name === 'primary') this.primaryClient = null;
      if (name === 'pub') this.pubClient = null;
      if (name === 'sub') this.subClient = null;
    }
  }
}

// 全局单例
let globalConnectionManager: ConnectionManager | null = null;

/**
 * 获取全局连接管理器
 */
export function getGlobalConnectionManager(configService?: ConfigService): ConnectionManager {
  if (!globalConnectionManager) {
    globalConnectionManager = new ConnectionManager(configService);
  }
  return globalConnectionManager;
}

/**
 * 重置全局连接管理器（仅用于测试）
 */
export function resetGlobalConnectionManager(): void {
  globalConnectionManager = null;
}
