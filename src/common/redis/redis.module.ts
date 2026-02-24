import { Module, Global, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service';
import { ConnectionManager, getGlobalConnectionManager } from '../services/connection-manager.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_PUB_CLIENT = 'REDIS_PUB_CLIENT';
export const REDIS_SUB_CLIENT = 'REDIS_SUB_CLIENT';

/**
 * Redis 模块配置接口
 */
export interface RedisModuleOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

/**
 * 全局 Redis 客户端实例（用于模块间共享）
 */
let sharedRedisClient: Redis | null = null;
let sharedPubClient: Redis | null = null;
let sharedSubClient: Redis | null = null;
let connectionManager: ConnectionManager | null = null;

/**
 * Redis 模块
 * 提供统一的 Redis 连接管理
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        
        if (sharedRedisClient) {
          return sharedRedisClient;
        }
        
        connectionManager = getGlobalConnectionManager(configService);
        sharedRedisClient = await connectionManager.getPrimaryClient();
        logger.log('Redis primary client initialized');
        
        return sharedRedisClient;
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_PUB_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        
        if (sharedPubClient) {
          return sharedPubClient;
        }
        
        connectionManager = getGlobalConnectionManager(configService);
        sharedPubClient = await connectionManager.getPubClient();
        logger.log('Redis pub client initialized');
        
        return sharedPubClient;
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUB_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        
        if (sharedSubClient) {
          return sharedSubClient;
        }
        
        connectionManager = getGlobalConnectionManager(configService);
        sharedSubClient = await connectionManager.getSubClient();
        logger.log('Redis sub client initialized');
        
        return sharedSubClient;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, RedisService],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Optional() private readonly configService?: ConfigService) {}

  async onModuleInit() {
    this.logger.log('RedisModule initialized');
  }

  async onModuleDestroy() {
    this.logger.log('RedisModule destroying...');
    
    if (connectionManager) {
      await connectionManager.onModuleDestroy();
    }
    
    sharedRedisClient = null;
    sharedPubClient = null;
    sharedSubClient = null;
    connectionManager = null;
    
    this.logger.log('RedisModule destroyed');
  }

  /**
   * 获取连接统计
   */
  static getStats() {
    return connectionManager?.getStats() || [];
  }

  /**
   * 获取连接数量
   */
  static getConnectionCount() {
    return connectionManager?.getConnectionCount() || 0;
  }
}
