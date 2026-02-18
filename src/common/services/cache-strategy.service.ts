import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CacheStrategy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'adaptive';
export type EvictionReason = 'expired' | 'evicted' | 'manual' | 'overflow';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  ttl?: number;
  expiresAt?: number;
  priority: number;
  size: number;
  metadata?: Record<string, any>;
}

export interface CacheStrategyOptions {
  name: string;
  strategy?: CacheStrategy;
  maxSize?: number;
  maxMemory?: number;
  defaultTtl?: number;
  cleanupInterval?: number;
  statsEnabled?: boolean;
  onEviction?: (key: string, entry: CacheEntry, reason: EvictionReason) => void;
}

export interface CacheStats {
  name: string;
  strategy: CacheStrategy;
  size: number;
  memoryUsage: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  expirations: number;
  averageAccessTime: number;
}

export interface SetOptions {
  ttl?: number;
  priority?: number;
  size?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class CacheStrategyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheStrategyService.name);
  private readonly caches = new Map<string, {
    options: Required<CacheStrategyOptions>;
    entries: Map<string, CacheEntry>;
    stats: {
      hits: number;
      misses: number;
      evictions: number;
      expirations: number;
      totalAccessTime: number;
      accessCount: number;
    };
    cleanupTimer?: NodeJS.Timeout;
    accessOrder: string[];
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('CacheStrategyService initialized');
  }

  onModuleDestroy() {
    for (const [, cache] of this.caches) {
      if (cache.cleanupTimer) {
        clearInterval(cache.cleanupTimer);
      }
    }
  }

  createCache(options: CacheStrategyOptions): void {
    const name = options.name;

    if (this.caches.has(name)) {
      throw new Error(`Cache '${name}' already exists`);
    }

    const defaultOptions: Required<CacheStrategyOptions> = {
      name,
      strategy: options.strategy || 'lru',
      maxSize: options.maxSize || 1000,
      maxMemory: options.maxMemory || 100 * 1024 * 1024,
      defaultTtl: options.defaultTtl || 3600000,
      cleanupInterval: options.cleanupInterval || 60000,
      statsEnabled: options.statsEnabled !== false,
      onEviction: options.onEviction || (() => {}),
    };

    const cache = {
      options: defaultOptions,
      entries: new Map<string, CacheEntry>(),
      stats: {
        hits: 0,
        misses: 0,
        evictions: 0,
        expirations: 0,
        totalAccessTime: 0,
        accessCount: 0,
      },
      accessOrder: [],
    };

    this.caches.set(name, cache);
    this.startCleanup(name);

    this.logger.log(`Cache '${name}' created with strategy=${defaultOptions.strategy}, maxSize=${defaultOptions.maxSize}`);
  }

  get<T = any>(cacheName: string, key: string): T | undefined {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    const entry = cache.entries.get(key);

    if (!entry) {
      cache.stats.misses++;
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(cacheName, key, 'expired');
      cache.stats.misses++;
      cache.stats.expirations++;
      return undefined;
    }

    const accessTime = Date.now();
    entry.lastAccessedAt = accessTime;
    entry.accessCount++;

    this.updateAccessOrder(cache, key);

    cache.stats.hits++;
    cache.stats.totalAccessTime += accessTime - entry.createdAt;
    cache.stats.accessCount++;

    return entry.value;
  }

  async getOrSet<T = any>(
    cacheName: string,
    key: string,
    factory: () => Promise<T>,
    options?: SetOptions,
  ): Promise<T> {
    const cached = this.get<T>(cacheName, key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(cacheName, key, value, options);
    return value;
  }

  set<T = any>(
    cacheName: string,
    key: string,
    value: T,
    options?: SetOptions,
  ): void {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    const ttl = options?.ttl ?? cache.options.defaultTtl;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      ttl,
      expiresAt: ttl ? now + ttl : undefined,
      priority: options?.priority || 0,
      size: options?.size || this.estimateSize(value),
      metadata: options?.metadata,
    };

    if (cache.entries.has(key)) {
      cache.entries.set(key, entry);
      return;
    }

    while (this.shouldEvict(cache, entry)) {
      this.evict(cache);
    }

    cache.entries.set(key, entry);
    this.updateAccessOrder(cache, key);
  }

  delete(cacheName: string, key: string, reason: EvictionReason = 'manual'): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) return false;

    const entry = cache.entries.get(key);
    if (!entry) return false;

    cache.entries.delete(key);
    cache.accessOrder = cache.accessOrder.filter(k => k !== key);

    if (reason === 'evicted') {
      cache.stats.evictions++;
    }

    cache.options.onEviction(key, entry, reason);

    return true;
  }

  has(cacheName: string, key: string): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) return false;

    const entry = cache.entries.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(cacheName, key, 'expired');
      return false;
    }

    return true;
  }

  clear(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    for (const [key, entry] of cache.entries) {
      cache.options.onEviction(key, entry, 'manual');
    }

    cache.entries.clear();
    cache.accessOrder = [];
  }

  getStats(cacheName: string): CacheStats {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    const totalRequests = cache.stats.hits + cache.stats.misses;
    const hitRate = totalRequests > 0 ? (cache.stats.hits / totalRequests) * 100 : 0;
    const avgAccessTime = cache.stats.accessCount > 0
      ? cache.stats.totalAccessTime / cache.stats.accessCount
      : 0;

    let memoryUsage = 0;
    for (const entry of cache.entries.values()) {
      memoryUsage += entry.size;
    }

    return {
      name: cacheName,
      strategy: cache.options.strategy,
      size: cache.entries.size,
      memoryUsage,
      hits: cache.stats.hits,
      misses: cache.stats.misses,
      hitRate,
      evictions: cache.stats.evictions,
      expirations: cache.stats.expirations,
      averageAccessTime: avgAccessTime,
    };
  }

  getAllStats(): CacheStats[] {
    const stats: CacheStats[] = [];
    for (const name of this.caches.keys()) {
      stats.push(this.getStats(name));
    }
    return stats;
  }

  keys(cacheName: string): string[] {
    const cache = this.caches.get(cacheName);
    if (!cache) return [];
    return Array.from(cache.entries.keys());
  }

  values<T = any>(cacheName: string): T[] {
    const cache = this.caches.get(cacheName);
    if (!cache) return [];
    return Array.from(cache.entries.values()).map(e => e.value);
  }

  entries<T = any>(cacheName: string): Array<{ key: string; value: T; entry: CacheEntry<T> }> {
    const cache = this.caches.get(cacheName);
    if (!cache) return [];
    return Array.from(cache.entries.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      entry: entry as CacheEntry<T>,
    }));
  }

  destroyCache(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    if (cache.cleanupTimer) {
      clearInterval(cache.cleanupTimer);
    }

    this.caches.delete(cacheName);
    this.logger.log(`Cache '${cacheName}' destroyed`);
  }

  private shouldEvict(cache: {
    options: Required<CacheStrategyOptions>;
    entries: Map<string, CacheEntry>;
  }, newEntry: CacheEntry): boolean {
    if (cache.entries.size >= cache.options.maxSize) {
      return true;
    }

    let currentMemory = 0;
    for (const entry of cache.entries.values()) {
      currentMemory += entry.size;
    }

    if (currentMemory + newEntry.size > cache.options.maxMemory) {
      return true;
    }

    return false;
  }

  private evict(cache: {
    options: Required<CacheStrategyOptions>;
    entries: Map<string, CacheEntry>;
    accessOrder: string[];
    stats: { evictions: number };
  }): void {
    let keyToEvict: string | undefined;

    switch (cache.options.strategy) {
      case 'lru':
        keyToEvict = cache.accessOrder[0];
        break;

      case 'lfu':
        let minAccessCount = Infinity;
        for (const [key, entry] of cache.entries) {
          if (entry.accessCount < minAccessCount) {
            minAccessCount = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;

      case 'fifo':
        keyToEvict = cache.accessOrder[0];
        break;

      case 'ttl':
        let earliestExpiry = Infinity;
        for (const [key, entry] of cache.entries) {
          if (entry.expiresAt && entry.expiresAt < earliestExpiry) {
            earliestExpiry = entry.expiresAt;
            keyToEvict = key;
          }
        }
        if (!keyToEvict) {
          keyToEvict = cache.accessOrder[0];
        }
        break;

      case 'adaptive':
        keyToEvict = this.selectAdaptiveEviction(cache);
        break;

      default:
        keyToEvict = cache.accessOrder[0];
    }

    if (keyToEvict) {
      this.delete(cache.options.name, keyToEvict, 'evicted');
    }
  }

  private selectAdaptiveEviction(cache: {
    options: Required<CacheStrategyOptions>;
    entries: Map<string, CacheEntry>;
    accessOrder: string[];
  }): string | undefined {
    const scores: Array<{ key: string; score: number }> = [];

    const now = Date.now();

    for (const [key, entry] of cache.entries) {
      const recency = (now - entry.lastAccessedAt) / 1000;
      const frequency = entry.accessCount;
      const size = entry.size / 1024;
      const priority = entry.priority;

      const ttlFactor = entry.expiresAt
        ? Math.max(0, (entry.expiresAt - now) / entry.ttl!)
        : 1;

      const score =
        (1 / (recency + 1)) * 0.3 +
        frequency * 0.3 +
        (1 / (size + 1)) * 0.2 +
        priority * 0.1 +
        ttlFactor * 0.1;

      scores.push({ key, score });
    }

    scores.sort((a, b) => a.score - b.score);
    return scores[0]?.key;
  }

  private updateAccessOrder(cache: {
    accessOrder: string[];
  }, key: string): void {
    const index = cache.accessOrder.indexOf(key);
    if (index !== -1) {
      cache.accessOrder.splice(index, 1);
    }
    cache.accessOrder.push(key);
  }

  private startCleanup(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    cache.cleanupTimer = setInterval(() => {
      this.cleanupExpired(cacheName);
    }, cache.options.cleanupInterval);
  }

  private cleanupExpired(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of cache.entries) {
      if (entry.expiresAt && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(cacheName, key, 'expired');
      cache.stats.expirations++;
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired entries from cache '${cacheName}'`);
    }
  }

  private estimateSize(value: any): number {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'string') {
      return value.length * 2;
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (Buffer.isBuffer(value)) {
      return value.length;
    }

    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024;
    }
  }
}
