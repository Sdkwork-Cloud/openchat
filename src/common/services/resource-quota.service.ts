import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventBusService, EventTypeConstants } from '../events/event-bus.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export type ResourceType = 
  | 'storage' 
  | 'bandwidth' 
  | 'messages' 
  | 'api_calls' 
  | 'websocket_connections'
  | 'file_uploads'
  | 'group_members'
  | 'friends';

export interface QuotaLimit {
  resourceType: ResourceType;
  limit: number;
  period: 'daily' | 'monthly' | 'total';
  resetAt?: number;
}

export interface QuotaUsage {
  resourceType: ResourceType;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  resetAt?: number;
}

export interface QuotaPolicy {
  name: string;
  limits: QuotaLimit[];
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
}

export interface QuotaCheckResult {
  allowed: boolean;
  usage: QuotaUsage;
  reason?: string;
}

@Injectable()
export class ResourceQuotaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResourceQuotaService.name);
  private readonly policies = new Map<string, QuotaPolicy>();
  private readonly userPolicies = new Map<string, string>();
  private readonly usageCache = new Map<string, number>();
  private resetInterval?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.initializeDefaultPolicies();
    this.startResetInterval();
    this.logger.log('ResourceQuotaService initialized');
  }

  onModuleDestroy() {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
    }
  }

  registerPolicy(policy: QuotaPolicy): void {
    this.policies.set(policy.name, policy);
    this.logger.debug(`Quota policy registered: ${policy.name}`);
  }

  setUserPolicy(userId: string, policyName: string): void {
    this.userPolicies.set(userId, policyName);
    this.logger.debug(`User ${userId} assigned to policy ${policyName}`);
  }

  async check(
    userId: string,
    resourceType: ResourceType,
    amount: number = 1,
  ): Promise<QuotaCheckResult> {
    const usage = await this.getUsage(userId, resourceType);

    if (usage.used + amount > usage.limit) {
      await this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, {
        type: 'quota.exceeded',
        userId,
        resourceType,
        used: usage.used,
        limit: usage.limit,
      });

      return {
        allowed: false,
        usage,
        reason: `Quota exceeded for ${resourceType}. Used: ${usage.used}, Limit: ${usage.limit}`,
      };
    }

    return {
      allowed: true,
      usage,
    };
  }

  async consume(
    userId: string,
    resourceType: ResourceType,
    amount: number = 1,
  ): Promise<QuotaUsage> {
    const check = await this.check(userId, resourceType, amount);

    if (!check.allowed) {
      throw new Error(check.reason || 'Quota exceeded');
    }

    const key = this.buildUsageKey(userId, resourceType);
    const current = await this.getCurrentUsage(key);
    const newUsage = current + amount;

    await this.setUsage(key, newUsage, check.usage.resetAt);

    const usage = await this.getUsage(userId, resourceType);

    if (usage.percentage >= 80) {
      await this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, {
        type: 'quota.warning',
        userId,
        resourceType,
        percentage: usage.percentage,
      });
    }

    return usage;
  }

  async release(
    userId: string,
    resourceType: ResourceType,
    amount: number = 1,
  ): Promise<QuotaUsage> {
    const key = this.buildUsageKey(userId, resourceType);
    const current = await this.getCurrentUsage(key);
    const newUsage = Math.max(0, current - amount);

    const usage = await this.getUsage(userId, resourceType);
    await this.setUsage(key, newUsage, usage.resetAt);

    return await this.getUsage(userId, resourceType);
  }

  async getUsage(userId: string, resourceType: ResourceType): Promise<QuotaUsage> {
    const policyName = this.userPolicies.get(userId) || 'free';
    const policy = this.policies.get(policyName);

    if (!policy) {
      return {
        resourceType,
        used: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
      };
    }

    const limit = policy.limits.find(
      (l) => l.resourceType === resourceType,
    );

    if (!limit) {
      return {
        resourceType,
        used: 0,
        limit: Infinity,
        remaining: Infinity,
        percentage: 0,
      };
    }

    const key = this.buildUsageKey(userId, resourceType);
    const used = await this.getCurrentUsage(key);
    const resetAt = this.calculateResetTime(limit.period);

    return {
      resourceType,
      used,
      limit: limit.limit,
      remaining: Math.max(0, limit.limit - used),
      percentage: limit.limit > 0 ? Math.min(100, (used / limit.limit) * 100) : 0,
      resetAt,
    };
  }

  async getAllUsage(userId: string): Promise<QuotaUsage[]> {
    const policyName = this.userPolicies.get(userId) || 'free';
    const policy = this.policies.get(policyName);

    if (!policy) return [];

    const usages: QuotaUsage[] = [];

    for (const limit of policy.limits) {
      const usage = await this.getUsage(userId, limit.resourceType);
      usages.push(usage);
    }

    return usages;
  }

  async reset(userId: string, resourceType: ResourceType): Promise<void> {
    const key = this.buildUsageKey(userId, resourceType);
    await this.redisService.del(key);
    this.usageCache.delete(key);

    this.logger.debug(`Reset quota for user ${userId}, resource ${resourceType}`);
  }

  async resetAll(userId: string): Promise<void> {
    const policyName = this.userPolicies.get(userId) || 'free';
    const policy = this.policies.get(policyName);

    if (!policy) return;

    for (const limit of policy.limits) {
      await this.reset(userId, limit.resourceType);
    }
  }

  getPolicy(policyName: string): QuotaPolicy | undefined {
    return this.policies.get(policyName);
  }

  getUserPolicy(userId: string): string {
    return this.userPolicies.get(userId) || 'free';
  }

  private buildUsageKey(userId: string, resourceType: ResourceType): string {
    return buildCacheKey('quota', userId, resourceType);
  }

  private async getCurrentUsage(key: string): Promise<number> {
    const cached = this.usageCache.get(key);
    if (cached !== undefined) return cached;

    const value = await this.redisService.get(key);
    const usage = value ? parseInt(value, 10) : 0;

    this.usageCache.set(key, usage);
    return usage;
  }

  private async setUsage(key: string, value: number, resetAt?: number): Promise<void> {
    this.usageCache.set(key, value);

    if (resetAt) {
      const ttl = Math.floor((resetAt - Date.now()) / 1000);
      await this.redisService.set(key, value.toString(), ttl);
    } else {
      await this.redisService.set(key, value.toString());
    }
  }

  private calculateResetTime(period: QuotaLimit['period']): number {
    const now = new Date();

    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      case 'total':
      default:
        return Date.now() + 365 * 24 * 60 * 60 * 1000;
    }
  }

  private startResetInterval(): void {
    this.resetInterval = setInterval(() => {
      this.usageCache.clear();
    }, 60000);
  }

  private initializeDefaultPolicies(): void {
    this.registerPolicy({
      name: 'free',
      tier: 'free',
      limits: [
        { resourceType: 'storage', limit: 100 * 1024 * 1024, period: 'total' },
        { resourceType: 'messages', limit: 1000, period: 'daily' },
        { resourceType: 'api_calls', limit: 10000, period: 'daily' },
        { resourceType: 'file_uploads', limit: 10, period: 'daily' },
        { resourceType: 'friends', limit: 100, period: 'total' },
        { resourceType: 'group_members', limit: 5, period: 'total' },
      ],
    });

    this.registerPolicy({
      name: 'basic',
      tier: 'basic',
      limits: [
        { resourceType: 'storage', limit: 1024 * 1024 * 1024, period: 'total' },
        { resourceType: 'messages', limit: 10000, period: 'daily' },
        { resourceType: 'api_calls', limit: 100000, period: 'daily' },
        { resourceType: 'file_uploads', limit: 100, period: 'daily' },
        { resourceType: 'friends', limit: 500, period: 'total' },
        { resourceType: 'group_members', limit: 20, period: 'total' },
      ],
    });

    this.registerPolicy({
      name: 'pro',
      tier: 'pro',
      limits: [
        { resourceType: 'storage', limit: 10 * 1024 * 1024 * 1024, period: 'total' },
        { resourceType: 'messages', limit: 100000, period: 'daily' },
        { resourceType: 'api_calls', limit: 1000000, period: 'daily' },
        { resourceType: 'file_uploads', limit: 1000, period: 'daily' },
        { resourceType: 'friends', limit: 2000, period: 'total' },
        { resourceType: 'group_members', limit: 100, period: 'total' },
      ],
    });

    this.registerPolicy({
      name: 'enterprise',
      tier: 'enterprise',
      limits: [
        { resourceType: 'storage', limit: 100 * 1024 * 1024 * 1024, period: 'total' },
        { resourceType: 'messages', limit: -1, period: 'daily' },
        { resourceType: 'api_calls', limit: -1, period: 'daily' },
        { resourceType: 'file_uploads', limit: -1, period: 'daily' },
        { resourceType: 'friends', limit: -1, period: 'total' },
        { resourceType: 'group_members', limit: -1, period: 'total' },
      ],
    });
  }
}

export function QuotaLimited(resourceType: ResourceType, amount: number = 1) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const quotaService = (this as any).quotaService as ResourceQuotaService;
      const userId = args[0]?.userId || args[0]?.id;

      if (quotaService && userId) {
        const check = await quotaService.check(userId, resourceType, amount);
        if (!check.allowed) {
          throw new Error(check.reason);
        }
      }

      const result = await originalMethod.apply(this, args);

      if (quotaService && userId) {
        await quotaService.consume(userId, resourceType, amount);
      }

      return result;
    };

    return descriptor;
  };
}
