/**
 * RTC模块类型定义
 * 支持多Provider的实时音视频通话SDK
 */

import { EventEmitter } from 'eventemitter3';

// ==================== RTC配置类型 ====================

export interface RTCConfig {
  provider: RTCProviderType;
  appId: string;
  appKey?: string;
  token?: string;
  uid: string;
  roomId: string;
  autoPublish?: boolean;
  autoSubscribe?: boolean;
  videoConfig?: RTCVideoConfig;
  audioConfig?: RTCAudioConfig;
}

export interface RTCVideoConfig {
  enabled: boolean;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  facingMode?: 'user' | 'environment';
}

export interface RTCAudioConfig {
  enabled: boolean;
  sampleRate?: number;
  bitrate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

// ==================== Provider类型 ====================

export enum RTCProviderType {
  VOLCENGINE = 'volcengine',
  AGORA = 'agora',
  TRTC = 'trtc',
  CUSTOM = 'custom',
}

// ==================== 媒体流类型 ====================

export interface RTCMediaStream {
  streamId: string;
  userId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  mediaStream?: MediaStream;
}

export interface RTCLocalStream extends RTCMediaStream {
  isLocal: true;
}

export interface RTCRemoteStream extends RTCMediaStream {
  isLocal: false;
}

// ==================== 房间状态 ====================

export enum RTCRoomState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export enum RTCStreamState {
  IDLE = 'idle',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  SUBSCRIBING = 'subscribing',
  SUBSCRIBED = 'subscribed',
  ERROR = 'error',
}

// ==================== 事件类型 ====================

export enum RTCEvent {
  // 房间事件
  ROOM_STATE_CHANGED = 'room_state_changed',
  ROOM_ERROR = 'room_error',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',

  // 流事件
  LOCAL_STREAM_PUBLISHED = 'local_stream_published',
  LOCAL_STREAM_UNPUBLISHED = 'local_stream_unpublished',
  REMOTE_STREAM_ADDED = 'remote_stream_added',
  REMOTE_STREAM_REMOVED = 'remote_stream_removed',
  REMOTE_STREAM_SUBSCRIBED = 'remote_stream_subscribed',
  REMOTE_STREAM_UNSUBSCRIBED = 'remote_stream_unsubscribed',

  // 音视频事件
  VIDEO_TRACK_ADDED = 'video_track_added',
  VIDEO_TRACK_REMOVED = 'video_track_removed',
  AUDIO_TRACK_ADDED = 'audio_track_added',
  AUDIO_TRACK_REMOVED = 'audio_track_removed',

  // 设备事件
  DEVICE_CHANGED = 'device_changed',
  CAMERA_CHANGED = 'camera_changed',
  MICROPHONE_CHANGED = 'microphone_changed',

  // 网络质量事件
  NETWORK_QUALITY = 'network_quality',
  AUDIO_QUALITY = 'audio_quality',
  VIDEO_QUALITY = 'video_quality',

  // 统计事件
  STATISTICS = 'statistics',
}

// ==================== 统计信息 ====================

export interface RTCStatistics {
  timestamp: number;
  localStreams: RTCLocalStreamStats[];
  remoteStreams: RTCRemoteStreamStats[];
}

export interface RTCLocalStreamStats {
  streamId: string;
  video?: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
    packetsSent: number;
    packetsLost: number;
    rtt: number;
  };
  audio?: {
    sampleRate: number;
    bitrate: number;
    packetsSent: number;
    packetsLost: number;
  };
}

export interface RTCRemoteStreamStats {
  streamId: string;
  userId: string;
  video?: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
    packetsReceived: number;
    packetsLost: number;
    jitter: number;
  };
  audio?: {
    sampleRate: number;
    bitrate: number;
    packetsReceived: number;
    packetsLost: number;
    jitter: number;
  };
}

// ==================== 网络质量 ====================

export enum RTCNetworkQuality {
  UNKNOWN = 0,
  EXCELLENT = 1,
  GOOD = 2,
  POOR = 3,
  BAD = 4,
  VERY_BAD = 5,
  DOWN = 6,
}

export interface RTCNetworkQualityInfo {
  userId: string;
  uplinkQuality: RTCNetworkQuality;
  downlinkQuality: RTCNetworkQuality;
}

// ==================== 错误类型 ====================

export enum RTCErrorCode {
  UNKNOWN_ERROR = 1000,
  INVALID_PARAM = 1001,
  NOT_SUPPORTED = 1002,
  PERMISSION_DENIED = 1003,
  DEVICE_NOT_FOUND = 1004,
  DEVICE_IN_USE = 1005,

  // 房间错误
  ROOM_JOIN_FAILED = 2001,
  ROOM_LEAVE_FAILED = 2002,
  ROOM_ALREADY_JOINED = 2003,
  ROOM_NOT_JOINED = 2004,

  // 流错误
  STREAM_PUBLISH_FAILED = 3001,
  STREAM_UNPUBLISH_FAILED = 3002,
  STREAM_SUBSCRIBE_FAILED = 3003,
  STREAM_UNSUBSCRIBE_FAILED = 3004,

  // 网络错误
  NETWORK_ERROR = 4001,
  SIGNALING_ERROR = 4002,
  ICE_FAILED = 4003,
}

export class RTCError extends Error {
  code: RTCErrorCode;
  data?: any;

  constructor(code: RTCErrorCode, message: string, data?: any) {
    super(message);
    this.name = 'RTCError';
    this.code = code;
    this.data = data;
  }
}

// ==================== Provider接口 ====================

export interface IRTCProvider {
  readonly providerType: RTCProviderType;
  readonly roomState: RTCRoomState;

  // EventEmitter 方法
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;

  // 初始化
  initialize(config: RTCConfig): Promise<void>;
  destroy(): Promise<void>;

  // 房间管理
  joinRoom(options?: RTCRoomOptions): Promise<void>;
  leaveRoom(): Promise<void>;

  // 本地流管理
  createLocalStream(options?: RTCStreamOptions): Promise<RTCLocalStream>;
  destroyLocalStream(streamId: string): Promise<void>;
  publishStream(stream: RTCLocalStream): Promise<void>;
  unpublishStream(streamId: string): Promise<void>;

  // 远程流管理
  subscribeStream(userId: string, options?: RTCSubscribeOptions): Promise<RTCRemoteStream>;
  unsubscribeStream(userId: string): Promise<void>;

  // 设备控制
  switchCamera(deviceId?: string): Promise<void>;
  switchMicrophone(deviceId?: string): Promise<void>;
  enableVideo(enabled: boolean): Promise<void>;
  enableAudio(enabled: boolean): Promise<void>;

  // 获取统计信息
  getStatistics(): Promise<RTCStatistics>;
}

export interface RTCRoomOptions {
  token?: string;
  userName?: string;
  role?: RTCRole;
  autoPublish?: boolean;
  autoSubscribe?: boolean;
}

export enum RTCRole {
  HOST = 'host',
  AUDIENCE = 'audience',
}

export interface RTCStreamOptions {
  video?: boolean | RTCVideoConfig;
  audio?: boolean | RTCAudioConfig;
  screen?: boolean;
}

export interface RTCSubscribeOptions {
  video?: boolean;
  audio?: boolean;
}

// ==================== 信令类型 ====================

export enum RTCSignalType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  JOIN = 'join',
  LEAVE = 'leave',
  PUBLISH = 'publish',
  UNPUBLISH = 'unpublish',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  ACK = 'ack',
}

export interface RTCSignalMessage {
  type: RTCSignalType;
  roomId: string;
  userId: string;
  targetUserId?: string;
  data: any;
  timestamp: number;
}

export interface RTCSignalOffer {
  sdp: string;
  streamId: string;
}

export interface RTCSignalAnswer {
  sdp: string;
  streamId: string;
}

export interface RTCSignalIceCandidate {
  candidate: RTCIceCandidateInit;
  streamId: string;
}

// ==================== RTC管理器配置 ====================

export interface RTCManagerConfig {
  provider: RTCProviderType;
  providerConfig: RTCProviderConfig;
  signalingConfig?: RTCSignalingConfig;
}

export interface RTCProviderConfig {
  appId: string;
  appKey?: string;
  [key: string]: any;
}

export interface RTCSignalingConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}
