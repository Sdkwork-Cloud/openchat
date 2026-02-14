/**
 * 缓存服务
 * 
 * 提供统一的缓存管理接口，集成分层缓存系统，支持多种缓存策略。
 */

import { LayeredCache, MemoryCacheLayer, LocalStorageCacheLayer } from '../utils/layeredCache';

export interface CacheServiceOptions {
  defaultCapacity?: number;
  enableLocalStorage?: boolean;
}

export class CacheService {
  private caches = new Map<string, LayeredCache<any, any>>();
  private defaultCapacity: number;
  private enableLocalStorage: boolean;

  constructor(options: CacheServiceOptions = {}) {
    this.defaultCapacity = options.defaultCapacity || 1000;
    this.enableLocalStorage = options.enableLocalStorage !== false;
  }

  /**
   * 获取或创建缓存
   */
  getCache<K, V>(name: string, options?: { capacity?: number; enableLocalStorage?: boolean }): LayeredCache<K, V> {
    if (!this.caches.has(name)) {
      const capacity = options?.capacity || this.defaultCapacity;
      const useLocalStorage = options?.enableLocalStorage !== false && this.enableLocalStorage;
      
      const layers: any[] = [new MemoryCacheLayer<K, V>(capacity)];
      
      if (useLocalStorage) {
        layers.push(new LocalStorageCacheLayer<K, V>(`cache:${name}:`));
      }
      
      const cache = new LayeredCache<K, V>({
        layers,
      });
      
      this.caches.set(name, cache);
    }
    
    return this.caches.get(name) as LayeredCache<K, V>;
  }

  /**
   * 删除缓存
   */
  deleteCache(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * 清除所有缓存
   */
  async clearAllCaches(): Promise<void> {
    for (const cache of this.caches.values()) {
      await cache.clear();
    }
    this.caches.clear();
  }

  /**
   * 获取所有缓存名称
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [name, cache] of this.caches) {
      const memoryLayer = cache.getLayer(0);
      const localStorageLayer = cache.getLayer(1);
      
      stats[name] = {
        size: await cache.size,
        memorySize: memoryLayer ? await memoryLayer.size : 0,
        localStorageSize: localStorageLayer ? await localStorageLayer.size : 0,
        hasLocalStorage: !!localStorageLayer,
      };
    }
    
    return stats;
  }

  /**
   * 初始化默认缓存
   */
  initializeDefaultCaches(): void {
    // 初始化常用缓存
    this.getCache('messages', { capacity: 500 });
    this.getCache('users', { capacity: 200 });
    this.getCache('conversations', { capacity: 100 });
    this.getCache('files', { capacity: 100 });
    this.getCache('markdown', { capacity: 50 });
    this.getCache('api', { capacity: 200, enableLocalStorage: true });
    this.getCache('settings', { capacity: 50, enableLocalStorage: true });
  }

  /**
   * 初始化缓存服务
   */
  initialize(options?: CacheServiceOptions): void {
    if (options) {
      this.defaultCapacity = options.defaultCapacity || this.defaultCapacity;
      this.enableLocalStorage = options.enableLocalStorage !== false;
    }
    
    this.initializeDefaultCaches();
    console.log('[CacheService] Initialized with', this.getCacheNames().length, 'caches');
  }
}

// 创建全局缓存服务实例
const cacheService = new CacheService();

export default CacheService;
export { cacheService };
