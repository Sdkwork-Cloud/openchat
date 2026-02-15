/**
 * HTTP请求缓存
 * 
 * 职责：
 * 1. 缓存HTTP请求的响应
 * 2. 管理缓存的过期时间
 * 3. 提供缓存命中和未命中的统计
 * 4. 支持缓存的清除和更新
 */

import { LRU } from './lru';

// 缓存键生成器类型
type CacheKeyGenerator = (url: string, params?: any, data?: any) => string;

// 缓存选项
interface HttpCacheOptions {
  /** 缓存大小限制 */
  maxSize?: number;
  /** 默认缓存过期时间（毫秒） */
  defaultTTL?: number;
  /** 缓存键生成器 */
  keyGenerator?: CacheKeyGenerator;
  /** 是否启用缓存 */
  enabled?: boolean;
}

// 缓存条目
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 默认缓存键生成器
const defaultKeyGenerator: CacheKeyGenerator = (url, params, data) => {
  const paramsStr = params ? JSON.stringify(params) : '';
  const dataStr = data ? JSON.stringify(data) : '';
  return `${url}${paramsStr}${dataStr}`;
};

// HTTP请求缓存类
export class HttpCache {
  private cache: LRU<string, any>;
  private defaultTTL: number;
  private keyGenerator: CacheKeyGenerator;
  private enabled: boolean;
  private stats: {
    hits: number;
    misses: number;
    requests: number;
  };

  constructor(options: HttpCacheOptions = {}) {
    this.defaultTTL = options.defaultTTL !== undefined ? options.defaultTTL : 60000; // 默认1分钟
    this.keyGenerator = options.keyGenerator || defaultKeyGenerator;
    this.enabled = options.enabled !== false;
    const maxSize = options.maxSize === 0 ? 1 : (options.maxSize || 100);
    this.cache = new LRU(maxSize);
    if (options.maxSize === 0) {
      this.enabled = false;
    }
    this.stats = {
      hits: 0,
      misses: 0,
      requests: 0,
    };
  }

  /**
   * 生成缓存键
   */
  private generateKey(url: string, params?: any, data?: any): string {
    return this.keyGenerator(url, params, data);
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null;
  get<T>(url: string, params?: any, data?: any): T | null;
  get<T>(...args: any[]): T | null {
    this.stats.requests++;

    if (!this.enabled) {
      this.stats.misses++;
      return null;
    }

    let key: string;
    if (args.length === 1) {
      key = args[0];
    } else {
      key = this.generateKey(args[0], args[1], args[2]);
    }
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (item.ttl <= 0 || Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.data;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, ttl?: number): void;
  
  /**
   * 设置缓存（通过URL、参数和数据）
   */
  set<T>(url: string, params: any, data: any, value: T, ttl?: number): void;
  
  /**
   * 设置缓存实现
   */
  set<T>(...args: any[]): void {
    if (!this.enabled) {
      return;
    }

    let key: string;
    let value: T;
    let ttl: number | undefined;

    if (args.length === 2) {
      // 直接使用缓存键（key, value）
      [key, value] = args;
      ttl = undefined;
    } else if (args.length === 3) {
      // 直接使用缓存键（key, value, ttl）
      [key, value, ttl] = args;
    } else if (args.length >= 4) {
      // 通过URL、参数和数据生成缓存键
      const [url, params, data, val, t] = args;
      key = this.generateKey(url, params, data);
      value = val;
      ttl = t;
    } else {
      return;
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl !== undefined ? ttl : this.defaultTTL,
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): void;
  delete(url: string, params?: any, data?: any): void;
  delete(...args: any[]): void {
    if (!this.enabled) {
      return;
    }

    let key: string;
    if (args.length === 1) {
      key = args[0];
    } else {
      key = this.generateKey(args[0], args[1], args[2]);
    }
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查缓存是否为空
   */
  isEmpty(): boolean {
    return this.cache.size === 0;
  }

  /**
   * 检查缓存是否包含指定键
   */
  has(key: string): boolean;
  has(url: string, params?: any, data?: any): boolean;
  has(...args: any[]): boolean {
    if (!this.enabled) {
      return false;
    }

    let key: string;
    if (args.length === 1) {
      key = args[0];
    } else {
      key = this.generateKey(args[0], args[1], args[2]);
    }
    return this.cache.has(key);
  }

  /**
   * 重置缓存统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      requests: 0,
    };
  }

  /**
   * 增加请求计数
   */
  incrementRequestCount(): void {
    this.stats.requests++;
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.cache.maxSize,
      hitRate: this.stats.requests > 0 ? this.stats.hits / this.stats.requests : 0,
    };
  }

  /**
   * 启用缓存
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用缓存
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 检查缓存是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 设置默认缓存过期时间
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * 获取默认缓存过期时间
   */
  getDefaultTTL(): number {
    return this.defaultTTL;
  }

  /**
   * 设置缓存键生成器
   */
  setKeyGenerator(generator: CacheKeyGenerator): void {
    this.keyGenerator = generator;
  }

  /**
   * 获取缓存键生成器
   */
  getKeyGenerator(): CacheKeyGenerator {
    return this.keyGenerator;
  }
}

// 导出单例实例
export const httpCache = new HttpCache();
export default httpCache;