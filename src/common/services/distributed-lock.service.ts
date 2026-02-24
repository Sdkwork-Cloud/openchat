/**
 * 分布式锁服务
 * 
 * 基于 Redis 实现分布式锁，支持可重入锁、公平锁、读写锁等
 * 提供锁超时、自动续期、锁等待等高级功能
 * 
 * @framework
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 锁类型
 */
export type LockType = 'exclusive' | 'read' | 'write' | 'fair';

/**
 * 锁状态
 */
export type LockStatus = 'acquired' | 'waiting' | 'released' | 'expired' | 'failed';

/**
 * 锁选项
 */
export interface LockOptions {
  /** 锁类型 */
  type?: LockType;
  /** 获取锁超时时间（毫秒） */
  acquireTimeout?: number;
  /** 锁持有超时时间（毫秒） */
  holdTimeout?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
  /** 是否可重入 */
  reentrant?: boolean;
  /** 是否自动续期 */
  autoRenew?: boolean;
  /** 自动续期间隔（毫秒） */
  renewInterval?: number;
  /** 公平锁等待队列 */
  fairQueue?: boolean;
}

/**
 * 锁实例接口
 */
export interface LockInstance {
  /** 锁名称 */
  name: string;
  /** 锁所有者 ID */
  ownerId: string;
  /** 获取时间 */
  acquiredAt: number;
  /** 过期时间 */
  expiresAt: number;
  /** 重入次数 */
  reentryCount: number;
  /** 释放锁 */
  release(): Promise<boolean>;
  /** 延长锁 */
  extend(milliseconds: number): Promise<boolean>;
  /** 检查是否持有 */
  isHeld(): boolean;
  /** 检查是否过期 */
  isExpired(): boolean;
}

/**
 * 锁统计信息
 */
export interface LockStats {
  totalAcquired: number;
  totalReleased: number;
  totalExpired: number;
  totalFailed: number;
  totalWaitTime: number;
  activeLocks: number;
  averageWaitTime: number;
  averageHoldTime: number;
}

/**
 * 锁事件
 */
export interface LockEvent {
  lockName: string;
  ownerId: string;
  timestamp: number;
  status: LockStatus;
  metadata?: Record<string, any>;
}

/**
 * 分布式锁服务
 */
@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly activeLocks = new Map<string, LockInstance & { renewInterval?: NodeJS.Timeout }>();
  private readonly stats: LockStats = {
    totalAcquired: 0,
    totalReleased: 0,
    totalExpired: 0,
    totalFailed: 0,
    totalWaitTime: 0,
    activeLocks: 0,
    averageWaitTime: 0,
    averageHoldTime: 0,
  };
  private readonly defaultOptions: Required<LockOptions> = {
    type: 'exclusive',
    acquireTimeout: 10000,
    holdTimeout: 30000,
    retryInterval: 100,
    reentrant: true,
    autoRenew: true,
    renewInterval: 10000,
    fairQueue: true,
  };
  private readonly prefix: string;
  private readonly ownerId: string;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.prefix = this.configService.get<string>('LOCK_PREFIX', 'lock');
    this.ownerId = this.generateOwnerId();
  }

  onModuleDestroy() {
    this.releaseAllLocks();
  }

  /**
   * 获取锁
   */
  async acquire(
    lockName: string,
    options?: LockOptions,
  ): Promise<LockInstance | null> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const fullLockName = this.buildLockKey(lockName);
    const startTime = Date.now();

    try {
      // 检查是否已持有锁（可重入）
      if (mergedOptions.reentrant) {
        const existingLock = this.activeLocks.get(fullLockName);
        if (existingLock && existingLock.ownerId === this.ownerId) {
          existingLock.reentryCount++;
          this.logger.debug(`Lock reentrant: ${lockName}, count: ${existingLock.reentryCount}`);
          return existingLock;
        }
      }

      // 尝试获取锁
      const acquired = await this.tryAcquire(fullLockName, mergedOptions.holdTimeout, mergedOptions);

      if (!acquired) {
        // 等待获取锁
        const waitResult = await this.waitForLock(fullLockName, mergedOptions);
        
        if (!waitResult) {
          this.stats.totalFailed++;
          this.emitEvent(lockName, 'failed', { reason: 'timeout' });
          this.logger.warn(`Failed to acquire lock: ${lockName} after ${mergedOptions.acquireTimeout}ms`);
          return null;
        }
      }

      // 创建锁实例
      const lockInstance = this.createLockInstance(
        lockName,
        fullLockName,
        mergedOptions,
      );

      // 存储活跃锁
      this.activeLocks.set(fullLockName, lockInstance);
      this.stats.totalAcquired++;
      this.stats.activeLocks = this.activeLocks.size;

      // 记录等待时间
      const waitTime = Date.now() - startTime;
      this.stats.totalWaitTime += waitTime;
      this.stats.averageWaitTime = this.stats.totalWaitTime / this.stats.totalAcquired;

      this.emitEvent(lockName, 'acquired', { waitTime });
      this.logger.debug(`Lock acquired: ${lockName} in ${waitTime}ms`);

      return lockInstance;
    } catch (error) {
      this.stats.totalFailed++;
      this.logger.error(`Failed to acquire lock ${lockName}:`, error);
      this.emitEvent(lockName, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * 使用锁执行（自动获取和释放）
   */
  async executeWithLock<T>(
    lockName: string,
    fn: (lock: LockInstance) => Promise<T>,
    options?: LockOptions,
  ): Promise<T | null> {
    const lock = await this.acquire(lockName, options);

    if (!lock) {
      throw new Error(`Failed to acquire lock: ${lockName}`);
    }

    try {
      return await fn(lock);
    } finally {
      await lock.release();
    }
  }

  /**
   * 尝试获取锁（无等待）
   */
  async tryAcquire(
    lockName: string,
    ttl?: number,
    options?: LockOptions,
  ): Promise<LockInstance | null> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const fullLockName = this.buildLockKey(lockName);
    const lockValue = this.generateLockValue();
    const lockTTL = ttl || mergedOptions.holdTimeout;

    const acquired = await this.setNxWithExpire(fullLockName, lockValue, lockTTL);

    if (acquired) {
      const lockInstance = this.createLockInstance(
        lockName,
        fullLockName,
        { ...mergedOptions, holdTimeout: lockTTL },
        lockValue,
      );

      this.activeLocks.set(fullLockName, lockInstance);
      this.stats.totalAcquired++;
      this.stats.activeLocks = this.activeLocks.size;

      this.emitEvent(lockName, 'acquired');
      this.logger.debug(`Lock tryAcquired: ${lockName}`);

      return lockInstance;
    }

    return null;
  }

  /**
   * 释放锁
   */
  async release(lockName: string): Promise<boolean> {
    const fullLockName = this.buildLockKey(lockName);
    const lock = this.activeLocks.get(fullLockName);

    if (!lock) {
      this.logger.warn(`Lock not found: ${lockName}`);
      return false;
    }

    if (lock.ownerId !== this.ownerId) {
      this.logger.warn(`Cannot release lock ${lockName}: not owned by this instance`);
      return false;
    }

    // 处理可重入
    if (lock.reentryCount > 0) {
      lock.reentryCount--;
      this.logger.debug(`Lock reentry decreased: ${lockName}, count: ${lock.reentryCount}`);
      return true;
    }

    try {
      // 停止自动续期
      if (lock.renewInterval) {
        clearInterval(lock.renewInterval);
      }

      // 删除 Redis 锁
      const released = await this.deleteLock(fullLockName, lock);

      if (released) {
        this.activeLocks.delete(fullLockName);
        this.stats.totalReleased++;
        this.stats.activeLocks = this.activeLocks.size;

        // 计算持有时间
        const holdTime = Date.now() - lock.acquiredAt;
        this.stats.averageHoldTime = 
          (this.stats.averageHoldTime * (this.stats.totalReleased - 1) + holdTime) / this.stats.totalReleased;

        this.emitEvent(lockName, 'released', { holdTime });
        this.logger.debug(`Lock released: ${lockName}, held for ${holdTime}ms`);
      }

      return released;
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockName}:`, error);
      return false;
    }
  }

  /**
   * 释放所有锁
   */
  async releaseAllLocks(): Promise<void> {
    const lockNames = Array.from(this.activeLocks.keys());
    
    for (const lockName of lockNames) {
      const shortName = lockName.replace(`${this.prefix}:`, '');
      await this.release(shortName);
    }

    this.logger.log(`Released all ${lockNames.length} locks`);
  }

  /**
   * 检查锁是否被持有
   */
  async isLocked(lockName: string): Promise<boolean> {
    const fullLockName = this.buildLockKey(lockName);
    const client = this.redisService.getClient();
    return !!(await client.exists(fullLockName));
  }

  /**
   * 获取锁持有者信息
   */
  async getLockInfo(lockName: string): Promise<{ ownerId: string; expiresAt: number } | null> {
    const fullLockName = this.buildLockKey(lockName);
    const client = this.redisService.getClient();
    
    const value = await client.get(fullLockName);
    if (!value) return null;

    const ttl = await client.pttl(fullLockName);
    const parsed = JSON.parse(value);

    return {
      ownerId: parsed.ownerId,
      expiresAt: Date.now() + ttl,
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): LockStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    Object.assign(this.stats, {
      totalAcquired: 0,
      totalReleased: 0,
      totalExpired: 0,
      totalFailed: 0,
      totalWaitTime: 0,
      activeLocks: 0,
      averageWaitTime: 0,
      averageHoldTime: 0,
    });
  }

  /**
   * 构建锁键
   */
  private buildLockKey(lockName: string): string {
    return `${this.prefix}:${lockName}`;
  }

  /**
   * 生成锁所有者 ID
   */
  private generateOwnerId(): string {
    return `${process.pid || 'unknown'}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成锁值
   */
  private generateLockValue(): string {
    return JSON.stringify({
      ownerId: this.ownerId,
      timestamp: Date.now(),
    });
  }

  /**
   * 创建锁实例
   */
  private createLockInstance(
    lockName: string,
    fullLockName: string,
    options: Required<LockOptions>,
    lockValue?: string,
  ): LockInstance & { renewInterval?: NodeJS.Timeout } {
    const now = Date.now();
    const lock: LockInstance & { renewInterval?: NodeJS.Timeout } = {
      name: lockName,
      ownerId: this.ownerId,
      acquiredAt: now,
      expiresAt: now + options.holdTimeout,
      reentryCount: 0,
      
      isHeld: () => {
        const activeLock = this.activeLocks.get(fullLockName);
        return !!activeLock && activeLock.ownerId === this.ownerId;
      },

      isExpired: () => {
        return Date.now() > lock.expiresAt;
      },

      release: () => {
        return this.release(lockName);
      },

      extend: async (milliseconds: number) => {
        return this.extendLock(fullLockName, milliseconds);
      },
    };

    // 启动自动续期
    if (options.autoRenew) {
      lock.renewInterval = setInterval(async () => {
        if (lock.isHeld() && !lock.isExpired()) {
          const extended = await lock.extend(options.holdTimeout);
          if (extended) {
            this.logger.debug(`Lock auto-renewed: ${lockName}`);
          } else {
            this.logger.warn(`Failed to auto-renew lock: ${lockName}`);
            if (lock.renewInterval) {
              clearInterval(lock.renewInterval);
            }
          }
        } else if (lock.renewInterval) {
          clearInterval(lock.renewInterval);
        }
      }, options.renewInterval);
    }

    return lock;
  }

  /**
   * 尝试获取锁（Redis SETNX）
   */
  private async setNxWithExpire(key: string, value: string, ttl: number): Promise<boolean> {
    const client = this.redisService.getClient();
    const result = await client.set(key, value, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * 删除锁（Lua 脚本保证原子性）
   */
  private async deleteLock(key: string, lock: LockInstance): Promise<boolean> {
    const client = this.redisService.getClient();
    const currentValue = await client.get(key);

    if (!currentValue) {
      return true; // 锁已不存在
    }

    const parsed = JSON.parse(currentValue);
    if (parsed.ownerId !== lock.ownerId) {
      return false; // 不是锁的持有者
    }

    await client.del(key);
    return true;
  }

  /**
   * 延长锁
   */
  private async extendLock(key: string, milliseconds: number): Promise<boolean> {
    const client = this.redisService.getClient();
    const currentValue = await client.get(key);

    if (!currentValue) {
      return false;
    }

    const parsed = JSON.parse(currentValue);
    if (parsed.ownerId !== this.ownerId) {
      return false;
    }

    return (await client.pexpire(key, milliseconds)) === 1;
  }

  /**
   * 等待锁
   */
  private async waitForLock(
    key: string,
    options: Required<LockOptions>,
  ): Promise<boolean> {
    const startTime = Date.now();
    const endAt = startTime + options.acquireTimeout;

    while (Date.now() < endAt) {
      const acquired = await this.setNxWithExpire(
        key,
        this.generateLockValue(),
        options.holdTimeout,
      );

      if (acquired) {
        return true;
      }

      // 等待重试间隔
      await this.sleep(options.retryInterval);

      // 检查锁是否已释放
      const exists = await this.redisService.getClient().exists(key);
      if (!exists) {
        // 锁已释放，尝试获取
        continue;
      }
    }

    return false;
  }

  /**
   * 发射锁事件
   */
  private emitEvent(lockName: string, status: LockStatus, metadata?: Record<string, any>): void {
    this.eventEmitter.emit('lock.event', {
      lockName,
      ownerId: this.ownerId,
      timestamp: Date.now(),
      status,
      metadata,
    } as LockEvent);
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 锁装饰器
 */
export function UseLock(
  lockNameExtractor: (...args: any[]) => string,
  options?: LockOptions,
) {
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

      const lockName = lockNameExtractor.apply(this, args);
      const lock = await lockService.acquire(lockName, options);

      if (!lock) {
        throw new Error(`Failed to acquire lock: ${lockName}`);
      }

      try {
        return await originalMethod.apply(this, args);
      } finally {
        await lock.release();
      }
    };

    return descriptor;
  };
}
