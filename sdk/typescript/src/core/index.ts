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

// ==================== 日志系统 ====================
export {
  Logger,
  LogLevel,
  createLogger,
  getLogger,
  setGlobalLogger,
} from './logger';

export type { LoggerConfig } from './logger';

// ==================== 性能监控 ====================
export {
  PerformanceMonitor,
  createPerformanceMonitor,
  getPerformanceMonitor,
  setGlobalPerformanceMonitor,
} from './performance';

export type { PerformanceMetric, PerformanceStats } from './performance';

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

// ==================== 插件系统 ====================
export {
  PluginManager,
  createPluginManager,
} from './plugin';

export type {
  Plugin,
  PluginContext,
  PluginManagerOptions,
} from './plugin';

// ==================== 错误处理 ====================
export {
  SDKError,
  SDKErrorCode,
} from './error';

export type {
  ErrorCodeType,
  ErrorResponse,
  Result,
} from './error';

export {
  success,
  failure,
  isSuccess,
  isFailure,
} from './error';

// ==================== 连接管理 ====================
export {
  ConnectionManager,
  ConnectionState,
  createConnectionManager,
} from './connection';

export type {
  ConnectionOptions,
  ConnectionEvents,
} from './connection';

// ==================== 事件总线 ====================
export {
  EventBus,
  globalEventBus,
} from './event-bus';

export type {
  EventMap,
  EventKey,
  EventReceiver,
  Emitter,
} from './event-bus';

// ==================== 观察者模式 ====================
export {
  Subject,
  ReactiveValue,
  reactive,
} from './observer';

export type {
  Observer,
  Observable,
} from './observer';

// ==================== 数据验证 ====================
export {
  Validator,
  validate,
  ValidationRules,
} from './validator';

export type {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidatorOptions,
} from './validator';
