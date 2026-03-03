/**
 * RTC SDK 鎶借薄灞?
 * 
 * 鑱岃矗锛?
 * 1. 瀹氫箟缁熶竴鐨?RTC SDK 鎺ュ彛鏍囧噯
 * 2. 鏀寔涓嶅悓 RTC SDK 鎻愪緵鍟嗙殑閫傞厤
 * 3. 鎻愪緵榛樿鐨勯€傞厤鍣ㄩ€夋嫨閫昏緫
 * 
 * 鍙傝€冩爣鍑嗭細
 * - 瀛楄妭璺冲姩鐏北浜?RTC SDK
 * - 鑵捐浜?RTC SDK
 * - WebRTC 鏍囧噯 API
 */

import type { CallSession, CallType, CallSignal } from '../entities/rtc.entity';
import { createSDKAdapterRegistry, type SDKAdapterBridge as BaseSDKAdapterBridge } from "@sdkwork/openchat-pc-contracts";

export interface SDKAdapterBridge extends BaseSDKAdapterBridge {}

const { registerSDKAdapter, getSDKAdapter } = createSDKAdapterRegistry<SDKAdapterBridge>();

export { getSDKAdapter, registerSDKAdapter };

// 濯掍綋娴佺害鏉熺被鍨?
export interface MediaTrackConstraints {
  deviceId?: string | { exact: string };
  width?: number | { min: number; max: number; ideal: number };
  height?: number | { min: number; max: number; ideal: number };
  frameRate?: number | { min: number; max: number; ideal: number };
}

// RTC SDK 鎻愪緵鍟嗙被鍨?
export type RTCProviderType = 'volcengine' | 'tencentcloud' | 'webrtc';

// 璁惧绫诲瀷
export type DeviceType = 'camera' | 'microphone' | 'speaker';

// 璁惧淇℃伅
export interface DeviceInfo {
  id: string;
  name: string;
}

// 濯掍綋娴佺害鏉?
export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}

// RTC 閰嶇疆閫夐」
export interface RTCConfig {
  provider: RTCProviderType;
  appId: string;
  token?: string;
  serverUrl?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableStats?: boolean;
  enableDualStream?: boolean;
  defaultDevices?: {
    camera?: string;
    microphone?: string;
    speaker?: string;
  };
}

// RTC SDK 鎶借薄鎺ュ彛
export interface RTCSDK {
  /**
   * 鍒濆鍖?SDK
   */
  init(config: RTCConfig): Promise<void>;

  /**
   * 鍒涘缓骞跺姞鍏ユ埧闂?
   */
  joinRoom(roomId: string, userId: string, token: string, callType: CallType): Promise<string>;

  /**
   * 绂诲紑鎴块棿
   */
  leaveRoom(roomId: string): Promise<void>;

  /**
   * 鍙戝竷鏈湴娴?
   */
  publishStream(stream: MediaStream, options?: any): Promise<void>;

  /**
   * 鍙栨秷鍙戝竷鏈湴娴?
   */
  unpublishStream(): Promise<void>;

  /**
   * 璁㈤槄杩滅▼娴?
   */
  subscribeStream(remoteUserId: string, options?: any): Promise<void>;

  /**
   * 鍙栨秷璁㈤槄杩滅▼娴?
   */
  unsubscribeStream(remoteUserId: string): Promise<void>;

  /**
   * 鑾峰彇鏈湴濯掍綋娴?
   */
  getLocalStream(constraints: MediaConstraints): Promise<MediaStream>;

  /**
   * 鍋滄鏈湴濯掍綋娴?
   */
  stopLocalStream(): Promise<void>;

  /**
   * 鍒囨崲璁惧
   */
  switchDevice(deviceType: DeviceType, deviceId: string): Promise<void>;

  /**
   * 鑾峰彇璁惧鍒楄〃
   */
  getDevices(deviceType: DeviceType): Promise<DeviceInfo[]>;

  /**
   * 鎺у埗鏈湴娴?
   */
  setLocalStreamEnabled(audio: boolean, video: boolean): Promise<void>;

  /**
   * 鎺у埗杩滅▼娴?
   */
  setRemoteStreamEnabled(remoteUserId: string, audio: boolean, video: boolean): Promise<void>;

  /**
   * 鍙戦€佷俊浠?
   */
  sendSignal(signal: CallSignal): Promise<void>;

  /**
   * 娉ㄥ唽浜嬩欢鐩戝惉
   */
  on(event: string, callback: Function): void;

  /**
   * 绉婚櫎浜嬩欢鐩戝惉
   */
  off(event: string, callback: Function): void;

  /**
   * 閿€姣?SDK 瀹炰緥
   */
  destroy(): Promise<void>;
}

// RTC SDK 宸ュ巶绫?
export class RTCSDKFactory {
  /**
   * 鍒涘缓 RTC SDK 瀹炰緥
   */
  static create(provider: RTCProviderType, config: RTCConfig): RTCSDK {
    switch (provider) {
      case 'volcengine':
        return new VolcEngineRTCSDKAdapter(config);
      case 'tencentcloud':
        return new TencentCloudRTCSDKAdapter(config);
      case 'webrtc':
      default:
        return new WebRTCAdapter(config);
    }
  }

  /**
   * 鏍规嵁璁惧绫诲瀷閫夋嫨榛樿鐨?RTC SDK 鎻愪緵鍟?
   */
  static getDefaultProvider(): RTCProviderType {
    // 妫€娴嬫槸鍚﹀湪绉诲姩璁惧
    const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // 绉诲姩璁惧榛樿浣跨敤鐏北浜?RTC
    if (isMobile) {
      return 'volcengine';
    }
    
    // 妗岄潰璁惧榛樿浣跨敤 WebRTC
    return 'webrtc';
  }
}

// 鐏北浜?RTC SDK 閫傞厤鍣?
type VolcRTCMethod = (...args: unknown[]) => unknown;

interface VolcRTCUserInfo {
  userId: string;
  extraInfo?: string;
}

interface VolcRTCRoomConfig {
  roomId: string;
  isAutoPublish?: boolean;
  isAutoSubscribe?: boolean;
  profileType?: string;
}

interface VolcRTCEngine {
  joinRoom?: VolcRTCMethod;
  leaveRoom?: VolcRTCMethod;
  publishStream?: VolcRTCMethod;
  unpublishStream?: VolcRTCMethod;
  subscribeStream?: VolcRTCMethod;
  unsubscribeStream?: VolcRTCMethod;
  startAudioCapture?: VolcRTCMethod;
  stopAudioCapture?: VolcRTCMethod;
  startVideoCapture?: VolcRTCMethod;
  stopVideoCapture?: VolcRTCMethod;
  setVideoCaptureDevice?: VolcRTCMethod;
  setAudioCaptureDevice?: VolcRTCMethod;
  setAudioPlaybackDevice?: VolcRTCMethod;
  enumerateDevices?: VolcRTCMethod;
  enumerateAudioCaptureDevices?: VolcRTCMethod;
  enumerateVideoCaptureDevices?: VolcRTCMethod;
  enumerateAudioPlaybackDevices?: VolcRTCMethod;
  enableLocalAudio?: VolcRTCMethod;
  enableLocalVideo?: VolcRTCMethod;
  muteLocalAudioStream?: VolcRTCMethod;
  muteLocalVideoStream?: VolcRTCMethod;
  on?: VolcRTCMethod;
  off?: VolcRTCMethod;
  destroy?: VolcRTCMethod;
}

interface VolcRTCNamespace {
  createEngine?: (appId: string) => VolcRTCEngine;
  createRTCVideo?: (appId: string) => VolcRTCEngine;
  destroyEngine?: () => void;
  events?: Record<string, string>;
  MediaType?: Record<string, unknown>;
  MediaStreamType?: Record<string, unknown>;
  StreamIndex?: Record<string, unknown>;
}

interface VolcRTCDevice {
  deviceId?: string;
  deviceID?: string;
  id?: string;
  label?: string;
  name?: string;
  deviceName?: string;
  kind?: string;
  deviceType?: string;
}

class VolcEngineRTCSDKAdapter implements RTCSDK {
  private config: RTCConfig;
  private sdkNamespace: VolcRTCNamespace | null = null;
  private engine: VolcRTCEngine | null = null;
  private localStream: MediaStream | null = null;
  private joinedRoomId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private bridgedEngineListeners: Array<{ event: string; handler: (...args: unknown[]) => void }> = [];

  constructor(config: RTCConfig) {
    this.config = config;
  }

  async init(config: RTCConfig): Promise<void> {
    this.config = config;
    if (!config.appId) {
      throw new Error('[Volcengine RTC] appId is required.');
    }

    this.sdkNamespace = await this.resolveSDKNamespace();
    const createEngine = VolcEngineRTCSDKAdapter.asMethod(this.sdkNamespace.createEngine)
      ?? VolcEngineRTCSDKAdapter.asMethod(this.sdkNamespace.createRTCVideo);
    if (!createEngine) {
      throw new Error('[Volcengine RTC] createEngine/createRTCVideo is unavailable.');
    }

    const createdEngine = createEngine.call(this.sdkNamespace, config.appId);
    if (!VolcEngineRTCSDKAdapter.isRecord(createdEngine)) {
      throw new Error('[Volcengine RTC] failed to create engine instance.');
    }

    this.engine = createdEngine as VolcRTCEngine;
    this.bindEngineEvents();
  }

  async joinRoom(roomId: string, userId: string, token: string, callType: CallType): Promise<string> {
    this.ensureEngine();
    const roomConfig: VolcRTCRoomConfig = {
      roomId,
      isAutoPublish: false,
      isAutoSubscribe: true,
      profileType: callType === 'video' ? 'communication' : 'communication',
    };
    const userInfo: VolcRTCUserInfo = {
      userId,
      extraInfo: callType,
    };

    if (!(await this.tryInvoke('joinRoom', token, userInfo, roomConfig))
      && !(await this.tryInvoke('joinRoom', token, { uid: userId }, roomConfig))
      && !(await this.tryInvoke('joinRoom', token, userId, roomConfig))) {
      throw new Error('[Volcengine RTC] joinRoom failed with all known signatures.');
    }

    this.joinedRoomId = roomId;
    return roomId;
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.engine) {
      return;
    }
    await this.tryInvoke('leaveRoom');
    if (this.joinedRoomId === roomId) {
      this.joinedRoomId = null;
    }
  }

  async publishStream(stream: MediaStream, options?: any): Promise<void> {
    this.ensureEngine();
    this.localStream = stream;

    const tracks = stream.getTracks();
    const hasAudio = stream.getAudioTracks().length > 0;
    const hasVideo = stream.getVideoTracks().length > 0;
    const streamIndex = this.resolveMainStreamIndex();
    const mediaType = this.resolveMediaType(hasAudio, hasVideo);

    if (streamIndex !== undefined && tracks.length > 0 && await this.tryInvoke('publishStream', streamIndex, tracks)) {
      return;
    }
    if (await this.tryInvoke('publishStream', stream)) {
      return;
    }

    if (hasAudio) {
      await this.callEngineIfExists('startAudioCapture');
    }
    if (hasVideo) {
      await this.callEngineIfExists('startVideoCapture');
    }
    if (mediaType !== undefined && await this.tryInvoke('publishStream', mediaType)) {
      return;
    }
    if (await this.tryInvoke('publishStream')) {
      return;
    }

    throw new Error('[Volcengine RTC] publishStream failed with all known signatures.');
  }

  async unpublishStream(): Promise<void> {
    if (!this.engine) {
      return;
    }

    const hasAudio = this.localStream?.getAudioTracks().length ? true : false;
    const hasVideo = this.localStream?.getVideoTracks().length ? true : false;
    const streamIndex = this.resolveMainStreamIndex();
    const mediaType = this.resolveMediaType(hasAudio, hasVideo);

    if (mediaType !== undefined && await this.tryInvoke('unpublishStream', mediaType)) {
      return;
    }
    if (streamIndex !== undefined && await this.tryInvoke('unpublishStream', streamIndex)) {
      return;
    }
    if (await this.tryInvoke('unpublishStream')) {
      return;
    }
  }

  async subscribeStream(remoteUserId: string, options?: any): Promise<void> {
    this.ensureEngine();
    const expectedAudio = typeof options?.audio === 'boolean' ? options.audio : true;
    const expectedVideo = typeof options?.video === 'boolean' ? options.video : true;
    const streamIndex = this.resolveMainStreamIndex();
    const mediaType = this.resolveMediaType(expectedAudio, expectedVideo);

    if (mediaType !== undefined && await this.tryInvoke('subscribeStream', remoteUserId, mediaType)) {
      return;
    }
    if (streamIndex !== undefined && await this.tryInvoke('subscribeStream', remoteUserId, streamIndex)) {
      return;
    }
    if (await this.tryInvoke('subscribeStream', remoteUserId)) {
      return;
    }

    throw new Error('[Volcengine RTC] subscribeStream failed with all known signatures.');
  }

  async unsubscribeStream(remoteUserId: string): Promise<void> {
    if (!this.engine) {
      return;
    }

    const streamIndex = this.resolveMainStreamIndex();
    if (streamIndex !== undefined && await this.tryInvoke('unsubscribeStream', remoteUserId, streamIndex)) {
      return;
    }
    if (await this.tryInvoke('unsubscribeStream', remoteUserId)) {
      return;
    }
  }

  async getLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('[Volcengine RTC] mediaDevices.getUserMedia is unavailable.');
    }
    await this.stopLocalStream();

    const hasAudio = constraints.audio !== false;
    const hasVideo = constraints.video !== false;
    if (!hasAudio && !hasVideo) {
      const emptyStream = new MediaStream();
      this.localStream = emptyStream;
      return emptyStream;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: constraints.audio,
      video: constraints.video,
    });
    this.localStream = stream;
    return stream;
  }

  async stopLocalStream(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    await this.callEngineIfExists('stopAudioCapture');
    await this.callEngineIfExists('stopVideoCapture');
  }

  async switchDevice(deviceType: DeviceType, deviceId: string): Promise<void> {
    this.ensureEngine();
    if (deviceType === 'camera') {
      if (!(await this.callEngineIfExists('setVideoCaptureDevice', deviceId))) {
        await this.replaceLocalTrack('video', deviceId);
      }
      return;
    }
    if (deviceType === 'microphone') {
      if (!(await this.callEngineIfExists('setAudioCaptureDevice', deviceId))) {
        await this.replaceLocalTrack('audio', deviceId);
      }
      return;
    }
    if (!(await this.callEngineIfExists('setAudioPlaybackDevice', deviceId))) {
      throw new Error('[Volcengine RTC] speaker switching is not supported by current SDK version.');
    }
  }

  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    const providerDevices = await this.getProviderDevices(deviceType);
    if (providerDevices.length > 0) {
      return providerDevices;
    }

    if (!navigator?.mediaDevices?.enumerateDevices) {
      return [];
    }
    const browserDevices = await navigator.mediaDevices.enumerateDevices();
    return browserDevices
      .filter((device) => {
        if (deviceType === 'camera') return device.kind === 'videoinput';
        if (deviceType === 'microphone') return device.kind === 'audioinput';
        return device.kind === 'audiooutput';
      })
      .map((device) => ({
        id: device.deviceId,
        name: device.label || `Unknown ${deviceType}`,
      }));
  }

  async setLocalStreamEnabled(audio: boolean, video: boolean): Promise<void> {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = audio;
      });
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = video;
      });
    }

    if (!(await this.callEngineIfExists('enableLocalAudio', audio))) {
      await this.callEngineIfExists('muteLocalAudioStream', !audio);
    }
    if (!(await this.callEngineIfExists('enableLocalVideo', video))) {
      await this.callEngineIfExists('muteLocalVideoStream', !video);
    }
  }

  async setRemoteStreamEnabled(remoteUserId: string, audio: boolean, video: boolean): Promise<void> {
    if (!audio && !video) {
      await this.unsubscribeStream(remoteUserId);
      return;
    }
    await this.subscribeStream(remoteUserId, { audio, video });
  }

  async sendSignal(signal: CallSignal): Promise<void> {
    console.warn('[Volcengine RTC] sendSignal should be handled by IM/signaling service.', signal);
  }

  on(event: string, callback: Function): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(callback);
    this.listeners.set(event, listeners);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }
    listeners.delete(callback);
    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  async destroy(): Promise<void> {
    if (!this.engine) {
      this.listeners.clear();
      return;
    }

    try {
      await this.unpublishStream();
      if (this.joinedRoomId) {
        await this.leaveRoom(this.joinedRoomId);
      }
      await this.stopLocalStream();
    } finally {
      this.unbindEngineEvents();
      await this.callEngineIfExists('destroy');
      if (this.sdkNamespace?.destroyEngine) {
        this.sdkNamespace.destroyEngine();
      }
      this.engine = null;
      this.sdkNamespace = null;
      this.joinedRoomId = null;
      this.listeners.clear();
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private static asMethod(value: unknown): VolcRTCMethod | null {
    return typeof value === 'function' ? (value as VolcRTCMethod) : null;
  }

  private static readString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  }

  private ensureEngine(): VolcRTCEngine {
    if (!this.engine) {
      throw new Error('[Volcengine RTC] engine not initialized. Call init() first.');
    }
    return this.engine;
  }

  private async resolveSDKNamespace(): Promise<VolcRTCNamespace> {
    const globalNamespace = this.resolveSDKNamespaceFromGlobal();
    if (globalNamespace) {
      return globalNamespace;
    }

    try {
      const modulePath = '@volcengine/rtc';
      const runtimeModule = await import(/* @vite-ignore */ modulePath);
      const moduleNamespace = this.resolveNamespaceCandidate(runtimeModule)
        ?? this.resolveNamespaceCandidate((runtimeModule as { default?: unknown }).default);
      if (moduleNamespace) {
        return moduleNamespace;
      }
    } catch (error) {
      console.warn('[Volcengine RTC] runtime import failed, fallback to global SDK only.', error);
    }

    throw new Error(
      '[Volcengine RTC] SDK is unavailable. Install @volcengine/rtc or inject SDK script exposing window.VERTC.',
    );
  }

  private resolveSDKNamespaceFromGlobal(): VolcRTCNamespace | null {
    const globalScope = globalThis as Record<string, unknown>;
    const candidates = [
      globalScope.VERTC,
      globalScope.RTCVideo,
      globalScope.VolcEngineRTC,
    ];
    for (const candidate of candidates) {
      const namespace = this.resolveNamespaceCandidate(candidate);
      if (namespace) {
        return namespace;
      }
    }
    return null;
  }

  private resolveNamespaceCandidate(candidate: unknown): VolcRTCNamespace | null {
    if (!VolcEngineRTCSDKAdapter.isRecord(candidate)) {
      return null;
    }
    const createEngine = VolcEngineRTCSDKAdapter.asMethod(candidate.createEngine);
    const createRTCVideo = VolcEngineRTCSDKAdapter.asMethod(candidate.createRTCVideo);
    if (!createEngine && !createRTCVideo) {
      return null;
    }
    return candidate as VolcRTCNamespace;
  }

  private resolveMainStreamIndex(): unknown {
    const streamIndex = this.sdkNamespace?.StreamIndex;
    if (streamIndex) {
      if ('Main' in streamIndex) {
        return streamIndex.Main;
      }
      if ('MAIN' in streamIndex) {
        return streamIndex.MAIN;
      }
    }

    const mediaStreamType = this.sdkNamespace?.MediaStreamType;
    if (mediaStreamType && 'STREAM_INDEX_MAIN' in mediaStreamType) {
      return mediaStreamType.STREAM_INDEX_MAIN;
    }

    return undefined;
  }

  private resolveMediaType(hasAudio: boolean, hasVideo: boolean): unknown {
    const mediaType = this.sdkNamespace?.MediaType;
    if (!mediaType) {
      return undefined;
    }
    if (hasAudio && hasVideo && 'AUDIO_AND_VIDEO' in mediaType) {
      return mediaType.AUDIO_AND_VIDEO;
    }
    if (hasAudio && !hasVideo && 'AUDIO_ONLY' in mediaType) {
      return mediaType.AUDIO_ONLY;
    }
    if (!hasAudio && hasVideo && 'VIDEO_ONLY' in mediaType) {
      return mediaType.VIDEO_ONLY;
    }
    return undefined;
  }

  private async tryInvoke(methodName: keyof VolcRTCEngine, ...args: unknown[]): Promise<boolean> {
    if (!this.engine) {
      return false;
    }
    const method = VolcEngineRTCSDKAdapter.asMethod(this.engine[methodName]);
    if (!method) {
      return false;
    }

    try {
      await Promise.resolve(method.apply(this.engine, args));
      return true;
    } catch {
      return false;
    }
  }

  private async callEngineIfExists(methodName: keyof VolcRTCEngine, ...args: unknown[]): Promise<boolean> {
    if (!this.engine) {
      return false;
    }
    const method = VolcEngineRTCSDKAdapter.asMethod(this.engine[methodName]);
    if (!method) {
      return false;
    }
    await Promise.resolve(method.apply(this.engine, args));
    return true;
  }

  private async replaceLocalTrack(kind: 'audio' | 'video', deviceId: string): Promise<void> {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('[Volcengine RTC] mediaDevices.getUserMedia is unavailable.');
    }

    const constraints: MediaStreamConstraints = kind === 'video'
      ? { video: { deviceId: { exact: deviceId } }, audio: false }
      : { audio: { deviceId: { exact: deviceId } }, video: false };

    const switchedStream = await navigator.mediaDevices.getUserMedia(constraints);
    const newTrack = kind === 'video' ? switchedStream.getVideoTracks()[0] : switchedStream.getAudioTracks()[0];
    if (!newTrack) {
      throw new Error(`[Volcengine RTC] failed to acquire ${kind} track from device ${deviceId}.`);
    }

    if (!this.localStream) {
      this.localStream = new MediaStream([newTrack]);
      return;
    }

    const staleTracks = kind === 'video'
      ? this.localStream.getVideoTracks()
      : this.localStream.getAudioTracks();
    staleTracks.forEach((track) => {
      this.localStream?.removeTrack(track);
      track.stop();
    });
    this.localStream.addTrack(newTrack);
  }

  private async getProviderDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    if (!this.engine) {
      return [];
    }

    const candidateMethods: Array<keyof VolcRTCEngine> = (() => {
      if (deviceType === 'camera') {
        return ['enumerateVideoCaptureDevices', 'enumerateDevices'];
      }
      if (deviceType === 'microphone') {
        return ['enumerateAudioCaptureDevices', 'enumerateDevices'];
      }
      return ['enumerateAudioPlaybackDevices', 'enumerateDevices'];
    })();

    for (const methodName of candidateMethods) {
      const method = VolcEngineRTCSDKAdapter.asMethod(this.engine[methodName]);
      if (!method) {
        continue;
      }

      try {
        const rawDevices = await Promise.resolve(method.call(this.engine));
        const normalizedDevices = this.normalizeProviderDevices(rawDevices, deviceType);
        if (normalizedDevices.length > 0) {
          return normalizedDevices;
        }
      } catch (error) {
        console.warn(`[Volcengine RTC] ${String(methodName)} failed.`, error);
      }
    }

    return [];
  }

  private normalizeProviderDevices(rawDevices: unknown, deviceType: DeviceType): DeviceInfo[] {
    if (!Array.isArray(rawDevices)) {
      return [];
    }

    return rawDevices
      .map((device) => this.normalizeProviderDevice(device, deviceType))
      .filter((device): device is DeviceInfo => device !== null);
  }

  private normalizeProviderDevice(rawDevice: unknown, expectedType: DeviceType): DeviceInfo | null {
    if (!VolcEngineRTCSDKAdapter.isRecord(rawDevice)) {
      return null;
    }
    const device = rawDevice as VolcRTCDevice;
    const id = device.deviceId ?? device.deviceID ?? device.id;
    if (!id) {
      return null;
    }

    const rawKind = device.kind ?? device.deviceType;
    if (rawKind && !this.isKindMatched(expectedType, rawKind)) {
      return null;
    }

    return {
      id,
      name: device.label ?? device.name ?? device.deviceName ?? `Unknown ${expectedType}`,
    };
  }

  private isKindMatched(expectedType: DeviceType, rawKind: string): boolean {
    const kind = rawKind.toLowerCase();
    if (expectedType === 'camera') {
      return kind.includes('video') || kind.includes('camera');
    }
    if (expectedType === 'microphone') {
      return kind.includes('audioinput') || kind.includes('microphone') || kind.includes('mic');
    }
    return kind.includes('audiooutput') || kind.includes('speaker');
  }

  private bindEngineEvents() {
    if (!this.engine) {
      return;
    }

    const onMethod = VolcEngineRTCSDKAdapter.asMethod(this.engine.on);
    if (!onMethod) {
      return;
    }

    this.bridgeEvent(
      this.resolveEventNames('onUserPublishStream', 'user-published', 'stream-added'),
      'stream-added',
      (...args) => this.normalizeStreamEvent(args),
    );
    this.bridgeEvent(
      this.resolveEventNames('onUserUnpublishStream', 'user-unpublished', 'stream-removed'),
      'stream-removed',
      (...args) => this.normalizeStreamEvent(args),
    );
    this.bridgeEvent(
      this.resolveEventNames('onUserJoined', 'user-joined'),
      'stream-updated',
      (...args) => this.normalizeStreamEvent(args),
    );
    this.bridgeEvent(
      this.resolveEventNames('onUserLeave', 'user-left'),
      'stream-updated',
      (...args) => this.normalizeStreamEvent(args),
    );
    this.bridgeEvent(
      this.resolveEventNames('onConnectionStateChanged', 'connection-state-change', 'room-state-changed'),
      'room-state-changed',
      (...args) => this.normalizeRoomStateEvent(args),
    );
  }

  private unbindEngineEvents() {
    if (!this.engine) {
      this.bridgedEngineListeners = [];
      return;
    }
    const offMethod = VolcEngineRTCSDKAdapter.asMethod(this.engine.off);
    if (!offMethod) {
      this.bridgedEngineListeners = [];
      return;
    }

    for (const listener of this.bridgedEngineListeners) {
      offMethod.call(this.engine, listener.event, listener.handler);
    }
    this.bridgedEngineListeners = [];
  }

  private resolveEventNames(...fallbackEvents: string[]): string[] {
    const names = new Set<string>();
    const eventMap = this.sdkNamespace?.events;

    for (const fallbackEvent of fallbackEvents) {
      if (!fallbackEvent) {
        continue;
      }
      if (eventMap) {
        const mappedEvent = VolcEngineRTCSDKAdapter.readString(eventMap, fallbackEvent);
        if (mappedEvent) {
          names.add(mappedEvent);
        }
      }
      names.add(fallbackEvent);
    }
    return [...names];
  }

  private bridgeEvent(
    sourceEvents: string[],
    targetEvent: string,
    normalizer: (...args: unknown[]) => unknown,
  ) {
    if (!this.engine) {
      return;
    }
    const onMethod = VolcEngineRTCSDKAdapter.asMethod(this.engine.on);
    if (!onMethod) {
      return;
    }

    for (const sourceEvent of sourceEvents) {
      const handler = (...args: unknown[]) => {
        this.emit(targetEvent, normalizer(...args));
      };
      onMethod.call(this.engine, sourceEvent, handler);
      this.bridgedEngineListeners.push({ event: sourceEvent, handler });
    }
  }

  private normalizeStreamEvent(args: unknown[]): unknown {
    if (args.length === 0) {
      return {};
    }
    if (args.length === 1) {
      return args[0];
    }
    if (typeof args[0] === 'string') {
      return {
        userId: args[0],
        mediaType: args[1],
      };
    }
    return { payload: args };
  }

  private normalizeRoomStateEvent(args: unknown[]): unknown {
    if (args.length === 0) {
      return {};
    }
    if (args.length === 1) {
      return args[0];
    }
    return {
      state: args[0],
      reason: args[1],
      extra: args[2],
    };
  }

  private emit(event: string, payload: unknown) {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) {
      return;
    }
    for (const listener of listeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[Volcengine RTC] listener error on "${event}"`, error);
      }
    }
  }
}

// 鑵捐浜?RTC SDK 閫傞厤鍣?
class TencentCloudRTCSDKAdapter implements RTCSDK {
  private config: RTCConfig;
  private instance: any = null;

  constructor(config: RTCConfig) {
    this.config = config;
  }

  async init(config: RTCConfig): Promise<void> {
    // 鍒濆鍖栬吘璁簯 RTC SDK
    // 杩欓噷闇€瑕佸紩鍏ヨ吘璁簯 RTC SDK
    // import TRTC from 'trtc-js-sdk';
    console.log('Initializing TencentCloud RTC SDK', config);
  }

  async joinRoom(roomId: string, userId: string, token: string, callType: CallType): Promise<string> {
    console.log('TencentCloud joinRoom', { roomId, userId, callType });
    return roomId;
  }

  async leaveRoom(roomId: string): Promise<void> {
    console.log('TencentCloud leaveRoom', roomId);
  }

  async publishStream(stream: MediaStream, options?: any): Promise<void> {
    console.log('TencentCloud publishStream', options);
  }

  async unpublishStream(): Promise<void> {
    console.log('TencentCloud unpublishStream');
  }

  async subscribeStream(remoteUserId: string, options?: any): Promise<void> {
    console.log('TencentCloud subscribeStream', { remoteUserId, options });
  }

  async unsubscribeStream(remoteUserId: string): Promise<void> {
    console.log('TencentCloud unsubscribeStream', remoteUserId);
  }

  async getLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
    console.log('TencentCloud getLocalStream', constraints);
    // 妯℃嫙杩斿洖濯掍綋娴?
    return new MediaStream();
  }

  async stopLocalStream(): Promise<void> {
    console.log('TencentCloud stopLocalStream');
  }

  async switchDevice(deviceType: DeviceType, deviceId: string): Promise<void> {
    console.log('TencentCloud switchDevice', { deviceType, deviceId });
  }

  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    console.log('TencentCloud getDevices', deviceType);
    return [];
  }

  async setLocalStreamEnabled(audio: boolean, video: boolean): Promise<void> {
    console.log('TencentCloud setLocalStreamEnabled', { audio, video });
  }

  async setRemoteStreamEnabled(remoteUserId: string, audio: boolean, video: boolean): Promise<void> {
    console.log('TencentCloud setRemoteStreamEnabled', { remoteUserId, audio, video });
  }

  async sendSignal(signal: CallSignal): Promise<void> {
    console.log('TencentCloud sendSignal', signal);
  }

  on(event: string, callback: Function): void {
    console.log('TencentCloud on', event);
  }

  off(event: string, callback: Function): void {
    console.log('TencentCloud off', event);
  }

  async destroy(): Promise<void> {
    console.log('TencentCloud destroy');
  }
}

// WebRTC 閫傞厤鍣?
class WebRTCAdapter implements RTCSDK {
  private config: RTCConfig;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStreams: Map<string, MediaStream> = new Map();

  constructor(config: RTCConfig) {
    this.config = config;
  }

  async init(config: RTCConfig): Promise<void> {
    console.log('Initializing WebRTC Adapter', config);
  }

  async joinRoom(roomId: string, userId: string, token: string, callType: CallType): Promise<string> {
    console.log('WebRTC joinRoom', { roomId, userId, callType });
    
    // 鍒涘缓 PeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    this.peerConnections.set(roomId, pc);
    return roomId;
  }

  async leaveRoom(roomId: string): Promise<void> {
    console.log('WebRTC leaveRoom', roomId);
    
    const pc = this.peerConnections.get(roomId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(roomId);
    }
    
    const stream = this.localStreams.get(roomId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.localStreams.delete(roomId);
    }
  }

  async publishStream(stream: MediaStream, options?: any): Promise<void> {
    console.log('WebRTC publishStream', options);
    
    // 娣诲姞娴佸埌鎵€鏈?PeerConnection
    for (const [roomId, pc] of this.peerConnections.entries()) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      this.localStreams.set(roomId, stream);
    }
  }

  async unpublishStream(): Promise<void> {
    console.log('WebRTC unpublishStream');
    
    // 绉婚櫎鎵€鏈夋祦
    for (const [roomId, pc] of this.peerConnections.entries()) {
      const stream = this.localStreams.get(roomId);
      if (stream) {
        stream.getTracks().forEach(track => {
          const sender = pc.getSenders().find(s => s.track === track);
          if (sender) {
            pc.removeTrack(sender);
          }
        });
        stream.getTracks().forEach(track => track.stop());
        this.localStreams.delete(roomId);
      }
    }
  }

  async subscribeStream(remoteUserId: string, options?: any): Promise<void> {
    console.log('WebRTC subscribeStream', { remoteUserId, options });
  }

  async unsubscribeStream(remoteUserId: string): Promise<void> {
    console.log('WebRTC unsubscribeStream', remoteUserId);
  }

  async getLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
    console.log('WebRTC getLocalStream', constraints);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  async stopLocalStream(): Promise<void> {
    console.log('WebRTC stopLocalStream');
    
    for (const [roomId, stream] of this.localStreams.entries()) {
      stream.getTracks().forEach(track => track.stop());
      this.localStreams.delete(roomId);
    }
  }

  async switchDevice(deviceType: DeviceType, deviceId: string): Promise<void> {
    console.log('WebRTC switchDevice', { deviceType, deviceId });
    
    // 鍒囨崲璁惧閫昏緫
    for (const [roomId, stream] of this.localStreams.entries()) {
      if (deviceType === 'camera') {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          
          const pc = this.peerConnections.get(roomId);
          if (pc) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          }
        }
      } else if (deviceType === 'microphone') {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const newStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: deviceId } },
            video: false
          });
          const newAudioTrack = newStream.getAudioTracks()[0];
          
          const pc = this.peerConnections.get(roomId);
          if (pc) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(newAudioTrack);
            }
          }
        }
      }
    }
  }

  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    console.log('WebRTC getDevices', deviceType);
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => {
          if (deviceType === 'camera') return device.kind === 'videoinput';
          if (deviceType === 'microphone') return device.kind === 'audioinput';
          if (deviceType === 'speaker') return device.kind === 'audiooutput';
          return false;
        })
        .map(device => ({
          id: device.deviceId,
          name: device.label || `Unknown ${deviceType}`
        }));
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }

  async setLocalStreamEnabled(audio: boolean, video: boolean): Promise<void> {
    console.log('WebRTC setLocalStreamEnabled', { audio, video });
    
    for (const [roomId, stream] of this.localStreams.entries()) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = audio;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = video;
      });
    }
  }

  async setRemoteStreamEnabled(remoteUserId: string, audio: boolean, video: boolean): Promise<void> {
    console.log('WebRTC setRemoteStreamEnabled', { remoteUserId, audio, video });
  }

  async sendSignal(signal: CallSignal): Promise<void> {
    console.log('WebRTC sendSignal', signal);
  }

  on(event: string, callback: Function): void {
    console.log('WebRTC on', event);
  }

  off(event: string, callback: Function): void {
    console.log('WebRTC off', event);
  }

  async destroy(): Promise<void> {
    console.log('WebRTC destroy');
    
    // 娓呯悊鎵€鏈夎祫婧?
    for (const roomId of this.peerConnections.keys()) {
      await this.leaveRoom(roomId);
    }
  }
}

// 瀵煎嚭榛樿鐨?RTC SDK 瀹炰緥鍒涘缓鍑芥暟
export function createRTCSDK(config: RTCConfig): RTCSDK {
  return RTCSDKFactory.create(config.provider, config);
}

// 瀵煎嚭榛樿鐨?RTC SDK 閰嶇疆
export const DEFAULT_RTC_CONFIG: RTCConfig = {
  provider: RTCSDKFactory.getDefaultProvider(),
  appId: '',
  logLevel: 'info',
  enableStats: true,
  enableDualStream: false
};

