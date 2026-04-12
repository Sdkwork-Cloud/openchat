import {
  Module,
  Global,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

export { REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from './redis.constants';

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

const trackedRedisClients = new Map<Redis, string>();

function trackRedisClient(client: Redis, label: string): Redis {
  trackedRedisClients.set(client, label);
  return client;
}

async function closeRedisClient(client: Redis, label: string, logger: Logger): Promise<void> {
  if (client.status === 'end') {
    trackedRedisClients.delete(client);
    return;
  }

  try {
    await client.quit();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to quit Redis ${label} client gracefully: ${message}`);
    try {
      client.disconnect();
    } catch (disconnectError) {
      const disconnectMessage =
        disconnectError instanceof Error ? disconnectError.message : String(disconnectError);
      logger.error(`Failed to disconnect Redis ${label} client: ${disconnectMessage}`);
    }
  } finally {
    trackedRedisClients.delete(client);
  }
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
        return trackRedisClient(client, 'primary');
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
        return trackRedisClient(pubClient, 'publish');
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
        return trackRedisClient(subClient, 'subscribe');
      },
      inject: [REDIS_CLIENT],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, RedisService],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Optional() private readonly configService?: ConfigService) {}

  async onModuleInit() {
    this.logger.log('RedisModule initialized');
  }

  async onModuleDestroy() {
    this.logger.log('RedisModule destroying...');
  }

  async onApplicationShutdown() {
    const clients = Array.from(trackedRedisClients.entries()).reverse();
    for (const [client, label] of clients) {
      await closeRedisClient(client, label, this.logger);
    }
    this.logger.log('RedisModule destroyed');
  }
}
