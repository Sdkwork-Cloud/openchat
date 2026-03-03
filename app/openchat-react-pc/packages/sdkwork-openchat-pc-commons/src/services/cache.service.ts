/**
 * 缂撳瓨鏈嶅姟
 * 
 * 鎻愪緵缁熶竴鐨勭紦瀛樼鐞嗘帴鍙ｏ紝闆嗘垚鍒嗗眰缂撳瓨绯荤粺锛屾敮鎸佸绉嶇紦瀛樼瓥鐣ャ€? */

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
   * 鑾峰彇鎴栧垱寤虹紦瀛?   */
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
   * 鍒犻櫎缂撳瓨
   */
  deleteCache(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * 娓呴櫎鎵€鏈夌紦瀛?   */
  async clearAllCaches(): Promise<void> {
    for (const cache of this.caches.values()) {
      await cache.clear();
    }
    this.caches.clear();
  }

  /**
   * 鑾峰彇鎵€鏈夌紦瀛樺悕绉?   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * 鑾峰彇缂撳瓨缁熻淇℃伅
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
   * 鍒濆鍖栭粯璁ょ紦瀛?   */
  initializeDefaultCaches(): void {
    // 鍒濆鍖栧父鐢ㄧ紦瀛?    this.getCache('messages', { capacity: 500 });
    this.getCache('users', { capacity: 200 });
    this.getCache('conversations', { capacity: 100 });
    this.getCache('files', { capacity: 100 });
    this.getCache('markdown', { capacity: 50 });
    this.getCache('api', { capacity: 200, enableLocalStorage: true });
    this.getCache('settings', { capacity: 50, enableLocalStorage: true });
  }

  /**
   * 鍒濆鍖栫紦瀛樻湇鍔?   */
  initialize(options?: CacheServiceOptions): void {
    if (options) {
      this.defaultCapacity = options.defaultCapacity || this.defaultCapacity;
      this.enableLocalStorage = options.enableLocalStorage !== false;
    }
    
    this.initializeDefaultCaches();
    console.log('[CacheService] Initialized with', this.getCacheNames().length, 'caches');
  }
}

// 鍒涘缓鍏ㄥ眬缂撳瓨鏈嶅姟瀹炰緥
const cacheService = new CacheService();

export default CacheService;
export { cacheService };

