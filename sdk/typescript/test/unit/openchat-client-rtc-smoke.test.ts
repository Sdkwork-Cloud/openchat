import { OpenChatClient } from '../../src/openchat-client';
import { RTCManager } from '../../src/rtc/rtc-manager';
import { ErrorCode, OpenChatSDKConfig } from '../../src/types';
import { RTCProviderType } from '../../src/rtc/types';

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

describe('OpenChatClient RTC smoke', () => {
  let initializeSpy: jest.SpyInstance;
  let startCallSpy: jest.SpyInstance;
  let endCallSpy: jest.SpyInstance;
  let enableVideoSpy: jest.SpyInstance;
  let enableAudioSpy: jest.SpyInstance;
  let destroySpy: jest.SpyInstance;

  beforeEach(() => {
    initializeSpy = jest
      .spyOn(RTCManager.prototype, 'initialize')
      .mockResolvedValue(undefined);
    startCallSpy = jest
      .spyOn(RTCManager.prototype, 'startCall')
      .mockResolvedValue(undefined);
    endCallSpy = jest
      .spyOn(RTCManager.prototype, 'endCall')
      .mockResolvedValue(undefined);
    enableVideoSpy = jest
      .spyOn(RTCManager.prototype, 'enableVideo')
      .mockResolvedValue(undefined);
    enableAudioSpy = jest
      .spyOn(RTCManager.prototype, 'enableAudio')
      .mockResolvedValue(undefined);
    destroySpy = jest
      .spyOn(RTCManager.prototype, 'destroy')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('应完成 RTC 主流程调用链', async () => {
    const client = new OpenChatClient(testConfig);

    await client.rtc.init({
      provider: RTCProviderType.VOLCENGINE,
      providerConfig: { appId: 'test-app-id' },
    });
    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: RTCProviderType.VOLCENGINE,
      }),
    );
    expect(client.getRTCManager()).not.toBeNull();

    await client.rtc.joinRoom('room-1', { token: 'rtc-token' });
    expect(startCallSpy).toHaveBeenCalledWith('room-1', { token: 'rtc-token' });

    await client.rtc.enableCamera(true);
    expect(enableVideoSpy).toHaveBeenCalledWith(true);

    await client.rtc.enableMicrophone(false);
    expect(enableAudioSpy).toHaveBeenCalledWith(false);

    await client.rtc.leaveRoom();
    expect(endCallSpy).toHaveBeenCalledTimes(1);

    await client.rtc.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(client.getRTCManager()).toBeNull();
  });

  test('未初始化 RTC 时调用 joinRoom 应报错', async () => {
    const client = new OpenChatClient(testConfig);
    await expect(client.rtc.joinRoom('room-1')).rejects.toMatchObject({
      code: ErrorCode.RTC_NOT_INITIALIZED,
    });
  });
});
