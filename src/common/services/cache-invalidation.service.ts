import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export interface CacheInvalidationRule {
  entityType: string;
  patterns: string[];
  relatedEntities?: string[];
}

export interface CacheInvalidationContext {
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  userId?: string;
  metadata?: Record<string, any>;
}

export type CacheInvalidationHandler = (context: CacheInvalidationContext) => Promise<string[]>;

@Injectable()
export class CacheInvalidationService implements OnModuleInit {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private readonly rules = new Map<string, CacheInvalidationRule>();
  private readonly handlers = new Map<string, CacheInvalidationHandler>();
  private readonly pendingInvalidations = new Map<string, Set<string>>();
  private flushInterval?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit() {
    this.initializeDefaultRules();
    this.startFlushInterval();
    this.logger.log('CacheInvalidationService initialized');
  }

  registerRule(rule: CacheInvalidationRule): void {
    this.rules.set(rule.entityType, rule);
    this.logger.debug(`Cache invalidation rule registered: ${rule.entityType}`);
  }

  registerHandler(entityType: string, handler: CacheInvalidationHandler): void {
    this.handlers.set(entityType, handler);
    this.logger.debug(`Cache invalidation handler registered: ${entityType}`);
  }

  async invalidate(context: CacheInvalidationContext): Promise<void> {
    const keys = await this.getInvalidationKeys(context);

    if (keys.length === 0) {
      return;
    }

    this.logger.debug(
      `Invalidating ${keys.length} cache keys for ${context.entityType}:${context.entityId}`,
    );

    await Promise.all(keys.map((key) => this.cacheService.delete(key)));

    await this.invalidateRelatedEntities(context);
  }

  async invalidateBatch(contexts: CacheInvalidationContext[]): Promise<void> {
    const allKeys = new Set<string>();

    for (const context of contexts) {
      const keys = await this.getInvalidationKeys(context);
      keys.forEach((key) => allKeys.add(key));
    }

    if (allKeys.size === 0) {
      return;
    }

    this.logger.debug(`Batch invalidating ${allKeys.size} cache keys`);

    await Promise.all(
      Array.from(allKeys).map((key) => this.cacheService.delete(key)),
    );
  }

  scheduleInvalidation(context: CacheInvalidationContext): void {
    const batchKey = this.getBatchKey(context);

    if (!this.pendingInvalidations.has(batchKey)) {
      this.pendingInvalidations.set(batchKey, new Set());
    }

    const keys = this.getStaticKeys(context);
    keys.forEach((key) => this.pendingInvalidations.get(batchKey)!.add(key));
  }

  async flushPendingInvalidations(): Promise<void> {
    const allKeys = new Set<string>();

    for (const [, keys] of this.pendingInvalidations) {
      keys.forEach((key) => allKeys.add(key));
    }

    this.pendingInvalidations.clear();

    if (allKeys.size === 0) {
      return;
    }

    this.logger.debug(`Flushing ${allKeys.size} pending cache invalidations`);

    await Promise.all(
      Array.from(allKeys).map((key) => this.cacheService.delete(key)),
    );
  }

  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      buildCacheKey('user', userId),
      buildCacheKey('user', userId, '*'),
      buildCacheKey('permission', userId),
      buildCacheKey('permission', userId, '*'),
    ];

    await this.invalidateByPatterns(patterns);
  }

  async invalidateEntityCache(entityType: string, entityId: string): Promise<void> {
    const patterns = [
      buildCacheKey('entity', entityType, entityId),
      buildCacheKey('entity', entityType, entityId, '*'),
    ];

    await this.invalidateByPatterns(patterns);
  }

  async invalidateListCache(entityType: string): Promise<void> {
    const patterns = [
      buildCacheKey('list', entityType),
      buildCacheKey('list', entityType, '*'),
    ];

    await this.invalidateByPatterns(patterns);
  }

  private async getInvalidationKeys(context: CacheInvalidationContext): Promise<string[]> {
    const keys: string[] = [];

    const handler = this.handlers.get(context.entityType);
    if (handler) {
      const handlerKeys = await handler(context);
      keys.push(...handlerKeys);
    }

    const rule = this.rules.get(context.entityType);
    if (rule) {
      for (const pattern of rule.patterns) {
        const key = this.resolvePattern(pattern, context);
        keys.push(key);
      }
    }

    keys.push(...this.getStaticKeys(context));

    return [...new Set(keys)];
  }

  private getStaticKeys(context: CacheInvalidationContext): string[] {
    const keys: string[] = [];

    keys.push(buildCacheKey(context.entityType, context.entityId));

    if (context.userId) {
      keys.push(buildCacheKey(context.entityType, context.entityId, 'user', context.userId));
    }

    return keys;
  }

  private async invalidateRelatedEntities(context: CacheInvalidationContext): Promise<void> {
    const rule = this.rules.get(context.entityType);
    if (!rule?.relatedEntities) {
      return;
    }

    for (const relatedEntityType of rule.relatedEntities) {
      await this.invalidate({
        entityType: relatedEntityType,
        entityId: context.entityId,
        operation: context.operation,
        userId: context.userId,
        metadata: { triggeredBy: context.entityType },
      });
    }
  }

  private resolvePattern(pattern: string, context: CacheInvalidationContext): string {
    return pattern
      .replace('{entityType}', context.entityType)
      .replace('{entityId}', context.entityId)
      .replace('{userId}', context.userId || '')
      .replace('{operation}', context.operation);
  }

  private getBatchKey(context: CacheInvalidationContext): string {
    return `${context.entityType}:${context.operation}`;
  }

  private async invalidateByPatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern);
    }
  }

  private startFlushInterval(): void {
    const interval = this.configService.get<number>('CACHE_FLUSH_INTERVAL', 5000);
    this.flushInterval = setInterval(() => {
      this.flushPendingInvalidations().catch((error) => {
        this.logger.error('Failed to flush pending invalidations:', error);
      });
    }, interval);
  }

  private initializeDefaultRules(): void {
    this.registerRule({
      entityType: 'user',
      patterns: [
        buildCacheKey('user', '{entityId}'),
        buildCacheKey('user', '{entityId}', '*'),
      ],
      relatedEntities: ['friend', 'group'],
    });

    this.registerRule({
      entityType: 'friend',
      patterns: [
        buildCacheKey('user', '{userId}', 'friends'),
        buildCacheKey('friend', '{entityId}'),
      ],
      relatedEntities: ['conversation'],
    });

    this.registerRule({
      entityType: 'group',
      patterns: [
        buildCacheKey('group', '{entityId}'),
        buildCacheKey('group', '{entityId}', '*'),
        buildCacheKey('user', '{userId}', 'groups'),
      ],
      relatedEntities: ['conversation'],
    });

    this.registerRule({
      entityType: 'message',
      patterns: [
        buildCacheKey('message', '{entityId}'),
        buildCacheKey('conversation', '{userId}', '*'),
      ],
    });

    this.registerRule({
      entityType: 'conversation',
      patterns: [
        buildCacheKey('conversation', '{entityId}'),
        buildCacheKey('conversation', '{userId}', '*'),
      ],
    });
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

export function CacheInvalidation(entityType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheInvalidationService = (this as any).cacheInvalidationService as CacheInvalidationService;
      if (cacheInvalidationService) {
        const entityId = result?.id || args[0]?.id;
        const userId = result?.userId || args[0]?.userId;

        if (entityId) {
          await cacheInvalidationService.invalidate({
            entityType,
            entityId,
            operation: propertyKey.includes('create') ? 'create' :
                      propertyKey.includes('update') ? 'update' : 'delete',
            userId,
          });
        }
      }

      return result;
    };

    return descriptor;
  };
}
