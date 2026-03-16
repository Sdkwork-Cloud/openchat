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

type TRTCClient = any;
type TRTCStream = any;

interface TencentLocalStreamBinding {
  rtcStream: RTCLocalStream;
  tencentStream?: TRTCStream;
}

/**
 * Tencent TRTC Provider（浏览器）
 *
 * 说明：
 * - 依赖运行时已加载 TRTC Web SDK（globalThis.TRTC）
 * - `RTCConfig.appId` 复用为 TRTC sdkAppId
 * - `options.token` / `RTCConfig.token` 复用为 TRTC userSig
 */
export class TencentRTCProvider extends EventEmitter implements IRTCProvider {
  readonly providerType = RTCProviderType.TENCENT;

  private client: TRTCClient | null = null;
  private config: RTCConfig | null = null;
  private _roomState: RTCRoomState = RTCRoomState.IDLE;

  private localStreams: Map<string, TencentLocalStreamBinding> = new Map();
  private remoteStreams: Map<string, RTCRemoteStream> = new Map();
  private remoteTRTCStreams: Map<string, TRTCStream> = new Map();
  private joined = false;
  private currentUserSig = '';

  get roomState(): RTCRoomState {
    return this._roomState;
  }

  async initialize(config: RTCConfig): Promise<void> {
    this.ensureTRTC();
    this.config = config;
    this.currentUserSig = config.token || '';
    if (this.currentUserSig) {
      this.client = this.createClient(this.currentUserSig);
      this.bindClientEvents();
    }
  }

  async destroy(): Promise<void> {
    if (this.joined) {
      await this.leaveRoom();
    }
    this.localStreams.forEach(({ rtcStream, tencentStream }) => {
      rtcStream.mediaStream?.getTracks().forEach((track) => track.stop());
      if (tencentStream && typeof tencentStream.close === 'function') {
        tencentStream.close();
      }
    });
    this.localStreams.clear();
    this.remoteStreams.clear();
    this.remoteTRTCStreams.clear();
    this.client = null;
    this.config = null;
    this.joined = false;
    this.currentUserSig = '';
    this._roomState = RTCRoomState.IDLE;
  }

  async joinRoom(options?: RTCRoomOptions): Promise<void> {
    if (!this.config) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'Tencent provider is not initialized');
    }
    const roomIdRaw = options?.roomId || this.config.roomId;
    const userSig = options?.token || this.config.token || this.currentUserSig;
    if (!roomIdRaw) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'roomId is required');
    }
    if (!userSig) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'TRTC userSig is required');
    }

    const roomIdNumber = Number(roomIdRaw);
    const roomId = Number.isNaN(roomIdNumber) ? roomIdRaw : roomIdNumber;

    if (!this.client || userSig !== this.currentUserSig) {
      this.client = this.createClient(userSig);
      this.bindClientEvents();
      this.currentUserSig = userSig;
    }

    this._roomState = RTCRoomState.CONNECTING;
    this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    try {
      await this.client.join({
        roomId,
      });
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
      await this.client.leave();
      this.joined = false;
      this.remoteStreams.clear();
      this.remoteTRTCStreams.clear();
      this._roomState = RTCRoomState.IDLE;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.ROOM_LEAVE_FAILED);
    }
  }

  async createLocalStream(options?: RTCStreamOptions): Promise<RTCLocalStream> {
    const streamId = `tencent-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const constraints: MediaStreamConstraints = {
      video: options?.video !== false ? this.buildVideoConstraints(options?.video) : false,
      audio: options?.audio !== false ? this.buildAudioConstraints(options?.audio) : false,
    };

    let mediaStream: MediaStream;
    let tencentStream: TRTCStream | undefined;
    const sdk = this.getTRTCIfLoaded();

    if (sdk && typeof sdk.createStream === 'function' && this.config) {
      const streamOption = {
        userId: this.config.uid,
        audio: constraints.audio !== false,
        video: constraints.video !== false,
      };
      tencentStream = sdk.createStream(streamOption);
      if (typeof tencentStream.initialize === 'function') {
        await tencentStream.initialize();
      }
      mediaStream = this.extractMediaStream(tencentStream) || await navigator.mediaDevices.getUserMedia(constraints);
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

    this.localStreams.set(streamId, { rtcStream, tencentStream });
    return rtcStream;
  }

  async destroyLocalStream(streamId: string): Promise<void> {
    const binding = this.localStreams.get(streamId);
    if (!binding) {
      return;
    }
    await this.unpublishStream(streamId);
    binding.rtcStream.mediaStream?.getTracks().forEach((track) => track.stop());
    if (binding.tencentStream && typeof binding.tencentStream.close === 'function') {
      binding.tencentStream.close();
    }
    this.localStreams.delete(streamId);
  }

  async publishStream(stream: RTCLocalStream): Promise<void> {
    if (!this.client || !this.joined) {
      throw new RTCError(RTCErrorCode.STREAM_PUBLISH_FAILED, 'TRTC client is not joined');
    }
    const binding = this.localStreams.get(stream.streamId);
    if (!binding) {
      throw new RTCError(RTCErrorCode.STREAM_PUBLISH_FAILED, `local stream not found: ${stream.streamId}`);
    }
    try {
      const targetStream = binding.tencentStream || stream.mediaStream;
      await this.client.publish(targetStream);
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
      await this.client.unpublish(binding.tencentStream || binding.rtcStream.mediaStream);
      this.emit(RTCEvent.LOCAL_STREAM_UNPUBLISHED, { streamId });
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.STREAM_UNPUBLISH_FAILED);
    }
  }

  async subscribeStream(userId: string, options?: RTCSubscribeOptions): Promise<RTCRemoteStream> {
    if (!this.client || !this.joined) {
      throw new RTCError(RTCErrorCode.STREAM_SUBSCRIBE_FAILED, 'TRTC client is not joined');
    }
    const remoteTRTCStream = this.remoteTRTCStreams.get(userId);
    if (!remoteTRTCStream) {
      throw new RTCError(RTCErrorCode.STREAM_SUBSCRIBE_FAILED, `remote stream not found: ${userId}`);
    }
    try {
      await this.client.subscribe(remoteTRTCStream);
      if (typeof remoteTRTCStream.play === 'function') {
        try {
          remoteTRTCStream.play();
        } catch (error) {
          // Ignore play errors in headless/non-DOM context.
        }
      }
      const mediaStream = this.extractMediaStream(remoteTRTCStream);
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
    const remoteTRTCStream = this.remoteTRTCStreams.get(userId);
    if (!remoteTRTCStream) {
      return;
    }
    try {
      await this.client.unsubscribe(remoteTRTCStream);
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
    if (binding.tencentStream && typeof binding.tencentStream.switchDevice === 'function') {
      await binding.tencentStream.switchDevice('video', deviceId);
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
    if (binding.tencentStream && typeof binding.tencentStream.switchDevice === 'function') {
      await binding.tencentStream.switchDevice('audio', deviceId);
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
    this.localStreams.forEach(({ rtcStream, tencentStream }) => {
      if (rtcStream.videoTrack) {
        rtcStream.videoTrack.enabled = enabled;
      }
      if (tencentStream) {
        if (enabled && typeof tencentStream.unmuteVideo === 'function') {
          tencentStream.unmuteVideo();
        }
        if (!enabled && typeof tencentStream.muteVideo === 'function') {
          tencentStream.muteVideo();
        }
      }
    });
  }

  async enableAudio(enabled: boolean): Promise<void> {
    this.localStreams.forEach(({ rtcStream, tencentStream }) => {
      if (rtcStream.audioTrack) {
        rtcStream.audioTrack.enabled = enabled;
      }
      if (tencentStream) {
        if (enabled && typeof tencentStream.unmuteAudio === 'function') {
          tencentStream.unmuteAudio();
        }
        if (!enabled && typeof tencentStream.muteAudio === 'function') {
          tencentStream.muteAudio();
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

  private createClient(userSig: string): TRTCClient {
    const sdk = this.ensureTRTC();
    if (!this.config?.appId) {
      throw new RTCError(RTCErrorCode.INVALID_PARAM, 'TRTC sdkAppId is required in providerConfig.appId');
    }
    const sdkAppId = Number(this.config.appId);
    return sdk.createClient({
      mode: 'videoCall',
      sdkAppId: Number.isNaN(sdkAppId) ? this.config.appId : sdkAppId,
      userId: this.config.uid,
      userSig,
    });
  }

  private bindClientEvents(): void {
    if (!this.client) {
      return;
    }
    this.client.on('peer-join', (event: any) => {
      const userId = String(event?.userId || '');
      if (!userId) return;
      this.emit(RTCEvent.USER_JOINED, { userId });
    });
    this.client.on('peer-leave', (event: any) => {
      const userId = String(event?.userId || '');
      if (!userId) return;
      this.remoteStreams.delete(userId);
      this.remoteTRTCStreams.delete(userId);
      this.emit(RTCEvent.USER_LEFT, { userId });
    });
    this.client.on('stream-added', (event: any) => {
      const stream = event?.stream;
      const userId = String(stream?.getUserId?.() || event?.userId || '');
      if (!userId || !stream) return;
      this.remoteTRTCStreams.set(userId, stream);
      this.emit(RTCEvent.REMOTE_STREAM_ADDED, {
        userId,
        stream: this.remoteStreams.get(userId),
      });
    });
    this.client.on('stream-removed', (event: any) => {
      const stream = event?.stream;
      const userId = String(stream?.getUserId?.() || event?.userId || '');
      if (!userId) return;
      this.remoteStreams.delete(userId);
      this.remoteTRTCStreams.delete(userId);
      this.emit(RTCEvent.REMOTE_STREAM_REMOVED, { userId });
    });
    this.client.on('connection-state-changed', (event: any) => {
      const state = String(event?.state || '');
      if (state === 'RECONNECTING') {
        this._roomState = RTCRoomState.RECONNECTING;
      } else if (state === 'CONNECTED') {
        this._roomState = RTCRoomState.CONNECTED;
      } else if (state === 'DISCONNECTED') {
        this._roomState = RTCRoomState.DISCONNECTED;
      }
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    });
    this.client.on('error', (error: any) => {
      this.emit(RTCEvent.ROOM_ERROR, this.wrapError(error, RTCErrorCode.NETWORK_ERROR));
    });
  }

  private firstLocalBinding(): TencentLocalStreamBinding | undefined {
    const iterator = this.localStreams.values().next();
    return iterator.done ? undefined : iterator.value;
  }

  private remoteStreamId(userId: string): string {
    return `tencent-remote-${userId}`;
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

  private extractMediaStream(stream: TRTCStream | undefined): MediaStream | undefined {
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

  private getTRTCIfLoaded(): any {
    return (globalThis as any).TRTC;
  }

  private ensureTRTC(): any {
    const sdk = this.getTRTCIfLoaded();
    if (!sdk) {
      throw new RTCError(
        RTCErrorCode.NOT_SUPPORTED,
        'TRTC SDK is not found on globalThis.TRTC. Load trtc-js-sdk before initializing RTC.',
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
      error?.message || 'Tencent provider error',
      error,
    );
  }
}

