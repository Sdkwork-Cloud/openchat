import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_PREFIX = 'openchat';
export const CACHE_TTL_KEY = 'cache:ttl';
export const CACHE_KEY_KEY = 'cache:key';
export const CACHE_CONDITION_KEY = 'cache:condition';

export interface CacheDecoratorOptions {
  key: string;
  ttl?: number;
  condition?: (args: any) => boolean;
}

export function Cacheable(options: CacheDecoratorOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_KEY, options.key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_KEY, options.ttl || 300)(target, propertyKey, descriptor);
    if (options.condition) {
      SetMetadata(CACHE_CONDITION_KEY, options.condition)(target, propertyKey, descriptor);
    }
    return descriptor;
  };
}

export function CacheEvict(key: string): MethodDecorator {
  return SetMetadata('cache:evict', key);
}

export function CachePut(key: string): MethodDecorator {
  return SetMetadata('cache:put', key);
}

export function buildCacheKey(...parts: (string | number)[]): string {
  return `${CACHE_KEY_PREFIX}:${parts.join(':')}`;
}

export function buildUserCacheKey(userId: string, ...parts: (string | number)[]): string {
  return buildCacheKey('user', userId, ...parts);
}

export function buildEntityCacheKey(entityType: string, entityId: string): string {
  return buildCacheKey('entity', entityType, entityId);
}

export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  VERY_LONG: 86400,
  USER_SESSION: 7200,
  USER_PROFILE: 1800,
  USER_FRIENDS: 600,
  USER_GROUPS: 600,
  MESSAGE_LIST: 60,
  CONVERSATION_LIST: 120,
};
