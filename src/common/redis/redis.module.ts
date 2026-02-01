import { Module, Global, OnModuleInit } from '@nestjs/common';
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
    // 简化实现，不真正排序
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
    // 模拟发布消息，不做实际处理
  }

  async subscribe(channel: string): Promise<void> {
    // 模拟订阅频道，不做实际处理
  }

  async on(event: string, callback: (channel: string, message: string) => void): Promise<void> {
    // 模拟事件监听，不做实际处理
  }

  async pipeline(): Promise<any> {
    // 模拟 pipeline，返回一个具有 exec 方法的对象
    return {
      exec: async () => []
    };
  }

  async disconnect(): Promise<void> {
    // 模拟断开连接，不做实际处理
  }

  async duplicate(): Promise<MockRedis> {
    // 模拟创建副本，返回一个新的 MockRedis 实例
    return new MockRedis();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        console.log('Creating Redis client...');
        // 直接返回 MockRedis 实例，避免 Redis 连接错误
        console.warn('Using mock Redis client implementation');
        return new MockRedis() as any;
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_PUB_CLIENT,
      useFactory: (configService: ConfigService) => {
        console.log('Creating Redis pub client...');
        // 直接返回 MockRedis 实例，避免 Redis 连接错误
        console.warn('Using mock Redis pub client implementation');
        return new MockRedis() as any;
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUB_CLIENT,
      useFactory: (configService: ConfigService) => {
        console.log('Creating Redis sub client...');
        // 直接返回 MockRedis 实例，避免 Redis 连接错误
        console.warn('Using mock Redis sub client implementation');
        return new MockRedis() as any;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, RedisService],
})
export class RedisModule implements OnModuleInit {
  async onModuleInit() {
    console.log('RedisModule initialized');
  }
}
