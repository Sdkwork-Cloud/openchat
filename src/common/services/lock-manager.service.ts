import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LockType = 'exclusive' | 'shared' | 'read-write' | 'semaphore';
export type LockStatus = 'acquired' | 'waiting' | 'released' | 'expired' | 'failed';

export interface Lock {
  id: string;
  key: string;
  type: LockType;
  ownerId: string;
  status: LockStatus;
  acquiredAt: number;
  expiresAt: number;
  ttl: number;
  metadata?: Record<string, any>;
  waiters?: string[];
  semaphoreCount?: number;
  maxSemaphore?: number;
}

export interface LockOptions {
  ttl?: number;
  type?: LockType;
  waitTimeout?: number;
  retryInterval?: number;
  metadata?: Record<string, any>;
  maxSemaphore?: number;
}

export interface LockStats {
  totalLocks: number;
  activeLocks: number;
  waitingLocks: number;
  expiredLocks: number;
  locksByKey: Record<string, number>;
  averageHoldTime: number;
}

export interface LockManagerOptions {
  defaultTtl?: number;
  cleanupInterval?: number;
  maxWaiters?: number;
  enableDeadlockDetection?: boolean;
}

@Injectable()
export class LockManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LockManagerService.name);
  private readonly locks = new Map<string, Lock>();
  private readonly lockByKey = new Map<string, Lock[]>();
  private readonly waitQueues = new Map<string, Array<{
    ownerId: string;
    resolve: (lock: Lock) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>>();
  private readonly options: Required<LockManagerOptions>;
  private cleanupTimer?: NodeJS.Timeout;
  private readonly stats = {
    totalLocks: 0,
    expiredLocks: 0,
    totalHoldTime: 0,
    holdCount: 0,
  };

  constructor(private readonly configService: ConfigService) {
    this.options = {
      defaultTtl: 30000,
      cleanupInterval: 10000,
      maxWaiters: 100,
      enableDeadlockDetection: true,
    };
  }

  onModuleInit() {
    this.startCleanup();
    this.logger.log('LockManagerService initialized');
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.releaseAllLocks();
  }

  async acquire(key: string, ownerId: string, options?: LockOptions): Promise<Lock> {
    const ttl = options?.ttl || this.options.defaultTtl;
    const type = options?.type || 'exclusive';
    const waitTimeout = options?.waitTimeout || 0;

    const existingLocks = this.lockByKey.get(key) || [];
    const activeLocks = existingLocks.filter(l => l.status === 'acquired' && l.expiresAt > Date.now());

    if (type === 'exclusive') {
      if (activeLocks.length === 0) {
        return this.createLock(key, ownerId, type, ttl, options);
      }

      if (waitTimeout > 0) {
        return this.waitForLock(key, ownerId, type, ttl, waitTimeout, options);
      }

      throw new Error(`Lock '${key}' is already held by ${activeLocks[0].ownerId}`);
    }

    if (type === 'shared') {
      const hasExclusiveLock = activeLocks.some(l => l.type === 'exclusive');
      if (hasExclusiveLock) {
        if (waitTimeout > 0) {
          return this.waitForLock(key, ownerId, type, ttl, waitTimeout, options);
        }
        throw new Error(`Lock '${key}' has an exclusive lock`);
      }
      return this.createLock(key, ownerId, type, ttl, options);
    }

    if (type === 'read-write') {
      const hasWriteLock = activeLocks.some(l => l.type === 'exclusive');
      if (hasWriteLock) {
        if (waitTimeout > 0) {
          return this.waitForLock(key, ownerId, type, ttl, waitTimeout, options);
        }
        throw new Error(`Lock '${key}' has a write lock`);
      }
      return this.createLock(key, ownerId, type, ttl, options);
    }

    if (type === 'semaphore') {
      const maxSemaphore = options?.maxSemaphore || 1;
      const semaphoreLocks = activeLocks.filter(l => l.type === 'semaphore');
      const currentCount = semaphoreLocks.reduce((sum, l) => sum + (l.semaphoreCount || 1), 0);

      if (currentCount < maxSemaphore) {
        return this.createLock(key, ownerId, type, ttl, options, maxSemaphore - currentCount);
      }

      if (waitTimeout > 0) {
        return this.waitForLock(key, ownerId, type, ttl, waitTimeout, options);
      }
      throw new Error(`Semaphore '${key}' is at maximum capacity`);
    }

    return this.createLock(key, ownerId, type, ttl, options);
  }

  async tryAcquire(key: string, ownerId: string, options?: LockOptions): Promise<Lock | null> {
    try {
      return await this.acquire(key, ownerId, { ...options, waitTimeout: 0 });
    } catch {
      return null;
    }
  }

  async release(lockId: string, ownerId: string): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock) return false;

    if (lock.ownerId !== ownerId) {
      throw new Error(`Lock '${lockId}' is not owned by '${ownerId}'`);
    }

    const holdTime = Date.now() - lock.acquiredAt;
    this.stats.totalHoldTime += holdTime;
    this.stats.holdCount++;

    lock.status = 'released';

    const keyLocks = this.lockByKey.get(lock.key) || [];
    const index = keyLocks.findIndex(l => l.id === lockId);
    if (index !== -1) {
      keyLocks.splice(index, 1);
    }

    this.locks.delete(lockId);

    this.processWaitQueue(lock.key);

    return true;
  }

  async extend(lockId: string, ownerId: string, additionalTtl: number): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock) return false;

    if (lock.ownerId !== ownerId) {
      throw new Error(`Lock '${lockId}' is not owned by '${ownerId}'`);
    }

    if (lock.status !== 'acquired') {
      return false;
    }

    lock.expiresAt = Date.now() + additionalTtl;
    lock.ttl += additionalTtl;

    return true;
  }

  async isLocked(key: string): Promise<boolean> {
    const locks = this.lockByKey.get(key) || [];
    return locks.some(l => l.status === 'acquired' && l.expiresAt > Date.now());
  }

  async getLock(lockId: string): Promise<Lock | undefined> {
    return this.locks.get(lockId);
  }

  async getLocksByKey(key: string): Promise<Lock[]> {
    return this.lockByKey.get(key) || [];
  }

  async getOwnerLocks(ownerId: string): Promise<Lock[]> {
    return Array.from(this.locks.values()).filter(l => l.ownerId === ownerId);
  }

  async forceRelease(lockId: string): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock) return false;

    this.logger.warn(`Force releasing lock '${lockId}' owned by '${lock.ownerId}'`);

    lock.status = 'released';
    const keyLocks = this.lockByKey.get(lock.key) || [];
    const index = keyLocks.findIndex(l => l.id === lockId);
    if (index !== -1) {
      keyLocks.splice(index, 1);
    }
    this.locks.delete(lockId);

    this.processWaitQueue(lock.key);

    return true;
  }

  async releaseOwnerLocks(ownerId: string): Promise<number> {
    const ownerLocks = await this.getOwnerLocks(ownerId);
    let count = 0;

    for (const lock of ownerLocks) {
      if (await this.release(lock.id, ownerId)) {
        count++;
      }
    }

    return count;
  }

  getStats(): LockStats {
    const locks = Array.from(this.locks.values());
    const activeLocks = locks.filter(l => l.status === 'acquired' && l.expiresAt > Date.now());
    const waitingLocks = locks.filter(l => l.status === 'waiting');
    const expiredLocks = locks.filter(l => l.status === 'expired');

    const locksByKey: Record<string, number> = {};
    for (const lock of activeLocks) {
      locksByKey[lock.key] = (locksByKey[lock.key] || 0) + 1;
    }

    const avgHoldTime = this.stats.holdCount > 0
      ? this.stats.totalHoldTime / this.stats.holdCount
      : 0;

    return {
      totalLocks: locks.length,
      activeLocks: activeLocks.length,
      waitingLocks: waitingLocks.length,
      expiredLocks: expiredLocks.length,
      locksByKey,
      averageHoldTime: avgHoldTime,
    };
  }

  async withLock<T>(
    key: string,
    ownerId: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const lock = await this.acquire(key, ownerId, options);
    try {
      return await fn();
    } finally {
      await this.release(lock.id, ownerId);
    }
  }

  async withTryLock<T>(
    key: string,
    ownerId: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T | null> {
    const lock = await this.tryAcquire(key, ownerId, options);
    if (!lock) return null;

    try {
      return await fn();
    } finally {
      await this.release(lock.id, ownerId);
    }
  }

  private createLock(
    key: string,
    ownerId: string,
    type: LockType,
    ttl: number,
    options?: LockOptions,
    semaphoreCount?: number,
  ): Lock {
    const lockId = this.generateLockId();
    const now = Date.now();

    const lock: Lock = {
      id: lockId,
      key,
      type,
      ownerId,
      status: 'acquired',
      acquiredAt: now,
      expiresAt: now + ttl,
      ttl,
      metadata: options?.metadata,
      semaphoreCount,
      maxSemaphore: options?.maxSemaphore,
    };

    this.locks.set(lockId, lock);

    if (!this.lockByKey.has(key)) {
      this.lockByKey.set(key, []);
    }
    this.lockByKey.get(key)!.push(lock);

    this.stats.totalLocks++;

    return lock;
  }

  private waitForLock(
    key: string,
    ownerId: string,
    type: LockType,
    ttl: number,
    waitTimeout: number,
    options?: LockOptions,
  ): Promise<Lock> {
    return new Promise((resolve, reject) => {
      if (!this.waitQueues.has(key)) {
        this.waitQueues.set(key, []);
      }

      const queue = this.waitQueues.get(key)!;
      if (queue.length >= this.options.maxWaiters) {
        reject(new Error(`Wait queue for '${key}' is full`));
        return;
      }

      const timeout = setTimeout(() => {
        const index = queue.findIndex(w => w.ownerId === ownerId);
        if (index !== -1) {
          queue.splice(index, 1);
          reject(new Error(`Lock wait timeout for '${key}'`));
        }
      }, waitTimeout);

      queue.push({
        ownerId,
        resolve: (lock: Lock) => {
          clearTimeout(timeout);
          resolve(lock);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      });
    });
  }

  private processWaitQueue(key: string): void {
    const queue = this.waitQueues.get(key);
    if (!queue || queue.length === 0) return;

    const waiter = queue.shift();
    if (!waiter) return;

    this.acquire(key, waiter.ownerId, { type: 'exclusive' })
      .then(lock => waiter.resolve(lock))
      .catch(error => waiter.reject(error));
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredLocks();
    }, this.options.cleanupInterval);
  }

  private cleanupExpiredLocks(): void {
    const now = Date.now();
    const expiredLocks: Lock[] = [];

    for (const lock of this.locks.values()) {
      if (lock.status === 'acquired' && lock.expiresAt <= now) {
        expiredLocks.push(lock);
      }
    }

    for (const lock of expiredLocks) {
      lock.status = 'expired';
      this.stats.expiredLocks++;

      const keyLocks = this.lockByKey.get(lock.key) || [];
      const index = keyLocks.findIndex(l => l.id === lock.id);
      if (index !== -1) {
        keyLocks.splice(index, 1);
      }

      this.locks.delete(lock.id);
      this.processWaitQueue(lock.key);

      this.logger.warn(`Lock '${lock.id}' on key '${lock.key}' expired`);
    }
  }

  private releaseAllLocks(): void {
    for (const lock of this.locks.values()) {
      if (lock.status === 'acquired') {
        lock.status = 'released';
      }
    }
    this.locks.clear();
    this.lockByKey.clear();

    for (const queue of this.waitQueues.values()) {
      for (const waiter of queue) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error('Lock manager is shutting down'));
      }
    }
    this.waitQueues.clear();
  }

  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
