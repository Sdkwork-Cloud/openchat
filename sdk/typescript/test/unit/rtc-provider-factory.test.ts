import { EventEmitter } from 'eventemitter3';
import { RTCProviderFactory } from '../../src/rtc';
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

describe('RTCProviderFactory', () => {
  beforeEach(() => {
    RTCProviderFactory.unregister(RTCProviderType.CUSTOM);
  });

  afterEach(() => {
    RTCProviderFactory.unregister(RTCProviderType.CUSTOM);
  });

  test('应该包含内置Provider类型', () => {
    const supported = RTCProviderFactory.getSupportedProviders();
    expect(supported).toEqual(
      expect.arrayContaining([
        RTCProviderType.VOLCENGINE,
        RTCProviderType.TENCENT,
        RTCProviderType.ALIBABA,
        RTCProviderType.LIVEKIT,
      ]),
    );
  });

  test('内置Provider应默认可用', () => {
    const available = RTCProviderFactory.getAvailableProviders();
    expect(available).toEqual(
      expect.arrayContaining([
        RTCProviderType.VOLCENGINE,
        RTCProviderType.TENCENT,
        RTCProviderType.ALIBABA,
        RTCProviderType.LIVEKIT,
      ]),
    );
    expect(RTCProviderFactory.isAvailable(RTCProviderType.VOLCENGINE)).toBe(true);
  });

  test('placeholder Provider应标记为不可直接运行', () => {
    RTCProviderFactory.register(
      RTCProviderType.CUSTOM,
      () => new MockRTCProvider(),
      { availability: 'placeholder' },
    );

    expect(RTCProviderFactory.isSupported(RTCProviderType.CUSTOM)).toBe(true);
    expect(RTCProviderFactory.isAvailable(RTCProviderType.CUSTOM)).toBe(false);
    expect(RTCProviderFactory.getAvailableProviders()).not.toContain(RTCProviderType.CUSTOM);
  });

  test('full/custom Provider应可创建实例并可用', () => {
    RTCProviderFactory.register(
      RTCProviderType.CUSTOM,
      () => new MockRTCProvider(),
      { availability: 'custom' },
    );

    expect(RTCProviderFactory.isSupported(RTCProviderType.CUSTOM)).toBe(true);
    expect(RTCProviderFactory.isAvailable(RTCProviderType.CUSTOM)).toBe(true);
    expect(RTCProviderFactory.getAvailableProviders()).toContain(RTCProviderType.CUSTOM);

    const instance = RTCProviderFactory.create(RTCProviderType.CUSTOM);
    expect(instance.providerType).toBe(RTCProviderType.CUSTOM);
  });

  test('注销Provider后应无法再创建实例', () => {
    RTCProviderFactory.register(
      RTCProviderType.CUSTOM,
      () => new MockRTCProvider(),
      { availability: 'custom' },
    );
    RTCProviderFactory.unregister(RTCProviderType.CUSTOM);

    expect(RTCProviderFactory.isSupported(RTCProviderType.CUSTOM)).toBe(false);
    expect(() => RTCProviderFactory.create(RTCProviderType.CUSTOM)).toThrow('Unsupported RTC provider');
  });
});
