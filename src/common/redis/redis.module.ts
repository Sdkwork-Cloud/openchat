import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_PUB_CLIENT = 'REDIS_PUB_CLIENT';
export const REDIS_SUB_CLIENT = 'REDIS_SUB_CLIENT';

/**
 * 模拟的 Redis 客户端
 * 在 Redis 连接失败时使用，提供基本的内存实现
 */
class MockRedis {
  private data: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private hashes: Map<string, Map<string, string>> = new Map();
  private logger = new Logger('MockRedis');

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.data.set(key, value);
    if (ttl) {
      setTimeout(() => this.data.delete(key), ttl * 1000);
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    this.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
    this.sets.delete(key);
    this.hashes.delete(key);
  }

  async exists(key: string): Promise<number> {
    return this.data.has(key) || this.sets.has(key) || this.hashes.has(key) ? 1 : 0;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    this.hashes.get(key)!.set(field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashes.get(key);
    return hash ? hash.get(field) || null : null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    const result: Record<string, string> = {};
    if (hash) {
      hash.forEach((value, field) => {
        result[field] = value;
      });
    }
    return result;
  }

  async hdel(key: string, field: string): Promise<void> {
    const hash = this.hashes.get(key);
    if (hash) {
      hash.delete(field);
    }
  }

  async hlen(key: string): Promise<number> {
    const hash = this.hashes.get(key);
    return hash ? hash.size : 0;
  }

  async sadd(key: string, member: string): Promise<void> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    this.sets.get(key)!.add(member);
  }

  async srem(key: string, member: string): Promise<void> {
    const set = this.sets.get(key);
    if (set) {
      set.delete(member);
    }
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async scard(key: string): Promise<number> {
    const set = this.sets.get(key);
    return set ? set.size : 0;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    this.sadd(key, member);
  }

  async zrem(key: string, member: string): Promise<void> {
    this.srem(key, member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const members = await this.smembers(key);
    return members.slice(start, stop + 1);
  }

  async zcard(key: string): Promise<number> {
    return this.scard(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    this.logger.debug(`Mock publish to ${channel}: ${message}`);
  }

  async subscribe(channel: string): Promise<void> {
    this.logger.debug(`Mock subscribe to ${channel}`);
  }

  async on(event: string, callback: (channel: string, message: string) => void): Promise<void> {
    // 模拟事件监听
  }

  async pipeline(): Promise<any> {
    return {
      exec: async () => []
    };
  }

  async disconnect(): Promise<void> {
    this.logger.log('Mock Redis disconnected');
  }

  async duplicate(): Promise<MockRedis> {
    return new MockRedis();
  }
}

/**
 * 创建真实的 Redis 客户端
 */
function createRedisClient(configService: ConfigService, logger: Logger): Redis {
  const redisPassword = configService.get<string>('REDIS_PASSWORD');
  const redisOptions: any = {
    host: configService.get<string>('REDIS_HOST', '172.23.3.187'),
    port: configService.get<number>('REDIS_PORT', 6379),
    db: configService.get<number>('REDIS_DB', 0),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true,
  };

  if (redisPassword && redisPassword.trim()) {
    redisOptions.password = redisPassword;
  }

  const client = new Redis(redisOptions);

  client.on('connect', () => {
    logger.log(`Redis client connected to ${redisOptions.host}:${redisOptions.port}`);
  });

  client.on('error', (err) => {
    logger.error(`Redis client error: ${err.message}`);
  });

  client.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  return client;
}

/**
 * 创建 Redis 客户端（带连接测试）
 */
async function createRedisClientWithFallback(
  configService: ConfigService,
  logger: Logger,
  clientName: string
): Promise<Redis | MockRedis> {
  try {
    const client = createRedisClient(configService, logger);
    
    // 测试连接
    await client.connect();
    await client.ping();
    
    logger.log(`✅ ${clientName} connected successfully`);
    return client;
  } catch (error: any) {
    logger.warn(`⚠️ ${clientName} connection failed: ${error.message}`);
    logger.warn(`🔄 Falling back to MockRedis for ${clientName}`);
    return new MockRedis() as any;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        logger.log('Initializing Redis client...');
        return createRedisClientWithFallback(configService, logger, 'Redis Client');
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_PUB_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        logger.log('Initializing Redis pub client...');
        return createRedisClientWithFallback(configService, logger, 'Redis Pub Client');
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUB_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        logger.log('Initializing Redis sub client...');
        return createRedisClientWithFallback(configService, logger, 'Redis Sub Client');
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, RedisService],
})
export class RedisModule implements OnModuleInit {
  private readonly logger = new Logger(RedisModule.name);

  async onModuleInit() {
    this.logger.log('✅ RedisModule initialized');
  }
}
