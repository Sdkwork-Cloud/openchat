import { EventEmitter } from 'eventemitter3';
import {
  IRTCProvider,
  RTCConfig,
  RTCRoomOptions,
  RTCStreamOptions,
  RTCSubscribeOptions,
  RTCLocalStream,
  RTCRemoteStream,
  RTCProviderType,
  RTCRoomState,
  RTCStatistics,
  RTCError,
  RTCErrorCode,
} from '../types';

/**
 * 占位Provider：用于声明多云能力入口，实际实现由业务侧通过 register 注入。
 */
export class UnsupportedRTCProvider extends EventEmitter implements IRTCProvider {
  readonly providerType: RTCProviderType;
  readonly roomState: RTCRoomState = RTCRoomState.IDLE;
  private readonly providerLabel: string;

  constructor(providerType: RTCProviderType, providerLabel: string) {
    super();
    this.providerType = providerType;
    this.providerLabel = providerLabel;
  }

  async initialize(_config: RTCConfig): Promise<void> {
    throw this.notSupported('initialize');
  }

  async destroy(): Promise<void> {
    return Promise.resolve();
  }

  async joinRoom(_options?: RTCRoomOptions): Promise<void> {
    throw this.notSupported('joinRoom');
  }

  async leaveRoom(): Promise<void> {
    throw this.notSupported('leaveRoom');
  }

  async createLocalStream(_options?: RTCStreamOptions): Promise<RTCLocalStream> {
    throw this.notSupported('createLocalStream');
  }

  async destroyLocalStream(_streamId: string): Promise<void> {
    throw this.notSupported('destroyLocalStream');
  }

  async publishStream(_stream: RTCLocalStream): Promise<void> {
    throw this.notSupported('publishStream');
  }

  async unpublishStream(_streamId: string): Promise<void> {
    throw this.notSupported('unpublishStream');
  }

  async subscribeStream(_userId: string, _options?: RTCSubscribeOptions): Promise<RTCRemoteStream> {
    throw this.notSupported('subscribeStream');
  }

  async unsubscribeStream(_userId: string): Promise<void> {
    throw this.notSupported('unsubscribeStream');
  }

  async switchCamera(_deviceId?: string): Promise<void> {
    throw this.notSupported('switchCamera');
  }

  async switchMicrophone(_deviceId?: string): Promise<void> {
    throw this.notSupported('switchMicrophone');
  }

  async enableVideo(_enabled: boolean): Promise<void> {
    throw this.notSupported('enableVideo');
  }

  async enableAudio(_enabled: boolean): Promise<void> {
    throw this.notSupported('enableAudio');
  }

  async getStatistics(): Promise<RTCStatistics> {
    throw this.notSupported('getStatistics');
  }

  private notSupported(action: string): RTCError {
    return new RTCError(
      RTCErrorCode.NOT_SUPPORTED,
      `${this.providerLabel} provider is not bundled. Register a custom adapter via RTCProviderFactory.register(...) before ${action}.`
    );
  }
}

