import {
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { ObjectLiteral } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { CacheService } from '../services/cache.service';

export interface CacheableEntityConfig {
  prefix: string;
  ttl: number;
  keyFields?: string[];
  invalidateOn?: string[];
}

export interface CacheInvalidationRule {
  entityName: string;
  keyPattern: string;
  fields?: string[];
}

@Injectable()
export abstract class CacheableService<T extends BaseEntity & ObjectLiteral> {
  protected abstract readonly logger: Logger;
  protected abstract readonly entityName: string;
  protected abstract readonly cacheService: CacheService;
  protected readonly cacheConfig: CacheableEntityConfig = {
    prefix: '',
    ttl: 300,
  };

  protected buildCacheKey(id: string, suffix?: string): string {
    const prefix = this.cacheConfig.prefix || this.entityName.toLowerCase();
    return suffix ? `${prefix}:${id}:${suffix}` : `${prefix}:${id}`;
  }

  protected buildCacheKeyByFields(entity: Partial<T>): string {
    const prefix = this.cacheConfig.prefix || this.entityName.toLowerCase();
    const keyFields = this.cacheConfig.keyFields || ['id'];
    const keyParts = keyFields.map(field => entity[field as keyof T]).join(':');
    return `${prefix}:${keyParts}`;
  }

  protected async getFromCache<R>(key: string): Promise<R | null> {
    try {
      return await this.cacheService.get<R>(key);
    } catch (error) {
      this.logger.warn(`Cache get failed for key ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  protected async setToCache<R>(key: string, value: R, ttl?: number): Promise<void> {
    try {
      await this.cacheService.set(key, value, { ttl: ttl || this.cacheConfig.ttl });
    } catch (error) {
      this.logger.warn(`Cache set failed for key ${key}: ${(error as Error).message}`);
    }
  }

  protected async deleteFromCache(key: string): Promise<void> {
    try {
      await this.cacheService.delete(key);
    } catch (error) {
      this.logger.warn(`Cache delete failed for key ${key}: ${(error as Error).message}`);
    }
  }

  protected async deleteCachePattern(pattern: string): Promise<void> {
    try {
      await this.cacheService.deletePattern(pattern);
    } catch (error) {
      this.logger.warn(`Cache pattern delete failed for ${pattern}: ${(error as Error).message}`);
    }
  }

  protected async getOrSetCache<R>(
    key: string,
    factory: () => Promise<R>,
    ttl?: number,
  ): Promise<R> {
    const cached = await this.getFromCache<R>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.setToCache(key, value, ttl);
    return value;
  }

  protected async invalidateEntityCache(entityId: string): Promise<void> {
    const key = this.buildCacheKey(entityId);
    await this.deleteFromCache(key);
    
    const pattern = `${this.cacheConfig.prefix || this.entityName.toLowerCase()}:${entityId}:*`;
    await this.deleteCachePattern(pattern);
  }

  protected async invalidateListCache(): Promise<void> {
    const pattern = `${this.cacheConfig.prefix || this.entityName.toLowerCase()}:list:*`;
    await this.deleteCachePattern(pattern);
  }

  protected async invalidateAllCache(): Promise<void> {
    const pattern = `${this.cacheConfig.prefix || this.entityName.toLowerCase()}:*`;
    await this.deleteCachePattern(pattern);
  }

  protected withCacheInvalidation<R>(
    operation: string,
    entityId: string,
    action: () => Promise<R>,
  ): Promise<R> {
    return action().finally(() => {
      this.invalidateEntityCache(entityId).catch(err => {
        this.logger.error(`Failed to invalidate cache for ${operation}:`, err);
      });
    });
  }
}

export const BASE_CACHE_KEY = 'cache:key';
export const BASE_CACHE_TTL = 'cache:ttl';
export const BASE_CACHE_INVALIDATE = 'cache:invalidate';

export function CacheableMethod(key: string, ttl: number = 300): MethodDecorator {
  return SetMetadata(BASE_CACHE_KEY, key) && SetMetadata(BASE_CACHE_TTL, ttl);
}

export function CacheInvalidateMethod(...keys: string[]): MethodDecorator {
  return SetMetadata(BASE_CACHE_INVALIDATE, keys);
}
