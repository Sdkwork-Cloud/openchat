import { Module, Global, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service';

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
        
        const host = configService.get('REDIS_HOST', 'localhost');
        const port = configService.get('REDIS_PORT', 6379);
        const password = configService.get('REDIS_PASSWORD');
        const db = configService.get('REDIS_DB', 0);
        
        logger.log(`Connecting to Redis at ${host}:${port}/${db}...`);
        
        const client = new Redis({
          host,
          port,
          db,
          password: password || undefined,
          lazyConnect: true,
          connectTimeout: 10000,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.error(`Redis connection retry exhausted`);
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });

        // 等待连接就绪
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis connection timeout'));
          }, 10000);

          client.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          client.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          client.connect().catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        
        logger.log('Redis primary client connected');
        return client;
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_PUB_CLIENT,
      useFactory: async (primaryClient: Redis) => {
        const logger = new Logger('RedisModule');
        const pubClient = primaryClient.duplicate();
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis pub client connection timeout'));
          }, 10000);

          pubClient.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          pubClient.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          pubClient.connect().catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        
        logger.log('Redis pub client connected');
        return pubClient;
      },
      inject: [REDIS_CLIENT],
    },
    {
      provide: REDIS_SUB_CLIENT,
      useFactory: async (primaryClient: Redis) => {
        const logger = new Logger('RedisModule');
        const subClient = primaryClient.duplicate();
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis sub client connection timeout'));
          }, 10000);

          subClient.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          subClient.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          subClient.connect().catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        
        logger.log('Redis sub client connected');
        return subClient;
      },
      inject: [REDIS_CLIENT],
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
    this.logger.log('RedisModule destroyed');
  }
}
