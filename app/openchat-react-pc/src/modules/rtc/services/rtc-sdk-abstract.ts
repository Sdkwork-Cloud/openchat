/**
 * RTC SDK 抽象层
 * 
 * 职责：
 * 1. 定义统一的 RTC SDK 接口标准
 * 2. 支持不同 RTC SDK 提供商的适配
 * 3. 提供默认的适配器选择逻辑
 * 
 * 参考标准：
 * - 字节跳动火山云 RTC SDK
 * - 腾讯云 RTC SDK
 * - WebRTC 标准 API
 */

import type { CallSession, CallType, CallSignal } from '../entities/rtc.entity';

// 媒体流约束类型
export interface MediaTrackConstraints {
  deviceId?: string | { exact: string };
  width?: number | { min: number; max: number; ideal: number };
  height?: number | { min: number; max: number; ideal: number };
  frameRate?: number | { min: number; max: number; ideal: number };
}

// RTC SDK 提供商类型
export type RTCProviderType = 'volcengine' | 'tencentcloud' | 'webrtc';

// 设备类型
export type DeviceType = 'camera' | 'microphone' | 'speaker';

// 设备信息
export interface DeviceInfo {
  id: string;
  name: string;
}

// 媒体流约束
export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}

// RTC 配置选项
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

// RTC SDK 抽象接口
export interface RTCSDK {
  /**
   * 初始化 SDK
   */
  init(config: RTCConfig): Promise<void>;

  /**
   * 创建并加入房间
   */
  joinRoom(roomId: string, userId: string, token: string, callType: CallType): Promise<string>;

  /**
   * 离开房间
   */
  leaveRoom(roomId: string): Promise<void>;

  /**
   * 发布本地流
   */
  publishStream(stream: MediaStream, options?: any): Promise<void>;

  /**
   * 取消发布本地流
   */
  unpublishStream(): Promise<void>;

  /**
   * 订阅远程流
   */
  subscribeStream(remoteUserId: string, options?: any): Promise<void>;

  /**
   * 取消订阅远程流
   */
  unsubscribeStream(remoteUserId: string): Promise<void>;

  /**
   * 获取本地媒体流
   */
  getLocalStream(constraints: MediaConstraints): Promise<MediaStream>;

  /**
   * 停止本地媒体流
   */
  stopLocalStream(): Promise<void>;

  /**
   * 切换设备
   */
  switchDevice(deviceType: DeviceType, deviceId: string): Promise<void>;

  /**
   * 获取设备列表
   */
  getDevices(deviceType: DeviceType): Promise<DeviceInfo[]>;

  /**
   * 控制本地流
   */
  setLocalStreamEnabled(audio: boolean, video: boolean): Promise<void>;

  /**
   * 控制远程流
   */
  setRemoteStreamEnabled(remoteUserId: string, audio: boolean, video: boolean): Promise<void>;

  /**
   * 发送信令
   */
  sendSignal(signal: CallSignal): Promise<void>;

  /**
   * 注册事件监听
   */
  on(event: string, callback: Function): void;

  /**
   * 移除事件监听
   */
  off(event: string, callback: Function): void;

  /**
   * 销毁 SDK 实例
   */
  destroy(): Promise<void>;
}

// RTC SDK 工厂类
export class RTCSDKFactory {
  /**
   * 创建 RTC SDK 实例
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
   * 根据设备类型选择默认的 RTC SDK 提供商
   */
  static getDefaultProvider(): RTCProviderType {
    // 检测是否在移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 移动设备默认使用火山云 RTC
    if (isMobile) {
      return 'volcengine';
    }
    
    // 桌面设备默认使用 WebRTC
    return 'webrtc';
  }
}

// 火山云 RTC SDK 适配器
class VolcEngineRTCSDKAdapter implements RTCSDK {
  private config: RTCConfig;
  private instance: any = null;

  constructor(config: RTCConfig) {
    this.config = config;
  }

  async init(config: RTCConfig): Promise<void> {
    // 初始化火山云 RTC SDK
    // 这里需要引入火山云 RTC SDK
    // import VolcEngineRTC from '@volcengine/rtc-sdk';
    console.log('Initializing VolcEngine RTC SDK', config);
  }

  async joinRoom(roomId: string, userId: string, token: string, callType: CallType): Promise<string> {
    console.log('VolcEngine joinRoom', { roomId, userId, callType });
    return roomId;
  }

  async leaveRoom(roomId: string): Promise<void> {
    console.log('VolcEngine leaveRoom', roomId);
  }

  async publishStream(stream: MediaStream, options?: any): Promise<void> {
    console.log('VolcEngine publishStream', options);
  }

  async unpublishStream(): Promise<void> {
    console.log('VolcEngine unpublishStream');
  }

  async subscribeStream(remoteUserId: string, options?: any): Promise<void> {
    console.log('VolcEngine subscribeStream', { remoteUserId, options });
  }

  async unsubscribeStream(remoteUserId: string): Promise<void> {
    console.log('VolcEngine unsubscribeStream', remoteUserId);
  }

  async getLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
    console.log('VolcEngine getLocalStream', constraints);
    // 模拟返回媒体流
    return new MediaStream();
  }

  async stopLocalStream(): Promise<void> {
    console.log('VolcEngine stopLocalStream');
  }

  async switchDevice(deviceType: DeviceType, deviceId: string): Promise<void> {
    console.log('VolcEngine switchDevice', { deviceType, deviceId });
  }

  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    console.log('VolcEngine getDevices', deviceType);
    return [];
  }

  async setLocalStreamEnabled(audio: boolean, video: boolean): Promise<void> {
    console.log('VolcEngine setLocalStreamEnabled', { audio, video });
  }

  async setRemoteStreamEnabled(remoteUserId: string, audio: boolean, video: boolean): Promise<void> {
    console.log('VolcEngine setRemoteStreamEnabled', { remoteUserId, audio, video });
  }

  async sendSignal(signal: CallSignal): Promise<void> {
    console.log('VolcEngine sendSignal', signal);
  }

  on(event: string, callback: Function): void {
    console.log('VolcEngine on', event);
  }

  off(event: string, callback: Function): void {
    console.log('VolcEngine off', event);
  }

  async destroy(): Promise<void> {
    console.log('VolcEngine destroy');
  }
}

// 腾讯云 RTC SDK 适配器
class TencentCloudRTCSDKAdapter implements RTCSDK {
  private config: RTCConfig;
  private instance: any = null;

  constructor(config: RTCConfig) {
    this.config = config;
  }

  async init(config: RTCConfig): Promise<void> {
    // 初始化腾讯云 RTC SDK
    // 这里需要引入腾讯云 RTC SDK
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
    // 模拟返回媒体流
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

// WebRTC 适配器
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
    
    // 创建 PeerConnection
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
    
    // 添加流到所有 PeerConnection
    for (const [roomId, pc] of this.peerConnections.entries()) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      this.localStreams.set(roomId, stream);
    }
  }

  async unpublishStream(): Promise<void> {
    console.log('WebRTC unpublishStream');
    
    // 移除所有流
    for (const [roomId, pc] of this.peerConnections.entries()) {
      const stream = this.localStreams.get(roomId);
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.removeTrack(pc.getSenders().find(sender => sender.track === track));
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
    
    // 切换设备逻辑
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
    
    // 清理所有资源
    for (const roomId of this.peerConnections.keys()) {
      await this.leaveRoom(roomId);
    }
  }
}

// 导出默认的 RTC SDK 实例创建函数
export function createRTCSDK(config: RTCConfig): RTCSDK {
  return RTCSDKFactory.create(config.provider, config);
}

// 导出默认的 RTC SDK 配置
export const DEFAULT_RTC_CONFIG: RTCConfig = {
  provider: RTCSDKFactory.getDefaultProvider(),
  appId: '',
  logLevel: 'info',
  enableStats: true,
  enableDualStream: false
};
