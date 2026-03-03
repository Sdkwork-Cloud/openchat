/**
 * 閿欒澶勭悊鏈嶅姟
 *
 * 鍔熻兘锛? * 1. 鍏ㄥ眬閿欒鎹曡幏鍜屽鐞? * 2. 閿欒鍒嗙被鍜屾爣鍑嗗寲
 * 3. 閿欒鐩戞帶鍜屼笂鎶? * 4. 閿欒鏃ュ織绠＄悊
 * 5. 鐢ㄦ埛鍙嬪ソ鐨勯敊璇彁绀? */

import { API_BASE_URL } from '../config/env';

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
   * 鍒濆鍖栭敊璇鐞嗘湇鍔?   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 鎹曡幏鍏ㄥ眬閿欒
    this.setupGlobalErrorHandlers();
    
    // 鎹曡幏鏈鐞嗙殑 Promise 鎷掔粷
    this.setupPromiseRejectionHandler();
    
    this.isInitialized = true;
    console.log('[ErrorService] Initialized');
  }

  /**
   * 澶勭悊閿欒
   */
  handleError(error: any, options?: ErrorHandlerOptions): AppError {
    const {
      showNotification = true,
      reportError = true,
      logError = true,
      context = 'unknown',
    } = options || {};

    // 鏍囧噯鍖栭敊璇?    const appError = this.normalizeError(error, context);
    
    // 澧炲姞閿欒璁℃暟
    this.errorCount++;
    
    // 璁板綍閿欒
    if (logError) {
      this.logError(appError);
    }
    
    // 涓婃姤閿欒
    if (reportError) {
      this.reportError(appError);
    }
    
    // 鏄剧ず閫氱煡
    if (showNotification) {
      this.showErrorNotification(appError);
    }
    
    // 瑙﹀彂閿欒浜嬩欢
    this.emit('error', appError);
    this.emit(`error:${appError.type}`, appError);
    this.emit(`error:${appError.code}`, appError);
    
    return appError;
  }

  /**
   * 鏍囧噯鍖栭敊璇?   */
  private normalizeError(error: any, context: string): AppError {
    // 宸茬粡鏄爣鍑嗗寲閿欒
    if (error && error.type && error.code) {
      return {
        ...error,
        timestamp: error.timestamp || Date.now(),
        context: error.context || context,
      };
    }

    // 缃戠粶閿欒
    if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('Network')) {
      return this.createError('network', 'NETWORK_ERROR', '缃戠粶杩炴帴澶辫触锛岃妫€鏌ョ綉缁滆缃?, error, context);
    }

    // 璁よ瘉閿欒
    if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      return this.createError('authentication', 'AUTH_ERROR', '鐧诲綍宸茶繃鏈燂紝璇烽噸鏂扮櫥褰?, error, context);
    }

    // 鎺堟潈閿欒
    if (error.status === 403 || error.message.includes('forbidden') || error.message.includes('Forbidden')) {
      return this.createError('authorization', 'AUTHZ_ERROR', '鏉冮檺涓嶈冻锛屾棤娉曡闂璧勬簮', error, context);
    }

    // 楠岃瘉閿欒
    if (error.status === 400 || error.message.includes('validation') || error.message.includes('Validation')) {
      return this.createError('validation', 'VALIDATION_ERROR', '杈撳叆鍙傛暟閿欒锛岃妫€鏌ュ悗閲嶈瘯', error, context);
    }

    // 瓒呮椂閿欒
    if (error.name === 'TimeoutError' || error.message.includes('timeout') || error.message.includes('Timeout')) {
      return this.createError('timeout', 'TIMEOUT_ERROR', '璇锋眰瓒呮椂锛岃绋嶅悗閲嶈瘯', error, context);
    }

    // 鏈嶅姟鍣ㄩ敊璇?    if (error.status >= 500) {
      return this.createError('server', 'SERVER_ERROR', '鏈嶅姟鍣ㄥ唴閮ㄩ敊璇紝璇风◢鍚庨噸璇?, error, context);
    }

    // 瀹㈡埛绔敊璇?    if (error.status >= 400 && error.status < 500) {
      return this.createError('client', 'CLIENT_ERROR', `璇锋眰閿欒: ${error.message || '鏈煡閿欒'}`, error, context);
    }

    // 鏈煡閿欒
    return this.createError('unknown', 'UNKNOWN_ERROR', error.message || '鍙戠敓鏈煡閿欒', error, context);
  }

  /**
   * 鍒涘缓鏍囧噯鍖栭敊璇?   */
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
   * 鎻愬彇閿欒璇︽儏
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
   * 璁板綍閿欒
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

    // 璇︾粏鐨勯敊璇爢鏍堬紙浠呭湪寮€鍙戠幆澧冿級
    if (import.meta.env.DEV && error.originalError?.stack) {
      console.debug('[ErrorService] Original error stack:', error.originalError.stack);
    }
  }

  /**
   * 涓婃姤閿欒
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

      // 鍙戦€侀敊璇姤鍛婂埌鏈嶅姟鍣?      await fetch(`${API_BASE_URL}/api/errors/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      }).catch(() => {
        // 蹇界暐涓婃姤澶辫触鐨勯敊璇?      });

      this.emit('errorReported', report);
    } catch (reportError) {
      console.warn('[ErrorService] Failed to report error:', reportError);
    }
  }

  /**
   * 鏄剧ず閿欒閫氱煡
   */
  private showErrorNotification(error: AppError): void {
    // 杩欓噷鍙互闆嗘垚閫氱煡绯荤粺
    // 渚嬪锛歯otificationService.error(error.message);
    
    this.emit('errorNotification', error);
  }

  /**
   * 璁剧疆鍏ㄥ眬閿欒澶勭悊鍣?   */
  private setupGlobalErrorHandlers(): void {
    // 鎹曡幏鍏ㄥ眬閿欒
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        context: 'global',
        showNotification: true,
        reportError: true,
      });
    });

    // 鎹曡幏鏈鐞嗙殑 Promise 鎷掔粷
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        context: 'promise',
        showNotification: true,
        reportError: true,
      });
    });
  }

  /**
   * 璁剧疆 Promise 鎷掔粷澶勭悊鍣?   */
  private setupPromiseRejectionHandler(): void {
    if (typeof window !== 'undefined' && 'onunhandledrejection' in window) {
      // 娴忚鍣ㄧ幆澧?      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          context: 'browser-promise',
          showNotification: false,
          reportError: true,
        });
      });
    } else if (typeof process !== 'undefined' && process.on) {
      // Node.js 鐜
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
   * 鑾峰彇鐢ㄦ埛 ID
   */
  private getUserId(): string | undefined {
    // 浠庤璇佹湇鍔¤幏鍙栫敤鎴?ID
    try {
      const authData = localStorage.getItem('openchat_auth_data');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch {
      // 蹇界暐閿欒
    }
    return undefined;
  }

  /**
   * 鐢熸垚浼氳瘽 ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 鑾峰彇閿欒缁熻
   */
  getErrorStats() {
    return {
      errorCount: this.errorCount,
      sessionId: this.sessionId,
      startTime: this.sessionId.split('-')[0],
    };
  }

  /**
   * 閲嶇疆閿欒缁熻
   */
  resetErrorStats(): void {
    this.errorCount = 0;
    this.sessionId = this.generateSessionId();
  }

  /**
   * 鍒涘缓缃戠粶閿欒
   */
  createNetworkError(details?: Record<string, any>): AppError {
    return this.createError('network', 'NETWORK_ERROR', '缃戠粶杩炴帴澶辫触锛岃妫€鏌ョ綉缁滆缃?, null, 'network');
  }

  /**
   * 鍒涘缓璁よ瘉閿欒
   */
  createAuthError(details?: Record<string, any>): AppError {
    return this.createError('authentication', 'AUTH_ERROR', '鐧诲綍宸茶繃鏈燂紝璇烽噸鏂扮櫥褰?, null, 'auth');
  }

  /**
   * 鍒涘缓楠岃瘉閿欒
   */
  createValidationError(message: string, details?: Record<string, any>): AppError {
    return this.createError('validation', 'VALIDATION_ERROR', message, null, 'validation');
  }

  /**
   * 鍒涘缓鏈嶅姟鍣ㄩ敊璇?   */
  createServerError(details?: Record<string, any>): AppError {
    return this.createError('server', 'SERVER_ERROR', '鏈嶅姟鍣ㄥ唴閮ㄩ敊璇紝璇风◢鍚庨噸璇?, null, 'server');
  }
}

export const errorService = ErrorService.getInstance();

/**
 * 鍏ㄥ眬閿欒澶勭悊鍑芥暟
 */
export function handleError(error: any, options?: ErrorHandlerOptions): AppError {
  return errorService.handleError(error, options);
}

/**
 * 寮傛閿欒澶勭悊鍖呰鍣? */
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
 * API 閿欒澶勭悊鎷︽埅鍣? */
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

