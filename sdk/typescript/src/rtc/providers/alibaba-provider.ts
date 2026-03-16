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
  RTCEvent,
  RTCError,
  RTCErrorCode,
  RTCStatistics,
} from '../types';

type AlibabaClient = any;
type AlibabaStream = any;

interface AlibabaLocalStreamBinding {
  rtcStream: RTCLocalStream;
  alibabaStream?: AlibabaStream;
}

/**
 * Alibaba RTC Provider（浏览器）
 *
 * 说明：
 * - 依赖运行时已加载阿里云 RTC Web SDK（globalThis.AliRTC 或 globalThis.AliRTCSdk）
 * - `RTCConfig.appId` 复用为 appId（或 client 创建参数的一部分）
 * - `options.token` / `RTCConfig.token` 复用为加入房间鉴权 token
 */
export class AlibabaRTCProvider extends EventEmitter implements IRTCProvider {
  readonly providerType = RTCProviderType.ALIBABA;

  private client: AlibabaClient | null = null;
  private config: RTCConfig | null = null;
  private _roomState: RTCRoomState = RTCRoomState.IDLE;

  private localStreams: Map<string, AlibabaLocalStreamBinding> = new Map();
  private remoteStreams: Map<string, RTCRemoteStream> = new Map();
  private remoteAlibabaStreams: Map<string, AlibabaStream> = new Map();
  private joined = false;
  private currentToken = '';

  get roomState(): RTCRoomState {
    return this._roomState;
  }

  async initialize(config: RTCConfig): Promise<void> {
    this.ensureAlibabaSDK();
    this.config = config;
    this.currentToken = config.token || '';
    if (this.currentToken) {
      this.client = this.createClient(this.currentToken);
      this.bindClientEvents();
    }
  }

  async destroy(): Promise<void> {
    if (this.joined) {
      await this.leaveRoom();
    }
    this.localStreams.forEach(({ rtcStream, alibabaStream }) => {
      rtcStream.mediaStream?.getTracks().forEach((track) => track.stop());
      if (alibabaStream && typeof alibabaStream.close === 'function') {
        alibabaStream.close();
      }
    });
    this.localStreams.clear();
    this.remoteStreams.clear();
    this.remoteAlibabaStreams.clear();
    this.client = null;
    this.config = null;
    this.currentToken = '';
    this.joined = false;
    this._roomState = RTCRoomState.IDLE;
  }

  async joinRoom(options?: RTCRoomOptions): Promise<void> {
    if (!this.config) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'Alibaba provider is not initialized');
    }
    const roomId = options?.roomId || this.config.roomId;
    const token = options?.token || this.config.token || this.currentToken;
    if (!roomId) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'roomId is required');
    }
    if (!token) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'Alibaba token is required');
    }

    if (!this.client || token !== this.currentToken) {
      this.client = this.createClient(token);
      this.bindClientEvents();
      this.currentToken = token;
    }

    this._roomState = RTCRoomState.CONNECTING;
    this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);

    try {
      await this.joinChannel(roomId, token);
      this.joined = true;
      this._roomState = RTCRoomState.CONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);

      if (options?.autoPublish ?? this.config.autoPublish ?? true) {
        for (const { rtcStream } of this.localStreams.values()) {
          await this.publishStream(rtcStream);
        }
      }
    } catch (error) {
      this._roomState = RTCRoomState.ERROR;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      throw this.wrapError(error, RTCErrorCode.ROOM_JOIN_FAILED);
    }
  }

  async leaveRoom(): Promise<void> {
    if (!this.client || !this.joined) {
      return;
    }
    try {
      this._roomState = RTCRoomState.DISCONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      await this.leaveChannel();
      this.joined = false;
      this.remoteStreams.clear();
      this.remoteAlibabaStreams.clear();
      this._roomState = RTCRoomState.IDLE;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.ROOM_LEAVE_FAILED);
    }
  }

  async createLocalStream(options?: RTCStreamOptions): Promise<RTCLocalStream> {
    const streamId = `alibaba-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const constraints: MediaStreamConstraints = {
      video: options?.video !== false ? this.buildVideoConstraints(options?.video) : false,
      audio: options?.audio !== false ? this.buildAudioConstraints(options?.audio) : false,
    };

    let mediaStream: MediaStream;
    let alibabaStream: AlibabaStream | undefined;
    const sdk = this.getAlibabaIfLoaded();

    if (sdk && typeof sdk.createStream === 'function' && this.config) {
      const streamOption = {
        userId: this.config.uid,
        audio: constraints.audio !== false,
        video: constraints.video !== false,
      };
      alibabaStream = sdk.createStream(streamOption);
      if (typeof alibabaStream.initialize === 'function') {
        await alibabaStream.initialize();
      }
      mediaStream = this.extractMediaStream(alibabaStream) || await navigator.mediaDevices.getUserMedia(constraints);
    } else {
      this.ensureMediaDevices();
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    }

    const rtcStream: RTCLocalStream = {
      streamId,
      userId: this.config?.uid || '',
      isLocal: true,
      hasVideo: mediaStream.getVideoTracks().length > 0,
      hasAudio: mediaStream.getAudioTracks().length > 0,
      videoTrack: mediaStream.getVideoTracks()[0],
      audioTrack: mediaStream.getAudioTracks()[0],
      mediaStream,
    };

    this.localStreams.set(streamId, { rtcStream, alibabaStream });
    return rtcStream;
  }

  async destroyLocalStream(streamId: string): Promise<void> {
    const binding = this.localStreams.get(streamId);
    if (!binding) {
      return;
    }
    await this.unpublishStream(streamId);
    binding.rtcStream.mediaStream?.getTracks().forEach((track) => track.stop());
    if (binding.alibabaStream && typeof binding.alibabaStream.close === 'function') {
      binding.alibabaStream.close();
    }
    this.localStreams.delete(streamId);
  }

  async publishStream(stream: RTCLocalStream): Promise<void> {
    if (!this.client || !this.joined) {
      throw new RTCError(RTCErrorCode.STREAM_PUBLISH_FAILED, 'Alibaba client is not joined');
    }
    const binding = this.localStreams.get(stream.streamId);
    if (!binding) {
      throw new RTCError(RTCErrorCode.STREAM_PUBLISH_FAILED, `local stream not found: ${stream.streamId}`);
    }
    try {
      const targetStream = binding.alibabaStream || stream.mediaStream;
      await this.publish(targetStream);
      this.emit(RTCEvent.LOCAL_STREAM_PUBLISHED, { streamId: stream.streamId });
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.STREAM_PUBLISH_FAILED);
    }
  }

  async unpublishStream(streamId: string): Promise<void> {
    if (!this.client || !this.joined) {
      return;
    }
    const binding = this.localStreams.get(streamId);
    if (!binding) {
      return;
    }
    try {
      const targetStream = binding.alibabaStream || binding.rtcStream.mediaStream;
      await this.unpublish(targetStream);
      this.emit(RTCEvent.LOCAL_STREAM_UNPUBLISHED, { streamId });
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.STREAM_UNPUBLISH_FAILED);
    }
  }

  async subscribeStream(userId: string, options?: RTCSubscribeOptions): Promise<RTCRemoteStream> {
    if (!this.client || !this.joined) {
      throw new RTCError(RTCErrorCode.STREAM_SUBSCRIBE_FAILED, 'Alibaba client is not joined');
    }
    const remoteAlibabaStream = this.remoteAlibabaStreams.get(userId);
    if (!remoteAlibabaStream) {
      throw new RTCError(RTCErrorCode.STREAM_SUBSCRIBE_FAILED, `remote stream not found: ${userId}`);
    }
    try {
      await this.subscribe(remoteAlibabaStream);
      const mediaStream = this.extractMediaStream(remoteAlibabaStream);
      const stream: RTCRemoteStream = {
        streamId: this.remoteStreamId(userId),
        userId,
        isLocal: false,
        hasVideo: options?.video === false ? false : !!mediaStream?.getVideoTracks().length,
        hasAudio: options?.audio === false ? false : !!mediaStream?.getAudioTracks().length,
        videoTrack: options?.video === false ? undefined : mediaStream?.getVideoTracks()[0],
        audioTrack: options?.audio === false ? undefined : mediaStream?.getAudioTracks()[0],
        mediaStream,
      };
      this.remoteStreams.set(userId, stream);
      this.emit(RTCEvent.REMOTE_STREAM_SUBSCRIBED, { userId, stream });
      return stream;
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.STREAM_SUBSCRIBE_FAILED);
    }
  }

  async unsubscribeStream(userId: string): Promise<void> {
    if (!this.client || !this.joined) {
      return;
    }
    const remoteAlibabaStream = this.remoteAlibabaStreams.get(userId);
    if (!remoteAlibabaStream) {
      return;
    }
    try {
      await this.unsubscribe(remoteAlibabaStream);
      this.remoteStreams.delete(userId);
      this.emit(RTCEvent.REMOTE_STREAM_UNSUBSCRIBED, { userId });
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.STREAM_UNSUBSCRIBE_FAILED);
    }
  }

  async switchCamera(deviceId?: string): Promise<void> {
    const binding = this.firstLocalBinding();
    if (!binding) {
      throw new RTCError(RTCErrorCode.DEVICE_NOT_FOUND, 'No local stream');
    }
    if (binding.alibabaStream && typeof binding.alibabaStream.switchDevice === 'function') {
      await binding.alibabaStream.switchDevice('video', deviceId);
      return;
    }
    const track = binding.rtcStream.videoTrack;
    if (track && typeof track.applyConstraints === 'function') {
      await track.applyConstraints({
        deviceId: deviceId ? { exact: deviceId } : undefined,
      });
      return;
    }
    throw new RTCError(RTCErrorCode.NOT_SUPPORTED, 'Camera switching is not supported');
  }

  async switchMicrophone(deviceId?: string): Promise<void> {
    const binding = this.firstLocalBinding();
    if (!binding) {
      throw new RTCError(RTCErrorCode.DEVICE_NOT_FOUND, 'No local stream');
    }
    if (binding.alibabaStream && typeof binding.alibabaStream.switchDevice === 'function') {
      await binding.alibabaStream.switchDevice('audio', deviceId);
      return;
    }
    const track = binding.rtcStream.audioTrack;
    if (track && typeof track.applyConstraints === 'function') {
      await track.applyConstraints({
        deviceId: deviceId ? { exact: deviceId } : undefined,
      });
      return;
    }
    throw new RTCError(RTCErrorCode.NOT_SUPPORTED, 'Microphone switching is not supported');
  }

  async enableVideo(enabled: boolean): Promise<void> {
    this.localStreams.forEach(({ rtcStream, alibabaStream }) => {
      if (rtcStream.videoTrack) {
        rtcStream.videoTrack.enabled = enabled;
      }
      if (alibabaStream) {
        if (enabled && typeof alibabaStream.unmuteVideo === 'function') {
          alibabaStream.unmuteVideo();
        }
        if (!enabled && typeof alibabaStream.muteVideo === 'function') {
          alibabaStream.muteVideo();
        }
      }
    });
  }

  async enableAudio(enabled: boolean): Promise<void> {
    this.localStreams.forEach(({ rtcStream, alibabaStream }) => {
      if (rtcStream.audioTrack) {
        rtcStream.audioTrack.enabled = enabled;
      }
      if (alibabaStream) {
        if (enabled && typeof alibabaStream.unmuteAudio === 'function') {
          alibabaStream.unmuteAudio();
        }
        if (!enabled && typeof alibabaStream.muteAudio === 'function') {
          alibabaStream.muteAudio();
        }
      }
    });
  }

  async getStatistics(): Promise<RTCStatistics> {
    const localStats = Array.from(this.localStreams.values()).map(({ rtcStream }) => ({
      streamId: rtcStream.streamId,
      video: rtcStream.videoTrack ? {
        width: 0,
        height: 0,
        frameRate: 0,
        bitrate: 0,
        packetsSent: 0,
        packetsLost: 0,
        rtt: 0,
      } : undefined,
      audio: rtcStream.audioTrack ? {
        sampleRate: 0,
        bitrate: 0,
        packetsSent: 0,
        packetsLost: 0,
      } : undefined,
    }));

    const remoteStats = Array.from(this.remoteStreams.values()).map((stream) => ({
      streamId: stream.streamId,
      userId: stream.userId,
      video: stream.videoTrack ? {
        width: 0,
        height: 0,
        frameRate: 0,
        bitrate: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitter: 0,
      } : undefined,
      audio: stream.audioTrack ? {
        sampleRate: 0,
        bitrate: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitter: 0,
      } : undefined,
    }));

    return {
      timestamp: Date.now(),
      localStreams: localStats,
      remoteStreams: remoteStats,
    };
  }

  private createClient(token: string): AlibabaClient {
    const sdk = this.ensureAlibabaSDK();
    const creator = sdk.createClient || sdk.createEngine || sdk.createRTCClient;
    if (typeof creator !== 'function') {
      throw new RTCError(
        RTCErrorCode.NOT_SUPPORTED,
        'Alibaba SDK does not expose createClient/createEngine/createRTCClient',
      );
    }
    const appIdNumeric = Number(this.config?.appId || '');
    const baseOptions = {
      appId: Number.isNaN(appIdNumeric) ? this.config?.appId : appIdNumeric,
      userId: this.config?.uid,
      token,
    };
    return creator.call(sdk, baseOptions);
  }

  private bindClientEvents(): void {
    if (!this.client || typeof this.client.on !== 'function') {
      return;
    }
    const onUserJoined = (event: any) => {
      const userId = this.extractUserId(event);
      if (!userId) return;
      this.emit(RTCEvent.USER_JOINED, { userId });
    };
    const onUserLeft = (event: any) => {
      const userId = this.extractUserId(event);
      if (!userId) return;
      this.remoteStreams.delete(userId);
      this.remoteAlibabaStreams.delete(userId);
      this.emit(RTCEvent.USER_LEFT, { userId });
    };
    const onStreamAdded = (event: any) => {
      const stream = event?.stream || event;
      const userId = this.extractUserId(event) || this.extractUserId(stream);
      if (!userId || !stream) return;
      this.remoteAlibabaStreams.set(userId, stream);
      this.emit(RTCEvent.REMOTE_STREAM_ADDED, {
        userId,
        stream: this.remoteStreams.get(userId),
      });
    };
    const onStreamRemoved = (event: any) => {
      const userId = this.extractUserId(event) || this.extractUserId(event?.stream);
      if (!userId) return;
      this.remoteStreams.delete(userId);
      this.remoteAlibabaStreams.delete(userId);
      this.emit(RTCEvent.REMOTE_STREAM_REMOVED, { userId });
    };
    const onStateChanged = (event: any) => {
      const state = String(event?.state || event?.connectionState || '').toLowerCase();
      if (state.includes('reconnect')) {
        this._roomState = RTCRoomState.RECONNECTING;
      } else if (state.includes('connect')) {
        this._roomState = RTCRoomState.CONNECTED;
      } else if (state.includes('disconnect')) {
        this._roomState = RTCRoomState.DISCONNECTED;
      }
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    };
    const onError = (error: any) => {
      this.emit(RTCEvent.ROOM_ERROR, this.wrapError(error, RTCErrorCode.NETWORK_ERROR));
    };

    this.client.on('user-joined', onUserJoined);
    this.client.on('user-published', onUserJoined);
    this.client.on('user-left', onUserLeft);
    this.client.on('user-unpublished', onUserLeft);
    this.client.on('stream-added', onStreamAdded);
    this.client.on('stream-subscribed', onStreamAdded);
    this.client.on('stream-removed', onStreamRemoved);
    this.client.on('stream-unsubscribed', onStreamRemoved);
    this.client.on('connection-state-changed', onStateChanged);
    this.client.on('network-quality', () => {
      this.emit(RTCEvent.NETWORK_QUALITY, {});
    });
    this.client.on('error', onError);
  }

  private async joinChannel(roomId: string, token: string): Promise<void> {
    if (!this.client) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'Alibaba client is not initialized');
    }
    const payload = {
      channel: roomId,
      channelId: roomId,
      roomId,
      userId: this.config?.uid,
      appId: this.config?.appId,
      token,
    };

    if (typeof this.client.joinChannel === 'function') {
      await this.client.joinChannel(payload);
      return;
    }
    if (typeof this.client.join === 'function') {
      await this.client.join(payload);
      return;
    }
    if (typeof this.client.enterRoom === 'function') {
      await this.client.enterRoom(payload);
      return;
    }
    throw new RTCError(RTCErrorCode.NOT_SUPPORTED, 'Alibaba client does not support joinChannel/join/enterRoom');
  }

  private async leaveChannel(): Promise<void> {
    if (!this.client) {
      return;
    }
    if (typeof this.client.leaveChannel === 'function') {
      await this.client.leaveChannel();
      return;
    }
    if (typeof this.client.leave === 'function') {
      await this.client.leave();
      return;
    }
    if (typeof this.client.exitRoom === 'function') {
      await this.client.exitRoom();
      return;
    }
  }

  private async publish(stream: any): Promise<void> {
    if (!this.client) {
      throw new RTCError(RTCErrorCode.STREAM_PUBLISH_FAILED, 'Alibaba client is not initialized');
    }
    if (typeof this.client.publish === 'function') {
      await this.client.publish(stream);
      return;
    }
    if (typeof this.client.publishStream === 'function') {
      await this.client.publishStream(stream);
      return;
    }
    throw new RTCError(RTCErrorCode.NOT_SUPPORTED, 'Alibaba client does not support publish/publishStream');
  }

  private async unpublish(stream: any): Promise<void> {
    if (!this.client) {
      return;
    }
    if (typeof this.client.unpublish === 'function') {
      await this.client.unpublish(stream);
      return;
    }
    if (typeof this.client.unpublishStream === 'function') {
      await this.client.unpublishStream(stream);
      return;
    }
    if (typeof this.client.removeStream === 'function') {
      await this.client.removeStream(stream);
    }
  }

  private async subscribe(stream: any): Promise<void> {
    if (!this.client) {
      throw new RTCError(RTCErrorCode.STREAM_SUBSCRIBE_FAILED, 'Alibaba client is not initialized');
    }
    if (typeof this.client.subscribe === 'function') {
      await this.client.subscribe(stream);
      return;
    }
    if (typeof this.client.subscribeStream === 'function') {
      await this.client.subscribeStream(stream);
      return;
    }
    throw new RTCError(RTCErrorCode.NOT_SUPPORTED, 'Alibaba client does not support subscribe/subscribeStream');
  }

  private async unsubscribe(stream: any): Promise<void> {
    if (!this.client) {
      return;
    }
    if (typeof this.client.unsubscribe === 'function') {
      await this.client.unsubscribe(stream);
      return;
    }
    if (typeof this.client.unsubscribeStream === 'function') {
      await this.client.unsubscribeStream(stream);
    }
  }

  private firstLocalBinding(): AlibabaLocalStreamBinding | undefined {
    const iterator = this.localStreams.values().next();
    return iterator.done ? undefined : iterator.value;
  }

  private remoteStreamId(userId: string): string {
    return `alibaba-remote-${userId}`;
  }

  private extractUserId(source: any): string {
    const value = source?.userId
      || source?.uid
      || source?.id
      || source?.stream?.userId
      || source?.stream?.uid
      || source?.stream?.id
      || source?.stream?.getUserId?.();
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private buildVideoConstraints(video?: boolean | RTCStreamOptions['video']): MediaTrackConstraints {
    if (!video || typeof video === 'boolean') {
      return {
        width: 1280,
        height: 720,
        frameRate: 30,
      };
    }
    return {
      width: video.width || 1280,
      height: video.height || 720,
      frameRate: video.frameRate || 30,
      facingMode: video.facingMode,
    };
  }

  private buildAudioConstraints(audio?: boolean | RTCStreamOptions['audio']): MediaTrackConstraints {
    if (!audio || typeof audio === 'boolean') {
      return {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
    }
    return {
      sampleRate: audio.sampleRate,
      echoCancellation: audio.echoCancellation ?? true,
      noiseSuppression: audio.noiseSuppression ?? true,
      autoGainControl: audio.autoGainControl ?? true,
    };
  }

  private extractMediaStream(stream: AlibabaStream | undefined): MediaStream | undefined {
    if (!stream) {
      return undefined;
    }
    if (typeof stream.getMediaStream === 'function') {
      return stream.getMediaStream();
    }
    if (stream.mediaStream) {
      return stream.mediaStream as MediaStream;
    }
    return undefined;
  }

  private ensureMediaDevices(): void {
    if (
      typeof navigator === 'undefined'
      || !navigator.mediaDevices
      || typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      throw new RTCError(
        RTCErrorCode.NOT_SUPPORTED,
        'MediaDevices API is not supported in current environment',
      );
    }
  }

  private getAlibabaIfLoaded(): any {
    return (globalThis as any).AliRTC || (globalThis as any).AliRTCSdk;
  }

  private ensureAlibabaSDK(): any {
    const sdk = this.getAlibabaIfLoaded();
    if (!sdk) {
      throw new RTCError(
        RTCErrorCode.NOT_SUPPORTED,
        'Alibaba RTC SDK is not found on globalThis.AliRTC/globalThis.AliRTCSdk. Load Alibaba RTC SDK before initializing RTC.',
      );
    }
    return sdk;
  }

  private wrapError(error: any, code: RTCErrorCode): RTCError {
    if (error instanceof RTCError) {
      return error;
    }
    return new RTCError(
      code,
      error?.message || 'Alibaba provider error',
      error,
    );
  }
}

