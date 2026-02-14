/**
 * 错误处理服务
 *
 * 功能：
 * 1. 全局错误捕获和处理
 * 2. 错误分类和标准化
 * 3. 错误监控和上报
 * 4. 错误日志管理
 * 5. 用户友好的错误提示
 */

import { API_BASE_URL } from '@/app/env';

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

export type ErrorType = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'server'
  | 'client'
  | 'timeout'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  originalError?: any;
  details?: Record<string, any>;
  timestamp: number;
  context?: string;
  userId?: string;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  reportError?: boolean;
  logError?: boolean;
  context?: string;
}

export interface ErrorReport {
  error: AppError;
  userAgent: string;
  url: string;
  timestamp: number;
  sessionId: string;
}

export class ErrorService extends EventEmitter {
  private static instance: ErrorService;
  private errorCount = 0;
  private sessionId = this.generateSessionId();
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * 初始化错误处理服务
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 捕获全局错误
    this.setupGlobalErrorHandlers();
    
    // 捕获未处理的 Promise 拒绝
    this.setupPromiseRejectionHandler();
    
    this.isInitialized = true;
    console.log('[ErrorService] Initialized');
  }

  /**
   * 处理错误
   */
  handleError(error: any, options?: ErrorHandlerOptions): AppError {
    const {
      showNotification = true,
      reportError = true,
      logError = true,
      context = 'unknown',
    } = options || {};

    // 标准化错误
    const appError = this.normalizeError(error, context);
    
    // 增加错误计数
    this.errorCount++;
    
    // 记录错误
    if (logError) {
      this.logError(appError);
    }
    
    // 上报错误
    if (reportError) {
      this.reportError(appError);
    }
    
    // 显示通知
    if (showNotification) {
      this.showErrorNotification(appError);
    }
    
    // 触发错误事件
    this.emit('error', appError);
    this.emit(`error:${appError.type}`, appError);
    this.emit(`error:${appError.code}`, appError);
    
    return appError;
  }

  /**
   * 标准化错误
   */
  private normalizeError(error: any, context: string): AppError {
    // 已经是标准化错误
    if (error && error.type && error.code) {
      return {
        ...error,
        timestamp: error.timestamp || Date.now(),
        context: error.context || context,
      };
    }

    // 网络错误
    if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('Network')) {
      return this.createError('network', 'NETWORK_ERROR', '网络连接失败，请检查网络设置', error, context);
    }

    // 认证错误
    if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      return this.createError('authentication', 'AUTH_ERROR', '登录已过期，请重新登录', error, context);
    }

    // 授权错误
    if (error.status === 403 || error.message.includes('forbidden') || error.message.includes('Forbidden')) {
      return this.createError('authorization', 'AUTHZ_ERROR', '权限不足，无法访问该资源', error, context);
    }

    // 验证错误
    if (error.status === 400 || error.message.includes('validation') || error.message.includes('Validation')) {
      return this.createError('validation', 'VALIDATION_ERROR', '输入参数错误，请检查后重试', error, context);
    }

    // 超时错误
    if (error.name === 'TimeoutError' || error.message.includes('timeout') || error.message.includes('Timeout')) {
      return this.createError('timeout', 'TIMEOUT_ERROR', '请求超时，请稍后重试', error, context);
    }

    // 服务器错误
    if (error.status >= 500) {
      return this.createError('server', 'SERVER_ERROR', '服务器内部错误，请稍后重试', error, context);
    }

    // 客户端错误
    if (error.status >= 400 && error.status < 500) {
      return this.createError('client', 'CLIENT_ERROR', `请求错误: ${error.message || '未知错误'}`, error, context);
    }

    // 未知错误
    return this.createError('unknown', 'UNKNOWN_ERROR', error.message || '发生未知错误', error, context);
  }

  /**
   * 创建标准化错误
   */
  private createError(
    type: ErrorType,
    code: string,
    message: string,
    originalError?: any,
    context?: string
  ): AppError {
    return {
      type,
      code,
      message,
      originalError,
      details: this.extractErrorDetails(originalError),
      timestamp: Date.now(),
      context,
      userId: this.getUserId(),
    };
  }

  /**
   * 提取错误详情
   */
  private extractErrorDetails(error: any): Record<string, any> {
    if (!error) {
      return {};
    }

    const details: Record<string, any> = {};

    if (error.status) {
      details.status = error.status;
    }

    if (error.statusText) {
      details.statusText = error.statusText;
    }

    if (error.response) {
      details.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      };
    }

    if (error.request) {
      details.request = {
        url: error.request.url,
        method: error.request.method,
      };
    }

    if (error.stack) {
      details.stack = error.stack;
    }

    return details;
  }

  /**
   * 记录错误
   */
  private logError(error: AppError): void {
    const logLevel = error.type === 'server' ? 'error' : 'warn';
    
    console[logLevel](`[ErrorService] ${error.type.toUpperCase()} ERROR:`, {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString(),
      details: error.details,
    });

    // 详细的错误堆栈（仅在开发环境）
    if (import.meta.env.DEV && error.originalError?.stack) {
      console.debug('[ErrorService] Original error stack:', error.originalError.stack);
    }
  }

  /**
   * 上报错误
   */
  private async reportError(error: AppError): Promise<void> {
    try {
      const report: ErrorReport = {
        error,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        sessionId: this.sessionId,
      };

      // 发送错误报告到服务器
      await fetch(`${API_BASE_URL}/api/errors/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      }).catch(() => {
        // 忽略上报失败的错误
      });

      this.emit('errorReported', report);
    } catch (reportError) {
      console.warn('[ErrorService] Failed to report error:', reportError);
    }
  }

  /**
   * 显示错误通知
   */
  private showErrorNotification(error: AppError): void {
    // 这里可以集成通知系统
    // 例如：notificationService.error(error.message);
    
    this.emit('errorNotification', error);
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 捕获全局错误
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        context: 'global',
        showNotification: true,
        reportError: true,
      });
    });

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        context: 'promise',
        showNotification: true,
        reportError: true,
      });
    });
  }

  /**
   * 设置 Promise 拒绝处理器
   */
  private setupPromiseRejectionHandler(): void {
    if (typeof window !== 'undefined' && 'onunhandledrejection' in window) {
      // 浏览器环境
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          context: 'browser-promise',
          showNotification: false,
          reportError: true,
        });
      });
    } else if (typeof process !== 'undefined' && process.on) {
      // Node.js 环境
      process.on('unhandledRejection', (reason) => {
        this.handleError(reason, {
          context: 'node-promise',
          showNotification: false,
          reportError: true,
        });
      });
    }
  }

  /**
   * 获取用户 ID
   */
  private getUserId(): string | undefined {
    // 从认证服务获取用户 ID
    try {
      const authData = localStorage.getItem('openchat_auth_data');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch {
      // 忽略错误
    }
    return undefined;
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return {
      errorCount: this.errorCount,
      sessionId: this.sessionId,
      startTime: this.sessionId.split('-')[0],
    };
  }

  /**
   * 重置错误统计
   */
  resetErrorStats(): void {
    this.errorCount = 0;
    this.sessionId = this.generateSessionId();
  }

  /**
   * 创建网络错误
   */
  createNetworkError(details?: Record<string, any>): AppError {
    return this.createError('network', 'NETWORK_ERROR', '网络连接失败，请检查网络设置', null, 'network');
  }

  /**
   * 创建认证错误
   */
  createAuthError(details?: Record<string, any>): AppError {
    return this.createError('authentication', 'AUTH_ERROR', '登录已过期，请重新登录', null, 'auth');
  }

  /**
   * 创建验证错误
   */
  createValidationError(message: string, details?: Record<string, any>): AppError {
    return this.createError('validation', 'VALIDATION_ERROR', message, null, 'validation');
  }

  /**
   * 创建服务器错误
   */
  createServerError(details?: Record<string, any>): AppError {
    return this.createError('server', 'SERVER_ERROR', '服务器内部错误，请稍后重试', null, 'server');
  }
}

export const errorService = ErrorService.getInstance();

/**
 * 全局错误处理函数
 */
export function handleError(error: any, options?: ErrorHandlerOptions): AppError {
  return errorService.handleError(error, options);
}

/**
 * 异步错误处理包装器
 */
export async function handleAsyncError<T>(
  fn: () => Promise<T>,
  options?: ErrorHandlerOptions
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    errorService.handleError(error, options);
    throw error;
  }
}

/**
 * API 错误处理拦截器
 */
export function createApiErrorInterceptor() {
  return {
    response: (response: any) => response,
    error: (error: any) => {
      errorService.handleError(error, {
        context: 'api',
        showNotification: true,
        reportError: true,
      });
      return Promise.reject(error);
    },
  };
}

export default ErrorService;