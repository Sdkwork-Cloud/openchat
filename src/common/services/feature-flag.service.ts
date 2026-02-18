import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  conditions?: FeatureCondition[];
  variants?: FeatureVariant[];
  rolloutPercentage?: number;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface FeatureCondition {
  type: 'user_id' | 'user_role' | 'user_segment' | 'environment' | 'time' | 'custom';
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte' | 'matches';
  field: string;
  value: any;
}

export interface FeatureVariant {
  name: string;
  percentage: number;
  payload?: any;
}

export interface FeatureContext {
  userId?: string;
  userRole?: string;
  userSegment?: string;
  environment?: string;
  custom?: Record<string, any>;
}

export interface FeatureEvaluationResult {
  enabled: boolean;
  variant?: string;
  payload?: any;
  reason: string;
}

@Injectable()
export class FeatureFlagService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly flags = new Map<string, FeatureFlag>();
  private refreshInterval?: NodeJS.Timeout;
  private readonly cachePrefix = 'feature_flags';

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.loadFlags();
    this.startRefreshInterval();
    this.logger.log('FeatureFlagService initialized');
  }

  onModuleDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async isFeatureEnabled(key: string, context?: FeatureContext): Promise<boolean> {
    const result = await this.evaluate(key, context);
    return result.enabled;
  }

  async evaluate(key: string, context?: FeatureContext): Promise<FeatureEvaluationResult> {
    const flag = this.flags.get(key);

    if (!flag) {
      return {
        enabled: false,
        reason: 'Feature flag not found',
      };
    }

    if (!flag.enabled) {
      return {
        enabled: false,
        reason: 'Feature flag is disabled',
      };
    }

    if (flag.conditions && flag.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(flag.conditions, context);
      if (!conditionsMet) {
        return {
          enabled: false,
          reason: 'Conditions not met',
        };
      }
    }

    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(context?.userId || key);
      if (hash >= flag.rolloutPercentage) {
        return {
          enabled: false,
          reason: 'Rollout percentage not met',
        };
      }
    }

    if (flag.variants && flag.variants.length > 0) {
      const variant = this.selectVariant(flag.variants, context?.userId || key);
      return {
        enabled: true,
        variant: variant.name,
        payload: variant.payload,
        reason: 'Variant selected',
      };
    }

    return {
      enabled: true,
      reason: 'Feature flag enabled',
    };
  }

  async getVariant(key: string, context?: FeatureContext): Promise<string | undefined> {
    const result = await this.evaluate(key, context);
    return result.variant;
  }

  async getPayload(key: string, context?: FeatureContext): Promise<any> {
    const result = await this.evaluate(key, context);
    return result.payload;
  }

  async setFlag(flag: Partial<FeatureFlag> & { key: string }): Promise<void> {
    const existingFlag = this.flags.get(flag.key);

    const newFlag: FeatureFlag = {
      key: flag.key,
      enabled: flag.enabled ?? true,
      description: flag.description,
      conditions: flag.conditions,
      variants: flag.variants,
      rolloutPercentage: flag.rolloutPercentage,
      metadata: flag.metadata,
      createdAt: existingFlag?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    this.flags.set(flag.key, newFlag);
    await this.persistFlag(newFlag);

    this.logger.debug(`Feature flag set: ${flag.key}`);
  }

  async enable(key: string): Promise<void> {
    await this.setFlag({ key, enabled: true });
  }

  async disable(key: string): Promise<void> {
    await this.setFlag({ key, enabled: false });
  }

  async deleteFlag(key: string): Promise<boolean> {
    if (!this.flags.has(key)) {
      return false;
    }

    this.flags.delete(key);
    await this.redisService.del(buildCacheKey(this.cachePrefix, key));

    this.logger.debug(`Feature flag deleted: ${key}`);
    return true;
  }

  async getFlag(key: string): Promise<FeatureFlag | undefined> {
    return this.flags.get(key);
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async getEnabledFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values()).filter((f) => f.enabled);
  }

  private evaluateConditions(
    conditions: FeatureCondition[],
    context?: FeatureContext,
  ): boolean {
    if (!context) return false;

    for (const condition of conditions) {
      const value = this.getContextValue(condition.type, context);
      const result = this.evaluateCondition(condition, value);

      if (!result) {
        return false;
      }
    }

    return true;
  }

  private getContextValue(type: string, context: FeatureContext): any {
    switch (type) {
      case 'user_id':
        return context.userId;
      case 'user_role':
        return context.userRole;
      case 'user_segment':
        return context.userSegment;
      case 'environment':
        return context.environment;
      case 'custom':
        return context.custom;
      default:
        return undefined;
    }
  }

  private evaluateCondition(condition: FeatureCondition, value: any): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lte':
        return value <= condition.value;
      case 'matches':
        return new RegExp(condition.value).test(value);
      default:
        return false;
    }
  }

  private selectVariant(variants: FeatureVariant[], userId: string): FeatureVariant {
    const hash = this.hashUserId(userId);
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.percentage;
      if (hash < cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  private async loadFlags(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(`${this.cachePrefix}:*`);

      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const flag = JSON.parse(data) as FeatureFlag;
          this.flags.set(flag.key, flag);
        }
      }

      this.logger.debug(`Loaded ${this.flags.size} feature flags`);
    } catch (error) {
      this.logger.error('Failed to load feature flags:', error);
    }
  }

  private async persistFlag(flag: FeatureFlag): Promise<void> {
    const key = buildCacheKey(this.cachePrefix, flag.key);
    await this.redisService.set(key, JSON.stringify(flag));
  }

  private startRefreshInterval(): void {
    const interval = this.configService.get<number>('FEATURE_FLAGS_REFRESH_INTERVAL', 60000);

    this.refreshInterval = setInterval(() => {
      this.loadFlags().catch((err) => {
        this.logger.error('Failed to refresh feature flags:', err);
      });
    }, interval);
  }
}

export function FeatureEnabled(key: string, contextGetter?: (...args: any[]) => FeatureContext) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const featureFlagService = (this as any).featureFlagService as FeatureFlagService;

      if (!featureFlagService) {
        return originalMethod.apply(this, args);
      }

      const context = contextGetter ? contextGetter(...args) : undefined;
      const enabled = await featureFlagService.isFeatureEnabled(key, context);

      if (!enabled) {
        return undefined;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export const FeatureFlags = {
  NEW_MESSAGE_UI: 'new_message_ui',
  GROUP_VIDEO_CALL: 'group_video_call',
  MESSAGE_EDITING: 'message_editing',
  VOICE_MESSAGES: 'voice_messages',
  DARK_MODE: 'dark_mode',
  TWO_FACTOR_AUTH: 'two_factor_auth',
  MESSAGE_REACTIONS: 'message_reactions',
  THREAD_REPLIES: 'thread_replies',
  MESSAGE_SEARCH: 'message_search',
  FILE_SHARING: 'file_sharing',
} as const;
