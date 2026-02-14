/**
 * LRU (Least Recently Used) 缓存实现
 *
 * 职责：提供高效的键值缓存，自动淘汰最少使用的项
 * 应用：消息缓存、Markdown 解析结果缓存、图片缓存
 */

interface CacheEntry<V> {
  value: V;
  size: number;
  lastAccessed: number;
}

interface LRUCacheOptions {
  maxSize?: number;        // 最大条目数
  maxBytes?: number;       // 最大字节数
  ttl?: number;            // 过期时间 (ms)
}

/**
 * LRU 缓存类
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private currentSize = 0;
  private currentBytes = 0;
  private options: Required<LRUCacheOptions>;

  constructor(options: LRUCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      maxBytes: options.maxBytes ?? 50 * 1024 * 1024, // 50MB
      ttl: options.ttl ?? 0, // 0 表示不过期
    };
  }

  /**
   * 获取缓存值
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (this.options.ttl > 0) {
      const now = Date.now();
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        return undefined;
      }
    }

    // 更新访问时间
    entry.lastAccessed = Date.now();
    
    // 移动到最新（重新设置保持顺序）
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V, size?: number): boolean {
    const entrySize = size ?? this.estimateSize(value);

    // 如果单个项超过最大字节限制，不缓存
    if (entrySize > this.options.maxBytes) {
      return false;
    }

    // 如果已存在，先删除旧值
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // 清理空间
    while (
      this.currentSize >= this.options.maxSize ||
      this.currentBytes + entrySize > this.options.maxBytes
    ) {
      this.evictLRU();
    }

    // 添加新值
    const entry: CacheEntry<V> = {
      value,
      size: entrySize,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.currentSize++;
    this.currentBytes += entrySize;

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.currentSize--;
    this.currentBytes -= entry.size;

    return true;
  }

  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (this.options.ttl > 0) {
      const now = Date.now();
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * 获取或设置
   */
  getOrSet(key: K, factory: () => V, size?: number): V {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    this.set(key, value, size);
    return value;
  }

  /**
   * 异步获取或设置
   */
  async getOrSetAsync(key: K, factory: () => Promise<V>, size?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, size);
    return value;
  }

  /**
   * 淘汰最少使用的项
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.delete(firstKey);
    }
  }

  /**
   * 清理过期项
   */
  purgeStale(): number {
    if (this.options.ttl <= 0) {
      return 0;
    }

    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        purged++;
      }
    }

    return purged;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.currentBytes = 0;
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.currentSize,
      bytes: this.currentBytes,
      maxSize: this.options.maxSize,
      maxBytes: this.options.maxBytes,
      utilization: this.currentSize / this.options.maxSize,
      byteUtilization: this.currentBytes / this.options.maxBytes,
    };
  }

  /**
   * 获取所有键
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 获取所有值
   */
  values(): V[] {
    return Array.from(this.cache.values()).map((entry) => entry.value);
  }

  /**
   * 获取所有条目
   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * 遍历缓存
   */
  forEach(callback: (value: V, key: K) => void): void {
    this.cache.forEach((entry, key) => {
      callback(entry.value, key);
    });
  }

  /**
   * 估算值大小
   */
  private estimateSize(value: V): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const type = typeof value;

    switch (type) {
      case 'boolean':
        return 4;
      case 'number':
        return 8;
      case 'string':
        return (value as string).length * 2;
      case 'object':
        if (value instanceof ArrayBuffer) {
          return value.byteLength;
        }
        if (value instanceof Blob) {
          return value.size;
        }
        // 粗略估算对象大小
        return JSON.stringify(value).length * 2;
      default:
        return 0;
    }
  }
}

/**
 * 创建带命名空间的 LRU 缓存
 */
export function createNamespacedCache<V>(
  _namespace: string,
  options: LRUCacheOptions = {}
): LRUCache<string, V> {
  return new LRUCache<string, V>(options);
}

// 全局缓存实例
const globalCaches = new Map<string, LRUCache<string, unknown>>();

/**
 * 获取或创建全局缓存
 */
export function getGlobalCache<V>(name: string, options?: LRUCacheOptions): LRUCache<string, V> {
  if (!globalCaches.has(name)) {
    globalCaches.set(name, new LRUCache<string, V>(options));
  }
  return globalCaches.get(name) as LRUCache<string, V>;
}

/**
 * 清理所有全局缓存
 */
export function clearAllGlobalCaches(): void {
  globalCaches.forEach((cache) => cache.clear());
}

/**
 * 获取所有缓存统计
 */
export function getAllCacheStats(): Record<string, ReturnType<LRUCache<string, unknown>['getStats']>> {
  const stats: Record<string, ReturnType<LRUCache<string, unknown>['getStats']>> = {};
  globalCaches.forEach((cache, name) => {
    stats[name] = cache.getStats();
  });
  return stats;
}
