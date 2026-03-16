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

  describe('RTC接口合同测试', () => {
    test('validateRTCToken 应该使用 POST body 调用 /rtc/tokens/validate', async () => {
      const expected = {
        valid: true,
        roomId: 'room-1',
        userId: 'user-1',
      };
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.validateRTCToken('token-abc');

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'POST',
        url: '/rtc/tokens/validate',
        data: { token: 'token-abc' },
      });
      expect(result).toEqual(expected);
    });

    test('getRTCProviderCapabilities 应该调用 /rtc/providers/capabilities', async () => {
      const expected = {
        defaultProvider: 'volcengine',
        recommendedPrimary: 'tencent',
        fallbackOrder: ['tencent', 'volcengine'],
        activeProviders: ['tencent', 'volcengine'],
        providers: [],
      };
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.getRTCProviderCapabilities();

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rtc/providers/capabilities',
      });
      expect(result).toEqual(expected);
    });

    test('getRTCProviderStats 应透传 query 到 /rtc/providers/stats', async () => {
      const query = {
        provider: 'tencent',
        operation: 'createRoom',
        windowMinutes: 30,
        topErrorLimit: 5,
      };
      const expected = [
        {
          provider: 'tencent',
          operation: 'createRoom',
          total: 10,
          success: 9,
          failure: 1,
        },
      ];
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.getRTCProviderStats(query as any);

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rtc/providers/stats',
        params: query,
      });
      expect(result).toEqual(expected);
    });

    test('getRTCProviderHealth 应透传 query 到 /rtc/providers/health', async () => {
      const query = {
        provider: 'volcengine',
        windowMinutes: 60,
        minSamples: 20,
      };
      const expected = {
        generatedAt: '2026-03-07T00:00:00.000Z',
        windowMinutes: 60,
        fallbackOrder: ['volcengine'],
        providers: [],
      };
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.getRTCProviderHealth(query as any);

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rtc/providers/health',
        params: query,
      });
      expect(result).toEqual(expected);
    });

    test('startRTCRecording 应透传 body 到 start 端点', async () => {
      const payload = {
        taskId: 'task-1',
        metadata: { source: 'sdk-test' },
      };
      const expected = { id: 'record-1', roomId: 'room-1', status: 'recording' };
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.startRTCRecording('room-1', payload);

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'POST',
        url: '/rtc/rooms/room-1/recordings/start',
        data: payload,
      });
      expect(result).toEqual(expected);
    });

    test('stopRTCRecording 应透传 body 到 stop 端点', async () => {
      const payload = {
        recordId: 'record-1',
        metadata: { reason: 'manual-stop' },
      };
      const expected = { id: 'record-1', roomId: 'room-1', status: 'completed' };
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.stopRTCRecording('room-1', payload);

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'POST',
        url: '/rtc/rooms/room-1/recordings/stop',
        data: payload,
      });
      expect(result).toEqual(expected);
    });

    test('syncRTCVideoRecord 无 body 时仍应命中 /sync 端点', async () => {
      const expected = { id: 'record-1', syncStatus: 'synced' };
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.syncRTCVideoRecord('record-1');

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'POST',
        url: '/rtc/video-records/record-1/sync',
        data: undefined,
      });
      expect(result).toEqual(expected);
    });

    test('syncRTCVideoRecord 有 body 时应透传参数', async () => {
      const payload = {
        roomId: 'room-1',
        taskId: 'task-1',
      };
      const expected = { id: 'record-1', syncStatus: 'synced' };
      const requestSpy = jest
        .spyOn(apiService as any, 'request')
        .mockResolvedValue({ code: 0, message: 'ok', data: expected });

      const result = await apiService.syncRTCVideoRecord('record-1', payload);

      expect(requestSpy).toHaveBeenCalledWith({
        method: 'POST',
        url: '/rtc/video-records/record-1/sync',
        data: payload,
      });
      expect(result).toEqual(expected);
    });
  });
});
