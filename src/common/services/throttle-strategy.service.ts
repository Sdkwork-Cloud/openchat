import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ThrottleStrategy = 'token-bucket' | 'leaky-bucket' | 'sliding-window' | 'fixed-window' | 'adaptive';

export interface ThrottleOptions {
  name: string;
  strategy?: ThrottleStrategy;
  capacity?: number;
  refillRate?: number;
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (context: any) => string;
  onThrottled?: (key: string, context: any) => void;
  onAllowed?: (key: string, context: any) => void;
}

export interface ThrottleResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  strategy: ThrottleStrategy;
  key: string;
}

export interface ThrottleStats {
  name: string;
  strategy: ThrottleStrategy;
  totalRequests: number;
  allowedRequests: number;
  throttledRequests: number;
  currentBuckets: number;
  averageWaitTime: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface LeakyBucket {
  queue: number;
  lastLeak: number;
}

interface WindowCounter {
  count: number;
  windowStart: number;
  previousCount?: number;
  previousWindowStart?: number;
}

@Injectable()
export class ThrottleStrategyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThrottleStrategyService.name);
  private readonly throttles = new Map<string, {
    options: Required<ThrottleOptions>;
    buckets: Map<string, TokenBucket | LeakyBucket | WindowCounter>;
    stats: {
      totalRequests: number;
      allowedRequests: number;
      throttledRequests: number;
      totalWaitTime: number;
      waitCount: number;
    };
    cleanupTimer?: NodeJS.Timeout;
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('ThrottleStrategyService initialized');
  }

  onModuleDestroy() {
    for (const [, throttle] of this.throttles) {
      if (throttle.cleanupTimer) {
        clearInterval(throttle.cleanupTimer);
      }
    }
  }

  createThrottle(options: ThrottleOptions): void {
    const name = options.name;

    if (this.throttles.has(name)) {
      throw new Error(`Throttle '${name}' already exists`);
    }

    const defaultOptions: Required<ThrottleOptions> = {
      name,
      strategy: options.strategy || 'token-bucket',
      capacity: options.capacity ?? 100,
      refillRate: options.refillRate ?? 10,
      windowMs: options.windowMs ?? 60000,
      maxRequests: options.maxRequests ?? 100,
      keyGenerator: options.keyGenerator || ((ctx: any) => ctx?.ip || 'default'),
      onThrottled: options.onThrottled || (() => {}),
      onAllowed: options.onAllowed || (() => {}),
    };

    const throttle = {
      options: defaultOptions,
      buckets: new Map<string, TokenBucket | LeakyBucket | WindowCounter>(),
      stats: {
        totalRequests: 0,
        allowedRequests: 0,
        throttledRequests: 0,
        totalWaitTime: 0,
        waitCount: 0,
      },
    };

    this.throttles.set(name, throttle);
    this.startCleanup(name);

    this.logger.log(`Throttle '${name}' created with strategy=${defaultOptions.strategy}`);
  }

  check(throttleName: string, context?: any): ThrottleResult {
    const throttle = this.throttles.get(throttleName);
    if (!throttle) {
      throw new Error(`Throttle '${throttleName}' not found`);
    }

    const key = throttle.options.keyGenerator(context);
    throttle.stats.totalRequests++;

    let result: ThrottleResult;

    switch (throttle.options.strategy) {
      case 'token-bucket':
        result = this.checkTokenBucket(throttle, key, context);
        break;
      case 'leaky-bucket':
        result = this.checkLeakyBucket(throttle, key, context);
        break;
      case 'sliding-window':
        result = this.checkSlidingWindow(throttle, key, context);
        break;
      case 'fixed-window':
        result = this.checkFixedWindow(throttle, key, context);
        break;
      case 'adaptive':
        result = this.checkAdaptive(throttle, key, context);
        break;
      default:
        result = this.checkTokenBucket(throttle, key, context);
    }

    if (result.allowed) {
      throttle.stats.allowedRequests++;
      throttle.options.onAllowed(key, context);
    } else {
      throttle.stats.throttledRequests++;
      throttle.options.onThrottled(key, context);
    }

    return result;
  }

  async wait(throttleName: string, context?: any, maxWaitMs?: number): Promise<ThrottleResult> {
    const throttle = this.throttles.get(throttleName);
    if (!throttle) {
      throw new Error(`Throttle '${throttleName}' not found`);
    }

    const startTime = Date.now();

    while (true) {
      const result = this.check(throttleName, context);

      if (result.allowed) {
        const waitTime = Date.now() - startTime;
        if (waitTime > 0) {
          throttle.stats.totalWaitTime += waitTime;
          throttle.stats.waitCount++;
        }
        return result;
      }

      if (maxWaitMs && Date.now() - startTime >= maxWaitMs) {
        return result;
      }

      const waitMs = result.retryAfter || 100;
      await this.sleep(Math.min(waitMs, maxWaitMs ? maxWaitMs - (Date.now() - startTime) : waitMs));
    }
  }

  reset(throttleName: string, key?: string): void {
    const throttle = this.throttles.get(throttleName);
    if (!throttle) return;

    if (key) {
      throttle.buckets.delete(key);
    } else {
      throttle.buckets.clear();
    }
  }

  getStats(throttleName: string): ThrottleStats {
    const throttle = this.throttles.get(throttleName);
    if (!throttle) {
      throw new Error(`Throttle '${throttleName}' not found`);
    }

    const avgWaitTime = throttle.stats.waitCount > 0
      ? throttle.stats.totalWaitTime / throttle.stats.waitCount
      : 0;

    return {
      name: throttleName,
      strategy: throttle.options.strategy,
      totalRequests: throttle.stats.totalRequests,
      allowedRequests: throttle.stats.allowedRequests,
      throttledRequests: throttle.stats.throttledRequests,
      currentBuckets: throttle.buckets.size,
      averageWaitTime: avgWaitTime,
    };
  }

  getAllStats(): ThrottleStats[] {
    const stats: ThrottleStats[] = [];
    for (const name of this.throttles.keys()) {
      stats.push(this.getStats(name));
    }
    return stats;
  }

  destroyThrottle(throttleName: string): void {
    const throttle = this.throttles.get(throttleName);
    if (!throttle) return;

    if (throttle.cleanupTimer) {
      clearInterval(throttle.cleanupTimer);
    }

    this.throttles.delete(throttleName);
    this.logger.log(`Throttle '${throttleName}' destroyed`);
  }

  private checkTokenBucket(
    throttle: {
      options: Required<ThrottleOptions>;
      buckets: Map<string, TokenBucket | LeakyBucket | WindowCounter>;
    },
    key: string,
    context: any,
  ): ThrottleResult {
    const now = Date.now();
    let bucket = throttle.buckets.get(key) as TokenBucket | undefined;

    if (!bucket) {
      bucket = {
        tokens: throttle.options.capacity,
        lastRefill: now,
      };
      throttle.buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refillAmount = (elapsed / 1000) * throttle.options.refillRate;
    bucket.tokens = Math.min(throttle.options.capacity, bucket.tokens + refillAmount);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: now + Math.ceil((throttle.options.capacity - bucket.tokens) / throttle.options.refillRate * 1000),
        strategy: 'token-bucket',
        key,
      };
    }

    const retryAfter = Math.ceil((1 - bucket.tokens) / throttle.options.refillRate * 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + retryAfter,
      retryAfter,
      strategy: 'token-bucket',
      key,
    };
  }

  private checkLeakyBucket(
    throttle: {
      options: Required<ThrottleOptions>;
      buckets: Map<string, TokenBucket | LeakyBucket | WindowCounter>;
    },
    key: string,
    context: any,
  ): ThrottleResult {
    const now = Date.now();
    let bucket = throttle.buckets.get(key) as LeakyBucket | undefined;

    if (!bucket) {
      bucket = {
        queue: 0,
        lastLeak: now,
      };
      throttle.buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastLeak;
    const leaked = (elapsed / 1000) * throttle.options.refillRate;
    bucket.queue = Math.max(0, bucket.queue - leaked);
    bucket.lastLeak = now;

    if (bucket.queue < throttle.options.capacity) {
      bucket.queue += 1;
      return {
        allowed: true,
        remaining: Math.floor(throttle.options.capacity - bucket.queue),
        resetAt: now + Math.ceil(bucket.queue / throttle.options.refillRate * 1000),
        strategy: 'leaky-bucket',
        key,
      };
    }

    const retryAfter = Math.ceil(1 / throttle.options.refillRate * 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + retryAfter,
      retryAfter,
      strategy: 'leaky-bucket',
      key,
    };
  }

  private checkSlidingWindow(
    throttle: {
      options: Required<ThrottleOptions>;
      buckets: Map<string, TokenBucket | LeakyBucket | WindowCounter>;
    },
    key: string,
    context: any,
  ): ThrottleResult {
    const now = Date.now();
    const windowMs = throttle.options.windowMs;
    let counter = throttle.buckets.get(key) as WindowCounter | undefined;

    if (!counter || now - counter.windowStart >= windowMs) {
      counter = {
        count: 0,
        windowStart: now,
        previousCount: counter?.count,
        previousWindowStart: counter?.windowStart,
      };
      throttle.buckets.set(key, counter);
    }

    const elapsed = now - counter.windowStart;
    const previousWeight = 1 - (elapsed / windowMs);
    const effectiveCount = counter.count + (counter.previousCount ? counter.previousCount * previousWeight : 0);

    if (effectiveCount < throttle.options.maxRequests) {
      counter.count++;
      return {
        allowed: true,
        remaining: Math.max(0, throttle.options.maxRequests - Math.ceil(effectiveCount) - 1),
        resetAt: counter.windowStart + windowMs,
        strategy: 'sliding-window',
        key,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: counter.windowStart + windowMs,
      retryAfter: counter.windowStart + windowMs - now,
      strategy: 'sliding-window',
      key,
    };
  }

  private checkFixedWindow(
    throttle: {
      options: Required<ThrottleOptions>;
      buckets: Map<string, TokenBucket | LeakyBucket | WindowCounter>;
    },
    key: string,
    context: any,
  ): ThrottleResult {
    const now = Date.now();
    const windowMs = throttle.options.windowMs;
    let counter = throttle.buckets.get(key) as WindowCounter | undefined;

    if (!counter || now - counter.windowStart >= windowMs) {
      counter = {
        count: 0,
        windowStart: now,
      };
      throttle.buckets.set(key, counter);
    }

    if (counter.count < throttle.options.maxRequests) {
      counter.count++;
      return {
        allowed: true,
        remaining: throttle.options.maxRequests - counter.count,
        resetAt: counter.windowStart + windowMs,
        strategy: 'fixed-window',
        key,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: counter.windowStart + windowMs,
      retryAfter: counter.windowStart + windowMs - now,
      strategy: 'fixed-window',
      key,
    };
  }

  private checkAdaptive(
    throttle: {
      options: Required<ThrottleOptions>;
      buckets: Map<string, TokenBucket | LeakyBucket | WindowCounter>;
      stats: { throttledRequests: number; totalRequests: number };
    },
    key: string,
    context: any,
  ): ThrottleResult {
    const throttleRate = throttle.stats.totalRequests > 0
      ? throttle.stats.throttledRequests / throttle.stats.totalRequests
      : 0;

    let effectiveCapacity = throttle.options.capacity;
    let effectiveRefillRate = throttle.options.refillRate;

    if (throttleRate > 0.5) {
      effectiveCapacity = Math.floor(throttle.options.capacity * 0.7);
      effectiveRefillRate = throttle.options.refillRate * 0.8;
    } else if (throttleRate < 0.1) {
      effectiveCapacity = Math.floor(throttle.options.capacity * 1.2);
      effectiveRefillRate = throttle.options.refillRate * 1.1;
    }

    const now = Date.now();
    let bucket = throttle.buckets.get(key) as TokenBucket | undefined;

    if (!bucket) {
      bucket = {
        tokens: effectiveCapacity,
        lastRefill: now,
      };
      throttle.buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refillAmount = (elapsed / 1000) * effectiveRefillRate;
    bucket.tokens = Math.min(effectiveCapacity, bucket.tokens + refillAmount);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: now + Math.ceil((effectiveCapacity - bucket.tokens) / effectiveRefillRate * 1000),
        strategy: 'adaptive',
        key,
      };
    }

    const retryAfter = Math.ceil((1 - bucket.tokens) / effectiveRefillRate * 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + retryAfter,
      retryAfter,
      strategy: 'adaptive',
      key,
    };
  }

  private startCleanup(throttleName: string): void {
    const throttle = this.throttles.get(throttleName);
    if (!throttle) return;

    throttle.cleanupTimer = setInterval(() => {
      this.cleanup(throttleName);
    }, throttle.options.windowMs * 2);
  }

  private cleanup(throttleName: string): void {
    const throttle = this.throttles.get(throttleName);
    if (!throttle) return;

    const now = Date.now();
    const maxAge = throttle.options.windowMs * 2;

    for (const [key, bucket] of throttle.buckets) {
      const lastActivity = (bucket as any).lastRefill || (bucket as any).lastLeak || (bucket as any).windowStart;

      if (now - lastActivity > maxAge) {
        throttle.buckets.delete(key);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
