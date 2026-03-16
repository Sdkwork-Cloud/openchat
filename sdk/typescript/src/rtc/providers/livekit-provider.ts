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

type LivekitRoom = any;
type LivekitTrack = any;
type LivekitParticipant = any;
type LivekitTrackPublication = any;

/**
 * LiveKit Provider（浏览器）
 *
 * 说明：
 * - 依赖运行时已加载 livekit-client 浏览器 SDK（window.LivekitClient）
 * - `RTCConfig.appId` 复用为 LiveKit serverUrl（如 wss://xxx.livekit.cloud）
 */
export class LiveKitRTCProvider extends EventEmitter implements IRTCProvider {
  readonly providerType = RTCProviderType.LIVEKIT;

  private room: LivekitRoom | null = null;
  private config: RTCConfig | null = null;
  private _roomState: RTCRoomState = RTCRoomState.IDLE;

  private localStreams: Map<string, RTCLocalStream> = new Map();
  private remoteStreams: Map<string, RTCRemoteStream> = new Map();
  private remotePublications: Map<string, LivekitTrackPublication[]> = new Map();

  get roomState(): RTCRoomState {
    return this._roomState;
  }

  async initialize(config: RTCConfig): Promise<void> {
    const sdk = this.getLiveKitSDK();
    if (!config.appId) {
      throw new RTCError(
        RTCErrorCode.INVALID_PARAM,
        'LiveKit serverUrl is required in providerConfig.appId'
      );
    }
    this.config = config;
    this.room = new sdk.Room({
      adaptiveStream: true,
      dynacast: true,
    });
    this.bindRoomEvents();
  }

  async destroy(): Promise<void> {
    if (this.room) {
      await this.leaveRoom();
    }
    this.localStreams.forEach((stream) => {
      stream.mediaStream?.getTracks().forEach((track) => track.stop());
    });
    this.localStreams.clear();
    this.remoteStreams.clear();
    this.remotePublications.clear();
    this.config = null;
    this.room = null;
    this._roomState = RTCRoomState.IDLE;
  }

  async joinRoom(options?: RTCRoomOptions): Promise<void> {
    if (!this.room || !this.config) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'LiveKit room is not initialized');
    }
    const roomId = options?.roomId || this.config.roomId;
    const token = options?.token || this.config.token;
    if (!roomId) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'roomId is required');
    }
    if (!token) {
      throw new RTCError(RTCErrorCode.ROOM_JOIN_FAILED, 'LiveKit token is required');
    }
    this._roomState = RTCRoomState.CONNECTING;
    this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    try {
      await this.room.connect(this.config.appId, token, {
        autoSubscribe: options?.autoSubscribe ?? this.config.autoSubscribe ?? true,
      });
      this._roomState = RTCRoomState.CONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);

      if (options?.autoPublish ?? this.config.autoPublish ?? true) {
        for (const streamId of this.localStreams.keys()) {
          await this.publishStream(this.localStreams.get(streamId)!);
        }
      }
    } catch (error) {
      this._roomState = RTCRoomState.ERROR;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      throw this.wrapError(error, RTCErrorCode.ROOM_JOIN_FAILED);
    }
  }

  async leaveRoom(): Promise<void> {
    if (!this.room) {
      return;
    }
    try {
      this._roomState = RTCRoomState.DISCONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      await this.room.disconnect();
      this.remoteStreams.clear();
      this.remotePublications.clear();
      this._roomState = RTCRoomState.IDLE;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    } catch (error) {
      throw this.wrapError(error, RTCErrorCode.ROOM_LEAVE_FAILED);
    }
  }

  async createLocalStream(options?: RTCStreamOptions): Promise<RTCLocalStream> {
    this.ensureMediaDevices();
    const constraints: MediaStreamConstraints = {
      video: options?.video !== false ? this.buildVideoConstraints(options?.video) : false,
      audio: options?.audio !== false ? this.buildAudioConstraints(options?.audio) : false,
    };
    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    const streamId = `livekit-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const stream: RTCLocalStream = {
      streamId,
      userId: this.config?.uid || '',
      isLocal: true,
      hasVideo: mediaStream.getVideoTracks().length > 0,
      hasAudio: mediaStream.getAudioTracks().length > 0,
      videoTrack: mediaStream.getVideoTracks()[0],
      audioTrack: mediaStream.getAudioTracks()[0],
      mediaStream,
    };
    this.localStreams.set(streamId, stream);
    return stream;
  }

  async destroyLocalStream(streamId: string): Promise<void> {
    const stream = this.localStreams.get(streamId);
    if (!stream) {
      return;
    }
    await this.unpublishStream(streamId);
    stream.mediaStream?.getTracks().forEach((track) => track.stop());
    this.localStreams.delete(streamId);
  }

  async publishStream(stream: RTCLocalStream): Promise<void> {
    if (!this.room) {
      throw new RTCError(RTCErrorCode.STREAM_PUBLISH_FAILED, 'LiveKit room is not initialized');
    }
    if (stream.videoTrack) {
      await this.room.localParticipant.publishTrack(stream.videoTrack);
    }
    if (stream.audioTrack) {
      await this.room.localParticipant.publishTrack(stream.audioTrack);
    }
    this.emit(RTCEvent.LOCAL_STREAM_PUBLISHED, { streamId: stream.streamId });
  }

  async unpublishStream(streamId: string): Promise<void> {
    if (!this.room) {
      return;
    }
    const stream = this.localStreams.get(streamId);
    if (!stream) {
      return;
    }
    if (stream.videoTrack) {
      this.room.localParticipant.unpublishTrack(stream.videoTrack);
    }
    if (stream.audioTrack) {
      this.room.localParticipant.unpublishTrack(stream.audioTrack);
    }
    this.emit(RTCEvent.LOCAL_STREAM_UNPUBLISHED, { streamId });
  }

  async subscribeStream(userId: string, options?: RTCSubscribeOptions): Promise<RTCRemoteStream> {
    if (!this.room) {
      throw new RTCError(RTCErrorCode.STREAM_SUBSCRIBE_FAILED, 'LiveKit room is not initialized');
    }
    const participant = this.findParticipant(userId);
    if (!participant) {
      throw new RTCError(RTCErrorCode.STREAM_SUBSCRIBE_FAILED, `participant not found: ${userId}`);
    }

    const publications: LivekitTrackPublication[] = [];
    participant.trackPublications.forEach((publication: LivekitTrackPublication) => {
      const kind = publication.kind || publication.track?.kind;
      if (kind === 'video' && options?.video === false) {
        return;
      }
      if (kind === 'audio' && options?.audio === false) {
        return;
      }
      if (typeof publication.setSubscribed === 'function') {
        publication.setSubscribed(true);
      }
      publications.push(publication);
    });

    const stream = this.buildRemoteStreamFromPublications(userId, publications);
    this.remoteStreams.set(userId, stream);
    this.remotePublications.set(userId, publications);
    this.emit(RTCEvent.REMOTE_STREAM_SUBSCRIBED, { userId, stream });
    return stream;
  }

  async unsubscribeStream(userId: string): Promise<void> {
    const publications = this.remotePublications.get(userId) || [];
    publications.forEach((publication) => {
      if (typeof publication.setSubscribed === 'function') {
        publication.setSubscribed(false);
      }
    });
    this.remoteStreams.delete(userId);
    this.remotePublications.delete(userId);
    this.emit(RTCEvent.REMOTE_STREAM_UNSUBSCRIBED, { userId });
  }

  async switchCamera(deviceId?: string): Promise<void> {
    const stream = this.firstLocalStream();
    const track = stream?.videoTrack;
    if (!track) {
      throw new RTCError(RTCErrorCode.DEVICE_NOT_FOUND, 'No local video track');
    }
    if (typeof track.applyConstraints === 'function') {
      await track.applyConstraints({
        deviceId: deviceId ? { exact: deviceId } : undefined,
      });
      return;
    }
    throw new RTCError(RTCErrorCode.NOT_SUPPORTED, 'Current video track does not support switching camera');
  }

  async switchMicrophone(deviceId?: string): Promise<void> {
    const stream = this.firstLocalStream();
    const track = stream?.audioTrack;
    if (!track) {
      throw new RTCError(RTCErrorCode.DEVICE_NOT_FOUND, 'No local audio track');
    }
    if (typeof track.applyConstraints === 'function') {
      await track.applyConstraints({
        deviceId: deviceId ? { exact: deviceId } : undefined,
      });
      return;
    }
    throw new RTCError(RTCErrorCode.NOT_SUPPORTED, 'Current audio track does not support switching microphone');
  }

  async enableVideo(enabled: boolean): Promise<void> {
    this.localStreams.forEach((stream) => {
      if (stream.videoTrack) {
        stream.videoTrack.enabled = enabled;
      }
    });
  }

  async enableAudio(enabled: boolean): Promise<void> {
    this.localStreams.forEach((stream) => {
      if (stream.audioTrack) {
        stream.audioTrack.enabled = enabled;
      }
    });
  }

  async getStatistics(): Promise<RTCStatistics> {
    const localStats = Array.from(this.localStreams.values()).map((stream) => {
      const videoSettings = stream.videoTrack?.getSettings?.() || {};
      return {
        streamId: stream.streamId,
        video: stream.videoTrack ? {
          width: Number(videoSettings.width || 0),
          height: Number(videoSettings.height || 0),
          frameRate: Number(videoSettings.frameRate || 0),
          bitrate: 0,
          packetsSent: 0,
          packetsLost: 0,
          rtt: 0,
        } : undefined,
        audio: stream.audioTrack ? {
          sampleRate: 0,
          bitrate: 0,
          packetsSent: 0,
          packetsLost: 0,
        } : undefined,
      };
    });

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

  private bindRoomEvents(): void {
    if (!this.room) {
      return;
    }
    const sdk = this.getLiveKitSDK();
    const roomEvent = sdk.RoomEvent || {};

    this.room.on(roomEvent.ParticipantConnected || 'participantConnected', (participant: LivekitParticipant) => {
      this.emit(RTCEvent.USER_JOINED, { userId: this.participantId(participant) });
    });

    this.room.on(roomEvent.ParticipantDisconnected || 'participantDisconnected', (participant: LivekitParticipant) => {
      const userId = this.participantId(participant);
      this.remoteStreams.delete(userId);
      this.remotePublications.delete(userId);
      this.emit(RTCEvent.USER_LEFT, { userId });
    });

    this.room.on(
      roomEvent.TrackSubscribed || 'trackSubscribed',
      (track: LivekitTrack, publication: LivekitTrackPublication, participant: LivekitParticipant) => {
        const userId = this.participantId(participant);
        const oldPublications = this.remotePublications.get(userId) || [];
        const merged = [...oldPublications, publication];
        this.remotePublications.set(userId, merged);
        const stream = this.buildRemoteStreamFromPublications(userId, merged, track);
        this.remoteStreams.set(userId, stream);
        this.emit(RTCEvent.REMOTE_STREAM_ADDED, { userId, stream });
      }
    );

    this.room.on(
      roomEvent.TrackUnsubscribed || 'trackUnsubscribed',
      (_track: LivekitTrack, publication: LivekitTrackPublication, participant: LivekitParticipant) => {
        const userId = this.participantId(participant);
        const oldPublications = this.remotePublications.get(userId) || [];
        const next = oldPublications.filter((item) => item.trackSid !== publication.trackSid);
        if (next.length === 0) {
          this.remoteStreams.delete(userId);
          this.remotePublications.delete(userId);
          this.emit(RTCEvent.REMOTE_STREAM_REMOVED, { userId });
          return;
        }
        this.remotePublications.set(userId, next);
        const stream = this.buildRemoteStreamFromPublications(userId, next);
        this.remoteStreams.set(userId, stream);
        this.emit(RTCEvent.REMOTE_STREAM_ADDED, { userId, stream });
      }
    );

    this.room.on(roomEvent.Reconnecting || 'reconnecting', () => {
      this._roomState = RTCRoomState.RECONNECTING;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    });

    this.room.on(roomEvent.Reconnected || 'reconnected', () => {
      this._roomState = RTCRoomState.CONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    });

    this.room.on(roomEvent.Disconnected || 'disconnected', () => {
      this._roomState = RTCRoomState.DISCONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    });
  }

  private buildRemoteStreamFromPublications(
    userId: string,
    publications: LivekitTrackPublication[],
    latestTrack?: LivekitTrack,
  ): RTCRemoteStream {
    let videoTrack: MediaStreamTrack | undefined;
    let audioTrack: MediaStreamTrack | undefined;
    publications.forEach((publication) => {
      const track = publication.track;
      const mediaTrack = track?.mediaStreamTrack as MediaStreamTrack | undefined;
      const kind = track?.kind || publication.kind;
      if (kind === 'video' && mediaTrack) {
        videoTrack = mediaTrack;
      }
      if (kind === 'audio' && mediaTrack) {
        audioTrack = mediaTrack;
      }
    });
    const latestMediaTrack = latestTrack?.mediaStreamTrack as MediaStreamTrack | undefined;
    if (latestMediaTrack && latestMediaTrack.kind === 'video' && !videoTrack) {
      videoTrack = latestMediaTrack;
    }
    if (latestMediaTrack && latestMediaTrack.kind === 'audio' && !audioTrack) {
      audioTrack = latestMediaTrack;
    }

    return {
      streamId: `livekit-remote-${userId}`,
      userId,
      isLocal: false,
      hasVideo: !!videoTrack,
      hasAudio: !!audioTrack,
      videoTrack,
      audioTrack,
    };
  }

  private firstLocalStream(): RTCLocalStream | undefined {
    const iterator = this.localStreams.values().next();
    return iterator.done ? undefined : iterator.value;
  }

  private participantId(participant: LivekitParticipant): string {
    return participant?.identity || participant?.sid || '';
  }

  private findParticipant(userId: string): LivekitParticipant | null {
    if (!this.room) {
      return null;
    }
    const participants = this.room.remoteParticipants;
    if (!participants) {
      return null;
    }
    if (typeof participants.get === 'function') {
      const byId = participants.get(userId);
      if (byId) {
        return byId;
      }
    }
    const values: LivekitParticipant[] = typeof participants.values === 'function'
      ? Array.from(participants.values())
      : [];
    return values.find((item) => this.participantId(item) === userId) || null;
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

  private getLiveKitSDK(): any {
    const sdk = (globalThis as any).LivekitClient;
    if (!sdk) {
      throw new RTCError(
        RTCErrorCode.NOT_SUPPORTED,
        'LiveKit SDK is not found on globalThis.LivekitClient. Load livekit-client before initializing RTC.'
      );
    }
    return sdk;
  }

  private ensureMediaDevices(): void {
    if (
      typeof navigator === 'undefined'
      || !navigator.mediaDevices
      || typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      throw new RTCError(
        RTCErrorCode.NOT_SUPPORTED,
        'MediaDevices API is not supported in current environment'
      );
    }
  }

  private wrapError(error: any, code: RTCErrorCode): RTCError {
    if (error instanceof RTCError) {
      return error;
    }
    return new RTCError(
      code,
      error?.message || 'LiveKit provider error',
      error,
    );
  }
}

