/**
 * API服务单元测试
 * 测试API服务的核心功能
 */

import { ApiService } from '../../src/services/api-service';
import { OpenChatSDKConfig } from '../../src/types';

const testConfig: OpenChatSDKConfig = {
  server: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    maxRetries: 3,
  },
  im: {
    wsUrl: 'ws://localhost:3000/ws',
  },
  auth: {
    uid: 'test-user-1',
    token: 'test-token-123',
  },
};

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService(testConfig);
  });

  describe('基本功能测试', () => {
    test('应该能够创建API服务实例', () => {
      expect(apiService).toBeDefined();
      expect(apiService instanceof ApiService).toBe(true);
    });

    test('应该能够设置和获取Token', () => {
      const testToken = 'new-test-token';
      apiService.setToken(testToken);
      expect(apiService.getToken()).toBe(testToken);
    });

    test('应该能够处理空Token', () => {
      apiService.setToken(null);
      expect(apiService.getToken()).toBeNull();
    });
  });

  describe('错误处理测试', () => {
    test('应该能够创建错误对象', () => {
      const error = (apiService as any).createError(1001, 'Test error', { detail: 'test' });
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(1001);
      expect(error.data).toEqual({ detail: 'test' });
    });
  });
});
