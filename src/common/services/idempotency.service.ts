import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export interface IdempotencyOptions {
  key: string;
  ttl?: number;
  scope?: 'user' | 'global' | 'session';
  strategy?: 'reject' | 'return_cached' | 'queue';
}

export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  result?: T;
  requestId: string;
  timestamp: number;
}

export interface IdempotencyRecord {
  requestId: string;
  key: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  createdAt: number;
  completedAt?: number;
  ttl: number;
}

@Injectable()
export class IdempotencyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly pendingRequests = new Map<string, { resolve: Function; reject: Function }[]>();
  private cleanupInterval?: NodeJS.Timeout;
  private readonly defaultTTL: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.defaultTTL = this.configService.get<number>('IDEMPOTENCY_TTL', 86400);
  }

  onModuleInit() {
    this.startCleanupInterval();
    this.logger.log('IdempotencyService initialized');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    options?: Partial<IdempotencyOptions>,
  ): Promise<IdempotencyResult<T>> {
    const ttl = options?.ttl || this.defaultTTL;
    const strategy = options?.strategy || 'return_cached';
    const fullKey = this.buildKey(key, options);

    const existingRecord = await this.getRecord<T>(fullKey);

    if (existingRecord) {
      if (existingRecord.status === 'completed') {
        this.logger.debug(`Idempotent request found: ${fullKey}`);
        return {
          isDuplicate: true,
          result: existingRecord.result,
          requestId: existingRecord.requestId,
          timestamp: existingRecord.createdAt,
        };
      }

      if (existingRecord.status === 'pending') {
        return this.handlePendingRequest(fullKey, strategy, existingRecord);
      }
    }

    const requestId = this.generateRequestId();
    await this.setPending(fullKey, requestId, ttl);

    try {
      const result = await operation();
      await this.setCompleted(fullKey, requestId, result, ttl);

      this.notifyPendingWaiters(fullKey, result);

      return {
        isDuplicate: false,
        result,
        requestId,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      await this.setFailed(fullKey, requestId, error.message, ttl);
      this.notifyPendingWaiters(fullKey, null, error);
      throw error;
    }
  }

  async wrap<T>(
    key: string,
    operation: () => Promise<T>,
    options?: Partial<IdempotencyOptions>,
  ): Promise<T> {
    const result = await this.execute(key, operation, options);
    return result.result!;
  }

  async check(key: string, options?: Partial<IdempotencyOptions>): Promise<IdempotencyRecord | null> {
    const fullKey = this.buildKey(key, options);
    return this.getRecord(fullKey);
  }

  async invalidate(key: string, options?: Partial<IdempotencyOptions>): Promise<boolean> {
    const fullKey = this.buildKey(key, options);
    try {
      await this.redisService.del(fullKey);
      this.logger.debug(`Invalidated idempotency key: ${fullKey}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to invalidate key ${fullKey}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string, options?: Partial<IdempotencyOptions>): Promise<number> {
    const prefix = options?.scope ? `idempotency:${options.scope}` : 'idempotency';
    const fullPattern = `${prefix}:${pattern}`;

    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(`${fullPattern}*`);

      if (keys.length > 0) {
        await client.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${fullPattern}`);
        return keys.length;
      }

      return 0;
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${fullPattern}:`, error);
      return 0;
    }
  }

  async getStats(): Promise<{
    pendingCount: number;
    pendingKeys: string[];
  }> {
    return {
      pendingCount: this.pendingRequests.size,
      pendingKeys: Array.from(this.pendingRequests.keys()),
    };
  }

  private buildKey(key: string, options?: Partial<IdempotencyOptions>): string {
    const scope = options?.scope || 'global';
    return buildCacheKey('idempotency', scope, key);
  }

  private async getRecord<T>(key: string): Promise<IdempotencyRecord | null> {
    try {
      const data = await this.redisService.get(key);
      if (!data) return null;

      return JSON.parse(data) as IdempotencyRecord;
    } catch (error) {
      this.logger.error(`Failed to get record for key ${key}:`, error);
      return null;
    }
  }

  private async setPending(key: string, requestId: string, ttl: number): Promise<void> {
    const record: IdempotencyRecord = {
      requestId,
      key,
      status: 'pending',
      createdAt: Date.now(),
      ttl,
    };

    await this.redisService.set(key, JSON.stringify(record), ttl);
  }

  private async setCompleted<T>(
    key: string,
    requestId: string,
    result: T,
    ttl: number,
  ): Promise<void> {
    const record: IdempotencyRecord = {
      requestId,
      key,
      status: 'completed',
      result,
      createdAt: Date.now(),
      completedAt: Date.now(),
      ttl,
    };

    await this.redisService.set(key, JSON.stringify(record), ttl);
  }

  private async setFailed(
    key: string,
    requestId: string,
    error: string,
    ttl: number,
  ): Promise<void> {
    const record: IdempotencyRecord = {
      requestId,
      key,
      status: 'failed',
      result: { error },
      createdAt: Date.now(),
      completedAt: Date.now(),
      ttl,
    };

    await this.redisService.set(key, JSON.stringify(record), ttl);
  }

  private async handlePendingRequest<T>(
    key: string,
    strategy: string,
    existingRecord: IdempotencyRecord,
  ): Promise<IdempotencyResult<T>> {
    if (strategy === 'reject') {
      return {
        isDuplicate: true,
        requestId: existingRecord.requestId,
        timestamp: existingRecord.createdAt,
      };
    }

    if (strategy === 'queue') {
      return new Promise((resolve, reject) => {
        if (!this.pendingRequests.has(key)) {
          this.pendingRequests.set(key, []);
        }

        this.pendingRequests.get(key)!.push({
          resolve: (result: T) => {
            resolve({
              isDuplicate: true,
              result,
              requestId: existingRecord.requestId,
              timestamp: Date.now(),
            });
          },
          reject,
        });
      });
    }

    return {
      isDuplicate: true,
      requestId: existingRecord.requestId,
      timestamp: existingRecord.createdAt,
    };
  }

  private notifyPendingWaiters<T>(key: string, result: T | null, error?: Error): void {
    const waiters = this.pendingRequests.get(key);
    if (!waiters) return;

    this.pendingRequests.delete(key);

    for (const waiter of waiters) {
      if (error) {
        waiter.reject(error);
      } else {
        waiter.resolve(result);
      }
    }
  }

  private startCleanupInterval(): void {
    const interval = this.configService.get<number>('IDEMPOTENCY_CLEANUP_INTERVAL', 60000);

    this.cleanupInterval = setInterval(() => {
      for (const [key] of this.pendingRequests) {
        this.getRecord(key).then((record) => {
          if (!record || record.status !== 'pending') {
            this.pendingRequests.delete(key);
          }
        });
      }
    }, interval);
  }

  private generateRequestId(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function Idempotent(key: string, options?: Partial<IdempotencyOptions>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const idempotencyService = (this as any).idempotencyService as IdempotencyService;

      if (!idempotencyService) {
        return originalMethod.apply(this, args);
      }

      const result = await idempotencyService.execute(
        key,
        () => originalMethod.apply(this, args),
        options,
      );

      return result.result;
    };

    return descriptor;
  };
}

export function IdempotentKey(
  ...fields: (string | ((args: any[]) => string))[]
): (args: any[]) => string {
  return (args: any[]) => {
    const parts = fields.map((field, index) => {
      if (typeof field === 'function') {
        return field(args);
      }
      return args[index]?.[field] || args[index];
    });
    return parts.join(':');
  };
}
