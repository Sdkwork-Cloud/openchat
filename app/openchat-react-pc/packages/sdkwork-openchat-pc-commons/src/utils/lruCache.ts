/**
 * LRU (Least Recently Used) 缂撳瓨瀹炵幇
 *
 * 鑱岃矗锛氭彁渚涢珮鏁堢殑閿€肩紦瀛橈紝鑷姩娣樻卑鏈€灏戜娇鐢ㄧ殑椤? * 搴旂敤锛氭秷鎭紦瀛樸€丮arkdown 瑙ｆ瀽缁撴灉缂撳瓨銆佸浘鐗囩紦瀛? */

interface CacheEntry<V> {
  value: V;
  size: number;
  lastAccessed: number;
}

interface LRUCacheOptions {
  maxSize?: number;        // 鏈€澶ф潯鐩暟
  maxBytes?: number;       // 鏈€澶у瓧鑺傛暟
  ttl?: number;            // 杩囨湡鏃堕棿 (ms)
}

/**
 * LRU 缂撳瓨绫? */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private currentSize = 0;
  private currentBytes = 0;
  private options: Required<LRUCacheOptions>;

  constructor(options: LRUCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      maxBytes: options.maxBytes ?? 50 * 1024 * 1024, // 50MB
      ttl: options.ttl ?? 0, // 0 琛ㄧず涓嶈繃鏈?    };
  }

  /**
   * 鑾峰彇缂撳瓨鍊?   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // 妫€鏌ユ槸鍚﹁繃鏈?    if (this.options.ttl > 0) {
      const now = Date.now();
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        return undefined;
      }
    }

    // 鏇存柊璁块棶鏃堕棿
    entry.lastAccessed = Date.now();
    
    // 绉诲姩鍒版渶鏂帮紙閲嶆柊璁剧疆淇濇寔椤哄簭锛?    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * 璁剧疆缂撳瓨鍊?   */
  set(key: K, value: V, size?: number): boolean {
    const entrySize = size ?? this.estimateSize(value);

    // 濡傛灉鍗曚釜椤硅秴杩囨渶澶у瓧鑺傞檺鍒讹紝涓嶇紦瀛?    if (entrySize > this.options.maxBytes) {
      return false;
    }

    // 濡傛灉宸插瓨鍦紝鍏堝垹闄ゆ棫鍊?    if (this.cache.has(key)) {
      this.delete(key);
    }

    // 娓呯悊绌洪棿
    while (
      this.currentSize >= this.options.maxSize ||
      this.currentBytes + entrySize > this.options.maxBytes
    ) {
      this.evictLRU();
    }

    // 娣诲姞鏂板€?    const entry: CacheEntry<V> = {
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
   * 鍒犻櫎缂撳瓨椤?   */
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
   * 妫€鏌ユ槸鍚﹀瓨鍦?   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // 妫€鏌ユ槸鍚﹁繃鏈?    if (this.options.ttl > 0) {
      const now = Date.now();
      if (now - entry.lastAccessed > this.options.ttl) {
        this.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * 鑾峰彇鎴栬缃?   */
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
   * 寮傛鑾峰彇鎴栬缃?   */
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
   * 娣樻卑鏈€灏戜娇鐢ㄧ殑椤?   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.delete(firstKey);
    }
  }

  /**
   * 娓呯悊杩囨湡椤?   */
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
   * 娓呯┖缂撳瓨
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.currentBytes = 0;
  }

  /**
   * 鑾峰彇缂撳瓨缁熻
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
   * 鑾峰彇鎵€鏈夐敭
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 鑾峰彇鎵€鏈夊€?   */
  values(): V[] {
    return Array.from(this.cache.values()).map((entry) => entry.value);
  }

  /**
   * 鑾峰彇鎵€鏈夋潯鐩?   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * 閬嶅巻缂撳瓨
   */
  forEach(callback: (value: V, key: K) => void): void {
    this.cache.forEach((entry, key) => {
      callback(entry.value, key);
    });
  }

  /**
   * 浼扮畻鍊煎ぇ灏?   */
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
        // 绮楃暐浼扮畻瀵硅薄澶у皬
        return JSON.stringify(value).length * 2;
      default:
        return 0;
    }
  }
}

/**
 * 鍒涘缓甯﹀懡鍚嶇┖闂寸殑 LRU 缂撳瓨
 */
export function createNamespacedCache<V>(
  _namespace: string,
  options: LRUCacheOptions = {}
): LRUCache<string, V> {
  return new LRUCache<string, V>(options);
}

// 鍏ㄥ眬缂撳瓨瀹炰緥
const globalCaches = new Map<string, LRUCache<string, unknown>>();

/**
 * 鑾峰彇鎴栧垱寤哄叏灞€缂撳瓨
 */
export function getGlobalCache<V>(name: string, options?: LRUCacheOptions): LRUCache<string, V> {
  if (!globalCaches.has(name)) {
    globalCaches.set(name, new LRUCache<string, V>(options));
  }
  return globalCaches.get(name) as LRUCache<string, V>;
}

/**
 * 娓呯悊鎵€鏈夊叏灞€缂撳瓨
 */
export function clearAllGlobalCaches(): void {
  globalCaches.forEach((cache) => cache.clear());
}

/**
 * 鑾峰彇鎵€鏈夌紦瀛樼粺璁? */
export function getAllCacheStats(): Record<string, ReturnType<LRUCache<string, unknown>['getStats']>> {
  const stats: Record<string, ReturnType<LRUCache<string, unknown>['getStats']>> = {};
  globalCaches.forEach((cache, name) => {
    stats[name] = cache.getStats();
  });
  return stats;
}

