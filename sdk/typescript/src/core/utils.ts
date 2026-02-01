/**
 * 核心工具函数
 * 
 * 提供SDK通用的工具函数
 */

/**
 * 防抖函数
 * 
 * @param fn 原函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 节流函数
 * 
 * @param fn 原函数
 * @param interval 间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

/**
 * 记忆化函数
 * 
 * @param fn 原函数
 * @param keyGenerator 缓存键生成器
 * @returns 记忆化后的函数
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * 深克隆
 * 
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (obj instanceof Object) {
    const cloned: Record<string, any> = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone((obj as Record<string, any>)[key]);
      }
    }
    return cloned as T;
  }
  
  return obj;
}

/**
 * 深合并
 * 
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export function deepMerge(
  target: Record<string, any>,
  ...sources: Array<Record<string, any>>
): Record<string, any> {
  if (!sources.length) return target;
  
  const source = sources.shift();
  if (!source) return target;
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const targetValue = target[key];
      const sourceValue = source[key];
      
      if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
        target[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        target[key] = deepClone(sourceValue);
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

/**
 * 检查是否为纯对象
 * 
 * @param obj 要检查的对象
 * @returns 是否为纯对象
 */
export function isPlainObject(obj: any): obj is Record<string, any> {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * 生成UUID
 * 
 * @returns UUID字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 格式化日期
 * 
 * @param date 日期对象或时间戳
 * @param format 格式字符串（yyyy-MM-dd HH:mm:ss）
 * @returns 格式化后的字符串
 */
export function formatDate(date: Date | number, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const d = date instanceof Date ? date : new Date(date);
  
  const map: Record<string, number> = {
    'yyyy': d.getFullYear(),
    'MM': d.getMonth() + 1,
    'dd': d.getDate(),
    'HH': d.getHours(),
    'mm': d.getMinutes(),
    'ss': d.getSeconds(),
  };
  
  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => {
    const value = map[match];
    return value < 10 ? `0${value}` : String(value);
  });
}

/**
 * 检查对象是否为空
 * 
 * @param obj 要检查的对象
 * @returns 是否为空
 */
export function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === 'string') return obj.length === 0;
  if (Array.isArray(obj)) return obj.length === 0;
  if (isPlainObject(obj)) return Object.keys(obj).length === 0;
  return false;
}

/**
 * 从对象中选取指定属性
 * 
 * @param obj 源对象
 * @param keys 要选取的属性名
 * @returns 新对象
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * 从对象中排除指定属性
 * 
 * @param obj 源对象
 * @param keys 要排除的属性名
 * @returns 新对象
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  
  for (const key of keys) {
    delete result[key];
  }
  
  return result;
}

/**
 * 等待指定时间
 * 
 * @param ms 毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * 
 * @param fn 要执行的函数
 * @param maxRetries 最大重试次数
 * @param delay 重试延迟
 * @returns 函数结果
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }
  
  throw lastError;
}

/**
 * 超时包装
 * 
 * @param promise 原Promise
 * @param ms 超时时间
 * @param message 超时消息
 * @returns Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = 'Operation timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/**
 * 安全的JSON解析
 * 
 * @param json JSON字符串
 * @param defaultValue 默认值
 * @returns 解析结果
 */
export function safeJSONParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 安全的JSON序列化
 * 
 * @param obj 要序列化的对象
 * @param defaultValue 默认值
 * @returns JSON字符串
 */
export function safeJSONStringify(obj: any, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
}

/**
 * 检查是否为浏览器环境
 */
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * 检查是否为Node.js环境
 */
export const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

/**
 * 检查是否支持WebSocket
 */
export const isWebSocketSupported = typeof WebSocket !== 'undefined';

/**
 * 检查是否支持LocalStorage
 */
export const isLocalStorageSupported = (() => {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
})();

/**
 * 检查是否支持IndexedDB
 */
export const isIndexedDBSupported = typeof indexedDB !== 'undefined';
