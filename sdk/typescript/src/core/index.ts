/**
 * 核心模块入口
 * 提供SDK的基础架构和工具
 */

// ==================== 基础服务 ====================
export {
  BaseService,
  ServiceState,
  ServiceEvent,
  ServiceError,
} from './base-service';

export type { ServiceConfig } from './base-service';

// ==================== 重试机制 ====================
export {
  RetryPolicy,
  ExponentialBackoff,
  FixedIntervalBackoff,
  LinearBackoff,
  createRetryPolicy,
  createNetworkRetryPolicy,
} from './retry-policy';

export type { RetryConfig, RetryContext } from './retry-policy';

// ==================== 工具函数 ====================
export {
  debounce,
  throttle,
  memoize,
  deepClone,
  deepMerge,
  isPlainObject,
  generateUUID,
  formatDate,
  isEmpty,
  pick,
  omit,
  sleep,
  retry,
  withTimeout,
  safeJSONParse,
  safeJSONStringify,
  isBrowser,
  isNode,
  isWebSocketSupported,
  isLocalStorageSupported,
  isIndexedDBSupported,
} from './utils';
