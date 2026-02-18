import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export type RateLimitAlgorithm = 'fixed_window' | 'sliding_window' | 'token_bucket' | 'leaky_bucket';

export interface RateLimitConfig {
  key: string;
  limit: number;
  window: number;
  algorithm?: RateLimitAlgorithm;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (...args: any[]) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitPolicy {
  name: string;
  config: RateLimitConfig;
  condition?: (context: any) => boolean;
}

export interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly policies = new Map<string, RateLimitPolicy>();
  private readonly localBuckets = new Map<string, TokenBucketState>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.initializeDefaultPolicies();
    this.startCleanupInterval();
    this.logger.log('RateLimitService initialized');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  registerPolicy(policy: RateLimitPolicy): void {
    this.policies.set(policy.name, policy);
    this.logger.debug(`Rate limit policy registered: ${policy.name}`);
  }

  async check(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const fullConfig: RateLimitConfig = {
      key,
      limit: 100,
      window: 60000,
      algorithm: 'sliding_window',
      ...config,
    };

    switch (fullConfig.algorithm) {
      case 'fixed_window':
        return this.fixedWindowCheck(fullConfig);
      case 'sliding_window':
        return this.slidingWindowCheck(fullConfig);
      case 'token_bucket':
        return this.tokenBucketCheck(fullConfig);
      case 'leaky_bucket':
        return this.leakyBucketCheck(fullConfig);
      default:
        return this.slidingWindowCheck(fullConfig);
    }
  }

  async checkWithPolicy(
    policyName: string,
    context?: any,
    keySuffix?: string,
  ): Promise<RateLimitResult> {
    const policy = this.policies.get(policyName);

    if (!policy) {
      this.logger.warn(`Policy not found: ${policyName}`);
      return { allowed: true, limit: 0, remaining: 0, resetAt: Date.now() };
    }

    if (policy.condition && !policy.condition(context)) {
      return { allowed: true, limit: 0, remaining: 0, resetAt: Date.now() };
    }

    const key = keySuffix ? `${policy.config.key}:${keySuffix}` : policy.config.key;

    return this.check(key, policy.config);
  }

  async consume(
    key: string,
    tokens: number = 1,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const result = await this.check(key, config);

    if (result.allowed) {
      await this.increment(key, tokens, config);
    }

    return result;
  }

  async reset(key: string): Promise<void> {
    const fullKey = buildCacheKey('rate_limit', key);
    await this.redisService.del(fullKey);
    this.localBuckets.delete(key);
    this.logger.debug(`Rate limit reset for key: ${key}`);
  }

  async getStats(key: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetAt: number;
  } | null> {
    const fullKey = buildCacheKey('rate_limit', key);
    const data = await this.redisService.get(fullKey);

    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      current: parsed.count || parsed.tokens || 0,
      limit: parsed.limit || 100,
      remaining: parsed.remaining || 0,
      resetAt: parsed.resetAt || Date.now(),
    };
  }

  private async fixedWindowCheck(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / config.window) * config.window;
    const resetAt = windowStart + config.window;
    const key = buildCacheKey('rate_limit', config.key, windowStart.toString());

    const currentStr = await this.redisService.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    if (current >= config.limit) {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt,
        retryAfter: resetAt - now,
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - current - 1,
      resetAt,
    };
  }

  private async slidingWindowCheck(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.window;
    const key = buildCacheKey('rate_limit', config.key);

    const client = this.redisService.getClient();

    await client.zremrangebyscore(key, 0, windowStart);

    const count = await client.zcard(key);

    if (count >= config.limit) {
      const oldest = await client.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length > 1 ? parseInt(oldest[1], 10) + config.window : now + config.window;

      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt,
        retryAfter: resetAt - now,
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - count - 1,
      resetAt: now + config.window,
    };
  }

  private async tokenBucketCheck(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const key = buildCacheKey('rate_limit', config.key, 'bucket');

    let state: TokenBucketState | undefined = this.localBuckets.get(key);

    if (!state) {
      const stored = await this.redisService.get(key);
      if (stored) {
        state = JSON.parse(stored) as TokenBucketState;
      } else {
        state = {
          tokens: config.limit,
          lastRefill: now,
        };
      }
    }

    if (!state) {
      state = {
        tokens: config.limit,
        lastRefill: now,
      };
    }

    const timePassed = now - state.lastRefill;
    const refillRate = config.limit / config.window;
    const tokensToAdd = timePassed * refillRate;

    state.tokens = Math.min(config.limit, state.tokens + tokensToAdd);
    state.lastRefill = now;

    this.localBuckets.set(key, state);

    if (state.tokens < 1) {
      const timeToNextToken = (1 - state.tokens) / refillRate;

      return {
        allowed: false,
        limit: config.limit,
        remaining: Math.floor(state.tokens),
        resetAt: now + timeToNextToken,
        retryAfter: Math.ceil(timeToNextToken),
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.floor(state.tokens) - 1,
      resetAt: now + config.window,
    };
  }

  private async leakyBucketCheck(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const key = buildCacheKey('rate_limit', config.key, 'leaky');

    const stored = await this.redisService.get(key);
    const state = stored ? JSON.parse(stored) : { queue: [], lastLeak: now };

    const leakRate = config.limit / config.window;
    const timePassed = now - state.lastLeak;
    const leaked = timePassed * leakRate;

    state.queue = state.queue.slice(Math.ceil(leaked));
    state.lastLeak = now;

    if (state.queue.length >= config.limit) {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt: now + config.window,
        retryAfter: Math.ceil(config.window / config.limit),
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - state.queue.length - 1,
      resetAt: now + config.window,
    };
  }

  private async increment(
    key: string,
    tokens: number,
    config?: Partial<RateLimitConfig>,
  ): Promise<void> {
    const now = Date.now();
    const fullKey = buildCacheKey('rate_limit', key);

    if (config?.algorithm === 'sliding_window') {
      const client = this.redisService.getClient();
      const member = `${now}:${Math.random().toString(36).slice(2)}`;

      await client.zadd(fullKey, now, member);
      await client.expire(fullKey, Math.ceil((config.window || 60000) / 1000));
    } else if (config?.algorithm === 'token_bucket') {
      const bucketKey = buildCacheKey('rate_limit', key, 'bucket');
      const state = this.localBuckets.get(bucketKey);

      if (state) {
        state.tokens -= tokens;
        await this.redisService.set(bucketKey, JSON.stringify(state), 3600);
      }
    } else if (config?.algorithm === 'leaky_bucket') {
      const leakyKey = buildCacheKey('rate_limit', key, 'leaky');
      const stored = await this.redisService.get(leakyKey);
      const state = stored ? JSON.parse(stored) : { queue: [], lastLeak: now };

      state.queue.push(now);
      await this.redisService.set(leakyKey, JSON.stringify(state), 3600);
    } else {
      const windowStart = Math.floor(now / (config?.window || 60000)) * (config?.window || 60000);
      const windowKey = buildCacheKey('rate_limit', key, windowStart.toString());

      const current = await this.redisService.get(windowKey);
      const newCount = (current ? parseInt(current, 10) : 0) + tokens;

      await this.redisService.set(
        windowKey,
        newCount.toString(),
        Math.ceil((config?.window || 60000) / 1000),
      );
    }
  }

  private initializeDefaultPolicies(): void {
    this.registerPolicy({
      name: 'default',
      config: {
        key: 'default',
        limit: 100,
        window: 60000,
        algorithm: 'sliding_window',
      },
    });

    this.registerPolicy({
      name: 'auth',
      config: {
        key: 'auth',
        limit: 10,
        window: 60000,
        algorithm: 'sliding_window',
      },
    });

    this.registerPolicy({
      name: 'message',
      config: {
        key: 'message',
        limit: 60,
        window: 60000,
        algorithm: 'token_bucket',
      },
    });

    this.registerPolicy({
      name: 'api',
      config: {
        key: 'api',
        limit: 300,
        window: 60000,
        algorithm: 'sliding_window',
      },
    });

    this.registerPolicy({
      name: 'file_upload',
      config: {
        key: 'file_upload',
        limit: 10,
        window: 60000,
        algorithm: 'fixed_window',
      },
    });
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.localBuckets.clear();
    }, 60000);
  }
}

export const RateLimitPolicies = {
  DEFAULT: 'default',
  AUTH: 'auth',
  MESSAGE: 'message',
  API: 'api',
  FILE_UPLOAD: 'file_upload',
};
