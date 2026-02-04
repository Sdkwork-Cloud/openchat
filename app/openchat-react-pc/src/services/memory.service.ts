/**
 * 内存优化服务
 *
 * 功能：
 * 1. 内存使用监控
 * 2. 缓存策略优化
 * 3. 内存泄漏检测
 * 4. 垃圾回收优化
 * 5. 资源管理
 */

import { getGlobalCache, clearAllGlobalCaches } from '../utils/lruCache';

// 自定义事件发射器，兼容浏览器环境
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
      gcInterval: 60 * 1000, // 1分钟
      leakDetectionInterval: 5 * 60 * 1000, // 5分钟
    };
  }

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  /**
   * 初始化内存服务
   */
  initialize(options?: MemoryOptimizationOptions): void {
    if (this.isInitialized) {
      return;
    }

    this.options = {
      ...this.options,
      ...options,
    };

    // 启动内存监控
    this.startMemoryMonitoring();
    
    // 启动垃圾回收定时器
    this.startGCTimer();
    
    // 启动内存泄漏检测
    this.startLeakDetection();
    
    this.isInitialized = true;
    console.log('[MemoryService] Initialized');
  }

  /**
   * 获取内存使用统计
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

      // 保存历史记录
      this.memoryHistory.push(stats);
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }

      // 检查内存使用阈值
      if (memoryUsagePercent > this.options.memoryThreshold) {
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
   * 获取缓存统计
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
   * 优化内存使用
   */
  optimizeMemory(): void {
    console.log('[MemoryService] Optimizing memory usage');
    
    // 清理过期缓存
    this.cleanupCaches();
    
    // 触发垃圾回收
    this.triggerGC();
    
    // 清理内存历史
    this.memoryHistory = this.memoryHistory.slice(-20);
    
    // 直接获取内存状态，避免调用 getMemoryStats() 导致无限递归
    let memoryStats = this.getMemoryStatsWithoutOptimization();
    this.emit('memoryOptimized', memoryStats);
  }

  /**
   * 获取内存统计信息，不触发优化
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
   * 清理缓存
   */
  cleanupCaches(): void {
    // 清理大型缓存
    const cacheStats = this.getCacheStats();
    
    cacheStats.forEach(stats => {
      if (stats.utilization > 0.8) {
        console.log(`[MemoryService] Cleaning up cache: ${stats.name}`);
        // 这里可以清理特定缓存
      }
    });
    
    // 清理所有缓存（仅在内存使用过高时）
    // 直接检查内存使用情况，避免调用 getMemoryStats() 导致无限递归
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
   * 触发垃圾回收
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
   * 检测内存泄漏
   */
  detectMemoryLeaks(): void {
    // 简单的内存泄漏检测
    const stats = this.getMemoryStats();
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
   * 启动内存监控
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();
      this.emit('memoryStats', stats);
    }, 5000);
  }

  /**
   * 启动垃圾回收定时器
   */
  private startGCTimer(): void {
    this.gcTimer = window.setInterval(() => {
      this.triggerGC();
    }, this.options.gcInterval);
  }

  /**
   * 启动内存泄漏检测定时器
   */
  private startLeakDetection(): void {
    this.leakDetectionTimer = window.setInterval(() => {
      this.detectMemoryLeaks();
    }, this.options.leakDetectionInterval);
  }

  /**
   * 获取内存使用趋势
   */
  getMemoryTrend(): MemoryStats[] {
    return this.memoryHistory;
  }

  /**
   * 优化缓存配置
   */
  optimizeCacheConfig(): void {
    // 调整缓存大小
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
   * 清理资源
   */
  cleanupResources(): void {
    // 清理事件监听器
    this.removeAllListeners();
    
    // 清理定时器
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = null;
    }
    
    // 清理缓存
    clearAllGlobalCaches();
    
    // 重置初始化状态
    this.isInitialized = false;
    
    console.log('[MemoryService] Resources cleaned up');
  }

  /**
   * 获取内存服务状态
   */
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
 * 全局内存优化函数
 */
export function optimizeMemory(): void {
  memoryService.optimizeMemory();
}

/**
 * 全局缓存清理函数
 */
export function cleanupCaches(): void {
  memoryService.cleanupCaches();
}

export default MemoryService;