/**
 * 通用工具函数
 * 提供高可用、高性能的工具方法
 *
 * @framework
 */

/**
 * 生成 UUID（v4）
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // 降级实现
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成 Snowflake ID
 */
export function generateSnowflakeId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${timestamp}${random.toString().padStart(3, '0')}`;
}

/**
 * 生成短 ID（用于 URL 等）
 */
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target };

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        continue;
      }

      const sourceValue = source[key];
      const targetValue = result[key as keyof T];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(targetValue as object, sourceValue);
      } else {
        (result as any)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const callNow = options.leading && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    if (callNow || (options.trailing !== false && now - lastCallTime >= wait)) {
      if (callNow) {
        func.apply(this, args);
        lastCallTime = now;
      } else {
        timeout = setTimeout(() => {
          func.apply(this, args);
          lastCallTime = Date.now();
          timeout = null;
        }, wait);
      }
    }
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (!inThrottle) {
      if (options.leading !== false) {
        func.apply(this, args);
        lastRan = now;
      }
      inThrottle = true;
    } else {
      if (options.trailing !== false) {
        if (lastFunc) {
          clearTimeout(lastFunc);
        }
        lastFunc = setTimeout(() => {
          if (now - lastRan >= limit) {
            func.apply(this, args);
            lastRan = now;
          }
        }, limit - (now - lastRan));
      }
    }

    setTimeout(() => {
      inThrottle = false;
    }, limit);
  };
}

/**
 * 休眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数（指数退避）
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    multiplier?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    multiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      onRetry?.(error as Error, attempt + 1);

      // 指数退避 + 随机抖动
      const jitter = Math.random() * 0.1 * delay;
      await sleep(Math.min(delay + jitter, maxDelay));
      delay *= multiplier;
    }
  }

  throw lastError!;
}

/**
 * 批量处理（带并发控制）
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    batchSize?: number;
    concurrency?: number;
    stopOnError?: boolean;
  } = {},
): Promise<R[]> {
  const { batchSize = 10, concurrency = 1, stopOnError = false } = options;
  const results: R[] = [];

  // 简单批处理
  if (concurrency === 1) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item, index) => processor(item, i + index)),
      );
      results.push(...batchResults);
    }
    return results;
  }

  // 并发批处理
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemIndex = i;
    const promise = Promise.resolve().then(async () => {
      const result = await processor(items[itemIndex], itemIndex);
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === Promise.race(executing)),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 带超时的 Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutError?: Error,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(timeoutError || new Error(`Operation timed out after ${ms}ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}

/**
 * 并行执行限制
 */
export async function parallelLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const taskIndex = i;
    const promise = Promise.resolve().then(async () => {
      results[taskIndex] = await tasks[taskIndex]();
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === Promise.race(executing)), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 格式化字节数
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  // 处理无效输入
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B'; // 负数视为0
  if (!isFinite(bytes)) return '0 B'; // 处理 NaN 和 Infinity

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  // 限制最大索引，防止数组越界
  const maxIndex = sizes.length - 1;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), maxIndex);

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours % 24 > 0) {
    parts.push(`${hours % 24}h`);
  }
  if (minutes % 60 > 0) {
    parts.push(`${minutes % 60}m`);
  }
  if (seconds % 60 > 0) {
    parts.push(`${seconds % 60}s`);
  }

  return parts.join(' ');
}

/**
 * 安全获取嵌套对象属性
 */
export function safeGet<T>(obj: any, path: string | string[], defaultValue?: T): T | undefined {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}

/**
 * 对象扁平化
 */
export function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
  }

  return result;
}

/**
 * 对象解扁平化
 */
export function unflattenObject(obj: Record<string, any>): any {
  const result: any = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const keys = key.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
          current[k] = {};
        }
        current = current[k];
      }

      current[keys[keys.length - 1]] = obj[key];
    }
  }

  return result;
}

/**
 * 生成哈希值
 */
export async function hash(data: string, algorithm: string = 'SHA-256'): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  if (typeof crypto !== 'undefined' && 'subtle' in crypto) {
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js 环境
  if (typeof require !== 'undefined') {
    const crypto = require('crypto');
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  throw new Error('Crypto API not available');
}

/**
 * 比较两个对象是否相等
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * 移除对象中的 null 和 undefined 值
 */
export function removeNullAndUndefined<T extends object>(obj: T): T {
  const result = {} as T;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== null && value !== undefined) {
        result[key] = typeof value === 'object' ? removeNullAndUndefined(value) : value;
      }
    }
  }

  return result;
}

/**
 * 驼峰命名转短横线命名
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 短横线命名转驼峰命名
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 首字母小写
 */
export function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
