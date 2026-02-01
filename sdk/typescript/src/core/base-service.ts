/**
 * 基础服务抽象类
 * 
 * 设计原则：
 * 1. 所有服务层的基类，提供通用的生命周期管理
 * 2. 统一的状态管理（IDLE -> INITIALIZING -> READY -> DESTROYING -> DESTROYED）
 * 3. 统一的事件发射能力
 * 4. 统一的错误处理机制
 * 5. 统一的日志记录
 * 
 * 开闭原则：子类通过实现抽象方法来扩展功能，无需修改基类
 */

import { EventEmitter } from 'eventemitter3';

/**
 * 服务状态枚举
 */
export enum ServiceState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
}

/**
 * 服务配置接口
 */
export interface ServiceConfig {
  /** 调试模式 */
  debug?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 服务事件枚举
 */
export enum ServiceEvent {
  STATE_CHANGED = 'state_changed',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}

/**
 * 服务错误类
 */
export class ServiceError extends Error {
  code: string;
  data?: any;

  constructor(code: string, message: string, data?: any) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.data = data;
  }
}

/**
 * 基础服务抽象类
 * 
 * @abstract
 * @example
 * ```typescript
 * class MyService extends BaseService<MyConfig> {
 *   protected async onInitialize(config: MyConfig): Promise<void> {
 *     // 初始化逻辑
 *   }
 *   
 *   protected async onDestroy(): Promise<void> {
 *     // 销毁逻辑
 *   }
 * }
 * ```
 */
export abstract class BaseService<TConfig extends ServiceConfig = ServiceConfig> extends EventEmitter {
  /** 当前状态 */
  protected _state: ServiceState = ServiceState.IDLE;
  
  /** 服务配置 */
  protected config: TConfig | null = null;
  
  /** 初始化时间戳 */
  protected initializedAt: number | null = null;
  
  /** 错误历史 */
  protected errorHistory: Array<{ timestamp: number; error: ServiceError }> = [];

  /**
   * 获取当前状态
   */
  get state(): ServiceState {
    return this._state;
  }

  /**
   * 检查是否已初始化
   */
  get isReady(): boolean {
    return this._state === ServiceState.READY;
  }

  /**
   * 获取初始化时间
   */
  get uptime(): number {
    if (!this.initializedAt) return 0;
    return Date.now() - this.initializedAt;
  }

  /**
   * 初始化服务
   * 
   * 生命周期：IDLE -> INITIALIZING -> READY/ERROR
   * 
   * @param config 服务配置
   * @throws {ServiceError} 初始化失败时抛出
   */
  async initialize(config: TConfig): Promise<void> {
    // 状态检查
    if (this._state !== ServiceState.IDLE) {
      throw new ServiceError(
        'SERVICE_ALREADY_INITIALIZED',
        `服务状态错误，当前状态: ${this._state}，期望状态: ${ServiceState.IDLE}`
      );
    }

    try {
      this._state = ServiceState.INITIALIZING;
      this.emit(ServiceEvent.STATE_CHANGED, this._state);
      
      this.config = {
        debug: false,
        timeout: 30000,
        maxRetries: 3,
        ...config,
      };

      // 调用子类初始化逻辑
      await this.onInitialize(this.config);

      this._state = ServiceState.READY;
      this.initializedAt = Date.now();
      this.emit(ServiceEvent.STATE_CHANGED, this._state);
      
      this.log('info', '服务初始化成功');
      
    } catch (error) {
      this._state = ServiceState.ERROR;
      this.emit(ServiceEvent.STATE_CHANGED, this._state);
      
      const serviceError = this.wrapError(error);
      this.errorHistory.push({ timestamp: Date.now(), error: serviceError });
      this.emit(ServiceEvent.ERROR, serviceError);
      
      this.log('error', '服务初始化失败', serviceError);
      throw serviceError;
    }
  }

  /**
   * 销毁服务
   * 
   * 生命周期：READY/ERROR -> DESTROYING -> DESTROYED
   */
  async destroy(): Promise<void> {
    if (this._state === ServiceState.DESTROYING || this._state === ServiceState.DESTROYED) {
      return;
    }

    try {
      this._state = ServiceState.DESTROYING;
      this.emit(ServiceEvent.STATE_CHANGED, this._state);
      
      // 调用子类销毁逻辑
      await this.onDestroy();
      
      this._state = ServiceState.DESTROYED;
      this.emit(ServiceEvent.STATE_CHANGED, this._state);
      this.emit(ServiceEvent.DESTROYED);
      
      // 清理
      this.removeAllListeners();
      this.config = null;
      this.initializedAt = null;
      
      this.log('info', '服务已销毁');
      
    } catch (error) {
      this._state = ServiceState.ERROR;
      this.emit(ServiceEvent.STATE_CHANGED, this._state);
      
      const serviceError = this.wrapError(error);
      this.errorHistory.push({ timestamp: Date.now(), error: serviceError });
      this.emit(ServiceEvent.ERROR, serviceError);
      
      this.log('error', '服务销毁失败', serviceError);
      throw serviceError;
    }
  }

  /**
   * 执行操作（带状态检查）
   * 
   * @param operation 操作函数
   * @param operationName 操作名称（用于错误信息）
   * @returns 操作结果
   * @throws {ServiceError} 服务未就绪时抛出
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    if (this._state !== ServiceState.READY) {
      throw new ServiceError(
        'SERVICE_NOT_READY',
        `服务未就绪，无法执行${operationName}，当前状态: ${this._state}`
      );
    }

    try {
      return await operation();
    } catch (error) {
      const serviceError = this.wrapError(error);
      this.errorHistory.push({ timestamp: Date.now(), error: serviceError });
      throw serviceError;
    }
  }

  /**
   * 延迟执行
   * 
   * @param ms 延迟毫秒数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 日志记录
   * 
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config?.debug && level === 'info') return;
    
    const prefix = `[${this.constructor.name}]`;
    const timestamp = new Date().toISOString();
    
    switch (level) {
      case 'info':
        console.log(`${timestamp} ${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${timestamp} ${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${timestamp} ${prefix} ${message}`, data || '');
        break;
    }
  }

  /**
   * 包装错误
   * 
   * @param error 原始错误
   * @returns ServiceError
   */
  protected wrapError(error: any): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }
    
    return new ServiceError(
      error?.code || 'UNKNOWN_ERROR',
      error?.message || '未知错误',
      error
    );
  }

  /**
   * 子类初始化逻辑（必须实现）
   * 
   * @abstract
   * @param config 服务配置
   */
  protected abstract onInitialize(config: TConfig): Promise<void>;

  /**
   * 子类销毁逻辑（必须实现）
   * 
   * @abstract
   */
  protected abstract onDestroy(): Promise<void>;
}

export default BaseService;
