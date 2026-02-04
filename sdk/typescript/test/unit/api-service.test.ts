/**
 * API服务单元测试
 * 测试API服务的核心功能、错误处理和重试机制
 */

import { ApiService } from '../../src/services/api-service';
import { OpenChatSDKConfig, ErrorCode, OpenChatError } from '../../src/types';

// 模拟HTTP客户端
const createMockHttpClient = (responses: any[] = []) => {
  let callCount = 0;
  return jest.fn().mockImplementation(async (config: any) => {
    const response = responses[callCount] || {
      data: { code: 0, message: 'Success', data: {} },
      status: 200,
      statusText: 'OK',
      headers: {},
    };
    callCount++;
    
    if (response.error) {
      throw response.error;
    }
    
    return response;
  });
};

// 测试配置
const testConfig: OpenChatSDKConfig = {
  server: {
    baseUrl: 'http://localhost:3000/api',
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
    // 每个测试用例前创建一个新的API服务实例
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

  describe('网络请求测试', () => {
    test('应该能够发送GET请求', async () => {
      const mockResponse = {
        data: { code: 0, message: 'Success', data: { id: 1, name: 'Test' } },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      const result = await mockApiService['request']({
        method: 'GET',
        url: '/test',
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('应该能够发送POST请求', async () => {
      const mockResponse = {
        data: { code: 0, message: 'Success', data: { id: 1, name: 'Test' } },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      const result = await mockApiService['request']({
        method: 'POST',
        url: '/test',
        data: { name: 'Test' },
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('错误处理测试', () => {
    test('应该能够处理HTTP错误', async () => {
      const mockResponse = {
        data: { code: 401, message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await expect(mockApiService['request']({
        method: 'GET',
        url: '/test',
      })).rejects.toThrow(OpenChatError);
    });

    test('应该能够处理网络错误', async () => {
      const networkError = new Error('Network error');
      
      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([{ error: networkError }]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await expect(mockApiService['request']({
        method: 'GET',
        url: '/test',
      })).rejects.toThrow(OpenChatError);
    });

    test('应该能够处理API错误响应', async () => {
      const mockResponse = {
        data: { code: 500, message: 'Internal Server Error' },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await expect(mockApiService['unwrapResponse'](mockResponse.data)).rejects.toThrow(OpenChatError);
    });

    test('应该能够处理缺少数据的响应', async () => {
      const mockResponse = {
        data: { code: 0, message: 'Success' },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await expect(mockApiService['unwrapResponse'](mockResponse.data)).rejects.toThrow(OpenChatError);
    });
  });

  describe('重试机制测试', () => {
    test('应该在网络错误时进行重试', async () => {
      const networkError = new Error('Network error');
      const successResponse = {
        data: { code: 0, message: 'Success', data: { id: 1, name: 'Test' } },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端，先返回错误，然后返回成功
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([
          { error: networkError },
          successResponse
        ]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      const result = await mockApiService['request']({
        method: 'GET',
        url: '/test',
        retry: true,
        retryCount: 1,
        retryDelay: 10,
      });

      expect(result).toEqual(successResponse.data);
    });

    test('应该在达到最大重试次数后抛出错误', async () => {
      const networkError = new Error('Network error');

      // 模拟HTTP客户端，始终返回错误
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([
          { error: networkError },
          { error: networkError },
          { error: networkError },
        ]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await expect(mockApiService['request']({
        method: 'GET',
        url: '/test',
        retry: true,
        retryCount: 2,
        retryDelay: 10,
      })).rejects.toThrow(OpenChatError);
    });

    test('应该对非网络错误不进行重试', async () => {
      const authError = new OpenChatError(ErrorCode.AUTH_FAILED, 'Unauthorized');

      // 模拟HTTP客户端，返回认证错误
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([
          { error: authError },
        ]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await expect(mockApiService['request']({
        method: 'GET',
        url: '/test',
        retry: true,
        retryCount: 3,
      })).rejects.toThrow(OpenChatError);
    });
  });

  describe('缓存机制测试', () => {
    test('应该对GET请求使用缓存', async () => {
      const successResponse = {
        data: { code: 0, message: 'Success', data: { id: 1, name: 'Test' } },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([successResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      // 第一次请求，应该调用API
      const result1 = await mockApiService['request']({
        method: 'GET',
        url: '/test',
        cache: true,
      });

      // 第二次请求，应该从缓存获取
      const result2 = await mockApiService['request']({
        method: 'GET',
        url: '/test',
        cache: true,
      });

      expect(result1).toEqual(successResponse.data);
      expect(result2).toEqual(successResponse.data);
    });

    test('应该对非GET请求不使用缓存', async () => {
      const successResponse = {
        data: { code: 0, message: 'Success', data: { id: 1, name: 'Test' } },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([successResponse, successResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      // 第一次请求
      const result1 = await mockApiService['request']({
        method: 'POST',
        url: '/test',
        data: { name: 'Test' },
        cache: true,
      });

      // 第二次请求，应该再次调用API
      const result2 = await mockApiService['request']({
        method: 'POST',
        url: '/test',
        data: { name: 'Test' },
        cache: true,
      });

      expect(result1).toEqual(successResponse.data);
      expect(result2).toEqual(successResponse.data);
    });
  });

  describe('认证测试', () => {
    test('应该在请求中添加认证Token', async () => {
      const successResponse = {
        data: { code: 0, message: 'Success', data: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      let lastRequestConfig: any;
      const mockHttpClient = jest.fn().mockImplementation(async (config: any) => {
        lastRequestConfig = config;
        return successResponse;
      });

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => mockHttpClient,
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await mockApiService['request']({
        method: 'GET',
        url: '/test',
      });

      expect(lastRequestConfig.headers['Authorization']).toBe(`Bearer ${testConfig.auth.token}`);
    });

    test('应该在设置新Token后更新认证头', async () => {
      const successResponse = {
        data: { code: 0, message: 'Success', data: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      let lastRequestConfig: any;
      const mockHttpClient = jest.fn().mockImplementation(async (config: any) => {
        lastRequestConfig = config;
        return successResponse;
      });

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => mockHttpClient,
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      // 设置新Token
      const newToken = 'new-test-token';
      mockApiService.setToken(newToken);

      await mockApiService['request']({
        method: 'GET',
        url: '/test',
      });

      expect(lastRequestConfig.headers['Authorization']).toBe(`Bearer ${newToken}`);
    });
  });

  describe('API方法测试', () => {
    test('应该能够调用登录方法', async () => {
      const loginResponse = {
        user: {
          id: 'test-user-1',
          username: 'test',
          nickname: 'Test User',
        },
        token: 'new-token-123',
      };

      const mockResponse = {
        data: { code: 0, message: 'Success', data: loginResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      const result = await mockApiService.login('test', 'password');
      expect(result).toEqual(loginResponse);
      expect(mockApiService.getToken()).toBe(loginResponse.token);
    });

    test('应该能够调用注册方法', async () => {
      const registerResponse = {
        user: {
          id: 'test-user-1',
          username: 'test',
          nickname: 'Test User',
        },
        token: 'new-token-123',
      };

      const mockResponse = {
        data: { code: 0, message: 'Success', data: registerResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      const result = await mockApiService.register('test', 'password', 'Test User');
      expect(result).toEqual(registerResponse);
      expect(mockApiService.getToken()).toBe(registerResponse.token);
    });

    test('应该能够调用登出方法', async () => {
      const mockResponse = {
        data: { code: 0, message: 'Success' },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      // 模拟HTTP客户端
      const originalCreateHttpClient = jest.requireActual('../../src/utils/http-client').createHttpClient;
      jest.mock('../../src/utils/http-client', () => ({
        createHttpClient: () => createMockHttpClient([mockResponse]),
      }));

      // 重新创建API服务实例以使用模拟的HTTP客户端
      const { ApiService: MockApiService } = await import('../../src/services/api-service');
      const mockApiService = new MockApiService(testConfig);

      await mockApiService.logout();
      expect(mockApiService.getToken()).toBeNull();
    });
  });
});
