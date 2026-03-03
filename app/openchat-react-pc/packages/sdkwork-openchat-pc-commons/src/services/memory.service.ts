/**
 * 鍐呭瓨浼樺寲鏈嶅姟
 *
 * 鍔熻兘锛? * 1. 鍐呭瓨浣跨敤鐩戞帶
 * 2. 缂撳瓨绛栫暐浼樺寲
 * 3. 鍐呭瓨娉勬紡妫€娴? * 4. 鍨冨溇鍥炴敹浼樺寲
 * 5. 璧勬簮绠＄悊
 */

import { getGlobalCache, clearAllGlobalCaches } from '../utils/lruCache';

// 鑷畾涔変簨浠跺彂灏勫櫒锛屽吋瀹规祻瑙堝櫒鐜
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      this.events.set(event, listeners.filter(l => l !== listener));
    }
  }

  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }
}

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryUsagePercent: number;
  timestamp: number;
}

export interface CacheStats {
  name: string;
  size: number;
  maxSize: number;
  utilization: number;
  byteSize: number;
  maxByteSize: number;
  byteUtilization: number;
}

export interface MemoryOptimizationOptions {
  cacheSizeLimit?: number;
  cacheByteLimit?: number;
  memoryThreshold?: number;
  gcInterval?: number;
  leakDetectionInterval?: number;
}

export class MemoryService extends EventEmitter {
  private static instance: MemoryService;
  private isInitialized = false;
  private gcTimer: number | null = null;
  private leakDetectionTimer: number | null = null;
  private options: Required<MemoryOptimizationOptions>;
  private memoryHistory: MemoryStats[] = [];

  private constructor() {
    super();
    this.options = {
      cacheSizeLimit: 1000,
      cacheByteLimit: 50 * 1024 * 1024, // 50MB
      memoryThreshold: 80,
      gcInterval: 60 * 1000, // 1鍒嗛挓
      leakDetectionInterval: 5 * 60 * 1000, // 5鍒嗛挓
    };
  }

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  /**
   * 鍒濆鍖栧唴瀛樻湇鍔?   */
  initialize(options?: MemoryOptimizationOptions): void {
    if (this.isInitialized) {
      return;
    }

    this.options = {
      ...this.options,
      ...options,
    };

    // 鍚姩鍐呭瓨鐩戞帶
    this.startMemoryMonitoring();
    
    // 鍚姩鍨冨溇鍥炴敹瀹氭椂鍣?    this.startGCTimer();
    
    // 鍚姩鍐呭瓨娉勬紡妫€娴?    this.startLeakDetection();
    
    this.isInitialized = true;
    console.log('[MemoryService] Initialized');
  }

  /**
   * 鑾峰彇鍐呭瓨浣跨敤缁熻
   */
  getMemoryStats(): MemoryStats {
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      const stats: MemoryStats = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent,
        timestamp: Date.now(),
      };

      // 淇濆瓨鍘嗗彶璁板綍
      this.memoryHistory.push(stats);
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }

      // 妫€鏌ュ唴瀛樹娇鐢ㄩ槇鍊?      if (memoryUsagePercent > this.options.memoryThreshold) {
        this.emit('memoryWarning', stats);
        this.optimizeMemory();
      }

      return stats;
    }

    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryUsagePercent: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * 鑾峰彇缂撳瓨缁熻
   */
  getCacheStats(): CacheStats[] {
    const caches = [
      getGlobalCache('messages'),
      getGlobalCache('users'),
      getGlobalCache('conversations'),
      getGlobalCache('files'),
      getGlobalCache('markdown'),
    ];

    return caches.map((cache, index) => {
      const stats = cache.getStats();
      return {
        name: ['messages', 'users', 'conversations', 'files', 'markdown'][index] || `cache_${index}`,
        size: stats.size,
        maxSize: stats.maxSize,
        utilization: stats.utilization,
        byteSize: stats.bytes,
        maxByteSize: stats.maxBytes,
        byteUtilization: stats.byteUtilization,
      };
    });
  }

  /**
   * 浼樺寲鍐呭瓨浣跨敤
   */
  optimizeMemory(): void {
    console.log('[MemoryService] Optimizing memory usage');
    
    // 娓呯悊杩囨湡缂撳瓨
    this.cleanupCaches();
    
    // 瑙﹀彂鍨冨溇鍥炴敹
    this.triggerGC();
    
    // 娓呯悊鍐呭瓨鍘嗗彶
    this.memoryHistory = this.memoryHistory.slice(-20);
    
    // 鐩存帴鑾峰彇鍐呭瓨鐘舵€侊紝閬垮厤璋冪敤 getMemoryStats() 瀵艰嚧鏃犻檺閫掑綊
    let memoryStats = this.getMemoryStatsWithoutOptimization();
    this.emit('memoryOptimized', memoryStats);
  }

  /**
   * 鑾峰彇鍐呭瓨缁熻淇℃伅锛屼笉瑙﹀彂浼樺寲
   */
  private getMemoryStatsWithoutOptimization(): MemoryStats {
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent,
        timestamp: Date.now(),
      };
    }

    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryUsagePercent: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * 娓呯悊缂撳瓨
   */
  cleanupCaches(): void {
    // 娓呯悊澶у瀷缂撳瓨
    const cacheStats = this.getCacheStats();
    
    cacheStats.forEach(stats => {
      if (stats.utilization > 0.8) {
        console.log(`[MemoryService] Cleaning up cache: ${stats.name}`);
        // 杩欓噷鍙互娓呯悊鐗瑰畾缂撳瓨
      }
    });
    
    // 娓呯悊鎵€鏈夌紦瀛橈紙浠呭湪鍐呭瓨浣跨敤杩囬珮鏃讹級
    // 鐩存帴妫€鏌ュ唴瀛樹娇鐢ㄦ儏鍐碉紝閬垮厤璋冪敤 getMemoryStats() 瀵艰嚧鏃犻檺閫掑綊
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (memoryUsagePercent > 90) {
        console.log('[MemoryService] Clearing all caches due to high memory usage');
        clearAllGlobalCaches();
      }
    }
  }

  /**
   * 瑙﹀彂鍨冨溇鍥炴敹
   */
  triggerGC(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        console.log('[MemoryService] Garbage collection triggered');
      } catch (error) {
        console.warn('[MemoryService] Failed to trigger garbage collection:', error);
      }
    }
  }

  /**
   * 妫€娴嬪唴瀛樻硠婕?   */
  detectMemoryLeaks(): void {
    // 绠€鍗曠殑鍐呭瓨娉勬紡妫€娴?    const stats = this.getMemoryStats();
    const recentStats = this.memoryHistory.slice(-5);
    
    if (recentStats.length >= 5) {
      const isIncreasing = recentStats.every((stat, index) => {
        if (index === 0) return true;
        return stat.usedJSHeapSize > recentStats[index - 1].usedJSHeapSize;
      });
      
      if (isIncreasing) {
        console.warn('[MemoryService] Possible memory leak detected - memory usage is continuously increasing');
        this.emit('memoryLeakDetected', stats);
      }
    }
  }

  /**
   * 鍚姩鍐呭瓨鐩戞帶
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();
      this.emit('memoryStats', stats);
    }, 5000);
  }

  /**
   * 鍚姩鍨冨溇鍥炴敹瀹氭椂鍣?   */
  private startGCTimer(): void {
    this.gcTimer = window.setInterval(() => {
      this.triggerGC();
    }, this.options.gcInterval);
  }

  /**
   * 鍚姩鍐呭瓨娉勬紡妫€娴嬪畾鏃跺櫒
   */
  private startLeakDetection(): void {
    this.leakDetectionTimer = window.setInterval(() => {
      this.detectMemoryLeaks();
    }, this.options.leakDetectionInterval);
  }

  /**
   * 鑾峰彇鍐呭瓨浣跨敤瓒嬪娍
   */
  getMemoryTrend(): MemoryStats[] {
    return this.memoryHistory;
  }

  /**
   * 浼樺寲缂撳瓨閰嶇疆
   */
  optimizeCacheConfig(): void {
    // 璋冩暣缂撳瓨澶у皬
    const memoryStats = this.getMemoryStats();
    const cacheLimit = memoryStats.memoryUsagePercent > 70 
      ? Math.floor(this.options.cacheSizeLimit * 0.7)
      : this.options.cacheSizeLimit;
    
    const byteLimit = memoryStats.memoryUsagePercent > 70
      ? Math.floor(this.options.cacheByteLimit * 0.7)
      : this.options.cacheByteLimit;

    console.log(`[MemoryService] Optimizing cache config - size: ${cacheLimit}, bytes: ${byteLimit}`);
  }

  /**
   * 娓呯悊璧勬簮
   */
  cleanupResources(): void {
    // 娓呯悊浜嬩欢鐩戝惉鍣?    this.removeAllListeners();
    
    // 娓呯悊瀹氭椂鍣?    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = null;
    }
    
    // 娓呯悊缂撳瓨
    clearAllGlobalCaches();
    
    // 閲嶇疆鍒濆鍖栫姸鎬?    this.isInitialized = false;
    
    console.log('[MemoryService] Resources cleaned up');
  }

  /**
   * 鑾峰彇鍐呭瓨鏈嶅姟鐘舵€?   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      memoryStats: this.getMemoryStats(),
      cacheStats: this.getCacheStats(),
      memoryHistoryLength: this.memoryHistory.length,
    };
  }
}

export const memoryService = MemoryService.getInstance();

/**
 * 鍏ㄥ眬鍐呭瓨浼樺寲鍑芥暟
 */
export function optimizeMemory(): void {
  memoryService.optimizeMemory();
}

/**
 * 鍏ㄥ眬缂撳瓨娓呯悊鍑芥暟
 */
export function cleanupCaches(): void {
  memoryService.cleanupCaches();
}

export default MemoryService;
