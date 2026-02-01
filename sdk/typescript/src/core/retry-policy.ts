/**
 * 重试策略模块
 * 
 * 设计原则：
 * 1. 支持多种退避策略（指数退避、固定间隔、自定义）
 * 2. 支持可重试错误判断
 * 3. 支持重试次数和超时控制
 * 4. 支持重试事件监听
 * 5. 支持上下文传递
 * 
 * 使用示例：
 * ```typescript
 * const policy = createRetryPolicy({
 *   maxRetries: 3,
 *   backoff: new ExponentialBackoff({ initialDelay: 1000, maxDelay: 10000 }),
 *   shouldRetry: (error) => error.code === 'NETWORK_ERROR'
 * });
 * 
 * const result = await policy.execute(async () => {
 *   return await api.call();
 * });
 * ```
 */

import { EventEmitter } from 'eventemitter3';

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 退避策略 */
  backoff: BackoffStrategy;
  /** 是否可重试的判断函数 */
  shouldRetry?: (error: any, context: RetryContext) => boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 重试上下文
 */
export interface RetryContext {
  /** 当前重试次数 */
  attempt: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 上次错误 */
  lastError?: any;
  /** 上次延迟时间 */
  lastDelay?: number;
  /** 开始时间 */
  startTime: number;
  /** 自定义数据 */
  metadata?: Record<string, any>;
}

/**
 * 退避策略接口
 */
export interface BackoffStrategy {
  /**
   * 计算下次延迟时间
   * @param context 重试上下文
   * @returns 延迟时间（毫秒）
   */
  getDelay(context: RetryContext): number;
  /**
   * 重置策略
   */
  reset(): void;
}

/**
 * 指数退避策略
 */
export class ExponentialBackoff implements BackoffStrategy {
  private config: {
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
    jitter: boolean;
  };

  constructor(config?: {
    initialDelay?: number;
    maxDelay?: number;
    multiplier?: number;
    jitter?: boolean;
  }) {
    this.config = {
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
      ...config,
    };
  }

  getDelay(context: RetryContext): number {
    const delay = Math.min(
      this.config.initialDelay * Math.pow(this.config.multiplier, context.attempt - 1),
      this.config.maxDelay
    );

    if (this.config.jitter) {
      // 添加随机抖动（±25%）
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(0, delay + jitter);
    }

    return delay;
  }

  reset(): void {
    // 无需重置状态
  }
}

/**
 * 固定间隔退避策略
 */
export class FixedIntervalBackoff implements BackoffStrategy {
  private delay: number;

  constructor(delay: number = 1000) {
    this.delay = delay;
  }

  getDelay(): number {
    return this.delay;
  }

  reset(): void {
    // 无需重置状态
  }
}

/**
 * 线性退避策略
 */
export class LinearBackoff implements BackoffStrategy {
  private config: {
    initialDelay: number;
    increment: number;
    maxDelay: number;
  };

  constructor(config?: { initialDelay?: number; increment?: number; maxDelay?: number }) {
    this.config = {
      initialDelay: 1000,
      increment: 1000,
      maxDelay: 30000,
      ...config,
    };
  }

  getDelay(context: RetryContext): number {
    return Math.min(
      this.config.initialDelay + this.config.increment * (context.attempt - 1),
      this.config.maxDelay
    );
  }

  reset(): void {
    // 无需重置状态
  }
}

/**
 * 重试策略事件
 */
export enum RetryPolicyEvent {
  BEFORE_RETRY = 'before_retry',
  AFTER_RETRY = 'after_retry',
  MAX_RETRIES_EXCEEDED = 'max_retries_exceeded',
  SUCCESS = 'success',
}

/**
 * 重试策略类
 */
export class RetryPolicy extends EventEmitter {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    super();
    this.config = {
      enabled: true,
      timeout: 0,
      shouldRetry: () => true,
      ...config,
    };
  }

  /**
   * 执行带重试的操作
   * @param operation 操作函数
   * @param metadata 自定义元数据
   * @returns 操作结果
   */
  async execute<T>(
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    const context: RetryContext = {
      attempt: 0,
      maxRetries: this.config.maxRetries,
      startTime: Date.now(),
      metadata,
    };

    this.config.backoff.reset();

    while (true) {
      try {
        // 检查超时
        if (this.config.timeout && Date.now() - context.startTime > this.config.timeout) {
          throw new Error('Retry timeout exceeded');
        }

        context.attempt++;
        const result = await operation();
        
        this.emit(RetryPolicyEvent.SUCCESS, { context, result });
        return result;
        
      } catch (error) {
        context.lastError = error;

        // 检查是否达到最大重试次数
        if (context.attempt >= this.config.maxRetries) {
          this.emit(RetryPolicyEvent.MAX_RETRIES_EXCEEDED, { context, error });
          throw error;
        }

        // 检查是否应该重试
        if (this.config.shouldRetry && !this.config.shouldRetry(error, context)) {
          throw error;
        }

        // 计算延迟
        const delay = this.config.backoff.getDelay(context);
        context.lastDelay = delay;

        this.emit(RetryPolicyEvent.BEFORE_RETRY, { context, delay });

        // 等待后重试
        await this.sleep(delay);

        this.emit(RetryPolicyEvent.AFTER_RETRY, { context });
      }
    }
  }

  /**
   * 延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建默认重试策略
 */
export function createRetryPolicy(config?: Partial<RetryConfig>): RetryPolicy {
  return new RetryPolicy({
    maxRetries: 3,
    backoff: new ExponentialBackoff(),
    enabled: true,
    ...config,
  });
}

/**
 * 创建网络请求重试策略
 */
export function createNetworkRetryPolicy(maxRetries: number = 3): RetryPolicy {
  return new RetryPolicy({
    maxRetries,
    backoff: new ExponentialBackoff({
      initialDelay: 1000,
      maxDelay: 10000,
      jitter: true,
    }),
    shouldRetry: (error) => {
      // 网络错误、超时错误可重试
      const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'ECONNRESET', 'ETIMEDOUT'];
      return retryableCodes.includes(error?.code) || error?.message?.includes('network');
    },
  });
}

export default RetryPolicy;
