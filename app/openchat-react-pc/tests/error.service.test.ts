/**
 * 错误处理服务单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorService, handleError, handleAsyncError } from '../src/services/error.service';

describe('ErrorService', () => {
  beforeEach(() => {
    errorService.initialize();
  });

  afterEach(() => {
    errorService.resetErrorStats();
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    expect(errorService).toBeDefined();
  });

  it('should handle error', () => {
    const testError = new Error('Test error');
    const result = errorService.handleError(testError, {
      context: 'test',
      showNotification: false,
      reportError: false,
    });
    
    expect(result).toBeDefined();
    expect(result.type).toBe('unknown');
    expect(result.message).toBe('Test error');
  });

  it('should handle network error', () => {
    const networkError = new Error('Network error');
    networkError.name = 'NetworkError';
    
    const result = errorService.handleError(networkError, {
      context: 'network',
      showNotification: false,
      reportError: false,
    });
    
    expect(result.type).toBe('network');
    expect(result.message).toBe('网络连接失败，请检查网络设置');
  });

  it('should handle authentication error', () => {
    const authError = new Error('Unauthorized');
    
    const result = errorService.handleError(authError, {
      context: 'auth',
      showNotification: false,
      reportError: false,
    });
    
    expect(result.type).toBe('authentication');
    expect(result.message).toBe('登录已过期，请重新登录');
  });

  it('should handle validation error', () => {
    const validationError = new Error('Validation error');
    validationError.status = 400;
    
    const result = errorService.handleError(validationError, {
      context: 'validation',
      showNotification: false,
      reportError: false,
    });
    
    expect(result.type).toBe('validation');
    expect(result.message).toBe('输入参数错误，请检查后重试');
  });

  it('should handle server error', () => {
    const serverError = new Error('Server error');
    serverError.status = 500;
    
    const result = errorService.handleError(serverError, {
      context: 'server',
      showNotification: false,
      reportError: false,
    });
    
    expect(result.type).toBe('server');
    expect(result.message).toBe('服务器内部错误，请稍后重试');
  });

  it('should handle timeout error', () => {
    const timeoutError = new Error('Timeout');
    timeoutError.name = 'TimeoutError';
    
    const result = errorService.handleError(timeoutError, {
      context: 'timeout',
      showNotification: false,
      reportError: false,
    });
    
    expect(result.type).toBe('timeout');
    expect(result.message).toBe('请求超时，请稍后重试');
  });

  it('should handle async error', async () => {
    const asyncFn = async () => {
      throw new Error('Async error');
    };
    
    await expect(handleAsyncError(asyncFn, {
      context: 'async',
      showNotification: false,
      reportError: false,
    })).rejects.toThrow('Async error');
  });

  it('should create network error', () => {
    const error = errorService.createNetworkError();
    expect(error.type).toBe('network');
    expect(error.message).toBe('网络连接失败，请检查网络设置');
  });

  it('should create auth error', () => {
    const error = errorService.createAuthError();
    expect(error.type).toBe('authentication');
    expect(error.message).toBe('登录已过期，请重新登录');
  });

  it('should create validation error', () => {
    const error = errorService.createValidationError('Validation failed');
    expect(error.type).toBe('validation');
    expect(error.message).toBe('Validation failed');
  });

  it('should create server error', () => {
    const error = errorService.createServerError();
    expect(error.type).toBe('server');
    expect(error.message).toBe('服务器内部错误，请稍后重试');
  });

  it('should get error stats', () => {
    const stats = errorService.getErrorStats();
    expect(stats).toBeDefined();
    expect(stats.errorCount).toBe(0);
    expect(stats.sessionId).toBeDefined();
  });

  it('should reset error stats', () => {
    // 触发一个错误
    errorService.handleError(new Error('Test error'), {
      showNotification: false,
      reportError: false,
    });
    
    let stats = errorService.getErrorStats();
    expect(stats.errorCount).toBe(1);
    
    // 重置统计
    errorService.resetErrorStats();
    stats = errorService.getErrorStats();
    expect(stats.errorCount).toBe(0);
  });

  it('should handle global error handler', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
    
    const testError = new Error('Global error');
    errorService.handleError(testError, {
      context: 'global',
      showNotification: false,
      reportError: false,
    });
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
