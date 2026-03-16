import { EventEmitter } from 'eventemitter3';
import { RTCManager } from '../../src/rtc/rtc-manager';
import {
  IRTCProvider,
  RTCConfig,
  RTCProviderType,
  RTCRoomOptions,
  RTCStreamOptions,
  RTCSubscribeOptions,
  RTCLocalStream,
  RTCRemoteStream,
  RTCRoomState,
  RTCStatistics,
} from '../../src/rtc/types';

class MockRTCProvider extends EventEmitter implements IRTCProvider {
  readonly providerType = RTCProviderType.CUSTOM;
  readonly roomState = RTCRoomState.IDLE;

  async initialize(_config: RTCConfig): Promise<void> {}
  async destroy(): Promise<void> {}
  async joinRoom(_options?: RTCRoomOptions): Promise<void> {}
  async leaveRoom(): Promise<void> {}
  async createLocalStream(_options?: RTCStreamOptions): Promise<RTCLocalStream> {
    throw new Error('Not implemented for this unit test');
  }
  async destroyLocalStream(_streamId: string): Promise<void> {}
  async publishStream(_stream: RTCLocalStream): Promise<void> {}
  async unpublishStream(_streamId: string): Promise<void> {}
  async subscribeStream(_userId: string, _options?: RTCSubscribeOptions): Promise<RTCRemoteStream> {
    throw new Error('Not implemented for this unit test');
  }
  async unsubscribeStream(_userId: string): Promise<void> {}
  async switchCamera(_deviceId?: string): Promise<void> {}
  async switchMicrophone(_deviceId?: string): Promise<void> {}
  async enableVideo(_enabled: boolean): Promise<void> {}
  async enableAudio(_enabled: boolean): Promise<void> {}
  async getStatistics(): Promise<RTCStatistics> {
    return { timestamp: Date.now(), localStreams: [], remoteStreams: [] };
  }
}

describe('RTCManager Provider Availability', () => {
  beforeEach(() => {
    RTCManager.unregisterProvider(RTCProviderType.CUSTOM);
  });

  afterEach(() => {
    RTCManager.unregisterProvider(RTCProviderType.CUSTOM);
  });

  test('应返回内置可用Provider列表', () => {
    const available = RTCManager.getAvailableProviders();
    expect(available).toEqual(
      expect.arrayContaining([
        RTCProviderType.VOLCENGINE,
        RTCProviderType.TENCENT,
        RTCProviderType.ALIBABA,
        RTCProviderType.LIVEKIT,
      ]),
    );
    expect(RTCManager.isProviderAvailable(RTCProviderType.VOLCENGINE)).toBe(true);
  });

  test('注册placeholder后应不可用但仍受支持', () => {
    RTCManager.registerProvider(
      RTCProviderType.CUSTOM,
      () => new MockRTCProvider(),
      { availability: 'placeholder' },
    );

    expect(RTCManager.getSupportedProviders()).toContain(RTCProviderType.CUSTOM);
    expect(RTCManager.isProviderAvailable(RTCProviderType.CUSTOM)).toBe(false);
    expect(RTCManager.getAvailableProviders()).not.toContain(RTCProviderType.CUSTOM);
  });

  test('注册custom/full后应可用并可创建实例', () => {
    RTCManager.registerProvider(
      RTCProviderType.CUSTOM,
      () => new MockRTCProvider(),
      { availability: 'custom' },
    );

    expect(RTCManager.isProviderAvailable(RTCProviderType.CUSTOM)).toBe(true);
    expect(RTCManager.getAvailableProviders()).toContain(RTCProviderType.CUSTOM);

    const instance = RTCManager.createProviderInstance(RTCProviderType.CUSTOM);
    expect(instance).not.toBeNull();
    expect(instance?.providerType).toBe(RTCProviderType.CUSTOM);
  });

  test('注销后应不可创建实例', () => {
    RTCManager.registerProvider(
      RTCProviderType.CUSTOM,
      () => new MockRTCProvider(),
      { availability: 'custom' },
    );
    RTCManager.unregisterProvider(RTCProviderType.CUSTOM);

    expect(RTCManager.getSupportedProviders()).not.toContain(RTCProviderType.CUSTOM);
    expect(RTCManager.isProviderAvailable(RTCProviderType.CUSTOM)).toBe(false);
    expect(RTCManager.createProviderInstance(RTCProviderType.CUSTOM)).toBeNull();
  });
});
