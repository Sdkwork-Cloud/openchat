import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { buildCacheKey } from '../decorators/cache.decorator';
import { randomBytes } from 'crypto';

export interface LockOptions {
  ttl: number;
  retryAttempts: number;
  retryDelay: number;
  autoExtend: boolean;
}

export interface Lock {
  key: string;
  value: string;
  acquired: boolean;
  acquiredAt?: number;
  ttl: number;
}

export interface LockStats {
  totalAcquired: number;
  totalFailed: number;
  totalReleased: number;
  activeLocks: number;
}

const DEFAULT_OPTIONS: LockOptions = {
  ttl: 30000,
  retryAttempts: 3,
  retryDelay: 100,
  autoExtend: false,
};

@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly activeLocks = new Map<string, Lock>();
  private readonly stats: LockStats = {
    totalAcquired: 0,
    totalFailed: 0,
    totalReleased: 0,
    activeLocks: 0,
  };
  private readonly autoExtendTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleDestroy() {
    for (const [key, timer] of this.autoExtendTimers) {
      clearTimeout(timer);
    }

    for (const [key, lock] of this.activeLocks) {
      this.release(key, lock.value).catch((err) => {
        this.logger.error(`Failed to release lock ${key} on destroy:`, err);
      });
    }
  }

  async acquire(key: string, options?: Partial<LockOptions>): Promise<Lock> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lockKey = this.buildLockKey(key);
    const lockValue = this.generateLockValue();

    for (let attempt = 0; attempt <= opts.retryAttempts; attempt++) {
      const acquired = await this.tryAcquire(lockKey, lockValue, opts.ttl);

      if (acquired) {
        const lock: Lock = {
          key,
          value: lockValue,
          acquired: true,
          acquiredAt: Date.now(),
          ttl: opts.ttl,
        };

        this.activeLocks.set(key, lock);
        this.stats.totalAcquired++;
        this.stats.activeLocks++;

        if (opts.autoExtend) {
          this.startAutoExtend(key, lock, opts.ttl);
        }

        this.logger.debug(`Lock acquired: ${key}`);
        return lock;
      }

      if (attempt < opts.retryAttempts) {
        await this.sleep(opts.retryDelay);
      }
    }

    this.stats.totalFailed++;
    this.logger.warn(`Failed to acquire lock: ${key}`);

    return {
      key,
      value: lockValue,
      acquired: false,
      ttl: opts.ttl,
    };
  }

  async tryAcquire(key: string, value: string, ttl: number): Promise<boolean> {
    const client = this.redisService.getClient();
    const result = await client.set(key, value, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  async release(key: string, value: string): Promise<boolean> {
    const lockKey = this.buildLockKey(key);

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const client = this.redisService.getClient();
    const result = await client.eval(script, 1, lockKey, value);

    if (result === 1) {
      this.activeLocks.delete(key);
      this.stats.totalReleased++;
      this.stats.activeLocks--;

      const timer = this.autoExtendTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.autoExtendTimers.delete(key);
      }

      this.logger.debug(`Lock released: ${key}`);
      return true;
    }

    this.logger.warn(`Failed to release lock (not owner): ${key}`);
    return false;
  }

  async extend(key: string, value: string, ttl: number): Promise<boolean> {
    const lockKey = this.buildLockKey(key);

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const client = this.redisService.getClient();
    const result = await client.eval(script, 1, lockKey, value, ttl);

    if (result === 1) {
      const lock = this.activeLocks.get(key);
      if (lock) {
        lock.ttl = ttl;
      }
      this.logger.debug(`Lock extended: ${key}`);
      return true;
    }

    return false;
  }

  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.buildLockKey(key);
    const value = await this.redisService.get(lockKey);
    return value !== null;
  }

  async getLockTTL(key: string): Promise<number> {
    const lockKey = this.buildLockKey(key);
    const client = this.redisService.getClient();
    const ttl = await client.pttl(lockKey);
    return ttl > 0 ? ttl : 0;
  }

  async withLock<T>(
    key: string,
    callback: () => Promise<T>,
    options?: Partial<LockOptions>,
  ): Promise<T> {
    const lock = await this.acquire(key, options);

    if (!lock.acquired) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await callback();
    } finally {
      await this.release(key, lock.value);
    }
  }

  async withLockOrSkip<T>(
    key: string,
    callback: () => Promise<T>,
    options?: Partial<LockOptions>,
  ): Promise<T | null> {
    const lock = await this.acquire(key, { ...options, retryAttempts: 0 });

    if (!lock.acquired) {
      return null;
    }

    try {
      return await callback();
    } finally {
      await this.release(key, lock.value);
    }
  }

  getStats(): LockStats {
    return { ...this.stats };
  }

  getActiveLocks(): Array<{ key: string; acquiredAt: number; ttl: number }> {
    return Array.from(this.activeLocks.entries()).map(([key, lock]) => ({
      key,
      acquiredAt: lock.acquiredAt || 0,
      ttl: lock.ttl,
    }));
  }

  private buildLockKey(key: string): string {
    return buildCacheKey('lock', key);
  }

  private generateLockValue(): string {
    return `${process.pid}:${randomBytes(8).toString('hex')}`;
  }

  private startAutoExtend(key: string, lock: Lock, ttl: number): void {
    const extendInterval = ttl * 0.7;

    const timer = setInterval(async () => {
      const activeLock = this.activeLocks.get(key);
      if (activeLock && activeLock.value === lock.value) {
        await this.extend(key, lock.value, ttl);
      } else {
        clearTimeout(timer);
        this.autoExtendTimers.delete(key);
      }
    }, extendInterval);

    this.autoExtendTimers.set(key, timer);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function WithLock(key: string, options?: Partial<LockOptions>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const lockService = (this as any).lockService as DistributedLockService;

      if (!lockService) {
        return originalMethod.apply(this, args);
      }

      return lockService.withLock(
        key,
        () => originalMethod.apply(this, args),
        options,
      );
    };

    return descriptor;
  };
}

export function WithLockOrSkip(key: string, options?: Partial<LockOptions>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const lockService = (this as any).lockService as DistributedLockService;

      if (!lockService) {
        return originalMethod.apply(this, args);
      }

      return lockService.withLockOrSkip(
        key,
        () => originalMethod.apply(this, args),
        options,
      );
    };

    return descriptor;
  };
}
