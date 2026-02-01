/**
 * 火山引擎RTC Provider实现
 * 基于火山引擎实时音视频Web SDK的标准封装
 * 
 * 火山引擎RTC核心API：
 * - createRTCVideo(appId) - 创建引擎实例
 * - createRTCRoom(roomId) - 创建房间实例
 * - joinRoom(token, userId, roomConfig) - 加入房间
 * - publishStream(stream) - 发布本地流
 * - subscribeStream(userId) - 订阅远程流
 * 
 * 文档参考：https://www.volcengine.com/docs/6348/106914
 */

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
  RTCStreamState,
  RTCEvent,
  RTCError,
  RTCErrorCode,
  RTCStatistics,
  RTCNetworkQuality,
} from '../types';

// 火山引擎RTC SDK类型声明（实际使用时需要安装 @volcengine/rtc')
declare const RTCVideo: any;
declare const RTCRoom: any;
declare const StreamIndex: any;

/**
 * 火山引擎RTC Provider
 * 
 * 设计原则：
 * 1. 完全封装火山引擎SDK细节，对外提供标准接口
 * 2. 统一事件转换，将火山引擎事件映射为SDK标准事件
 * 3. 状态管理，维护房间状态和流状态
 * 4. 错误处理，统一错误码转换
 */
export class VolcengineRTCProvider extends EventEmitter implements IRTCProvider {
  readonly providerType = RTCProviderType.VOLCENGINE;
  
  // 火山引擎SDK实例
  private engine: any = null;
  private room: any = null;
  
  // 配置
  private config: RTCConfig | null = null;
  
  // 状态管理
  private _roomState: RTCRoomState = RTCRoomState.IDLE;
  private localStreams: Map<string, RTCLocalStream> = new Map();
  private remoteStreams: Map<string, RTCRemoteStream> = new Map();
  private streamStates: Map<string, RTCStreamState> = new Map();
  
  // 设备状态
  private videoEnabled: boolean = true;
  private audioEnabled: boolean = true;

  get roomState(): RTCRoomState {
    return this._roomState;
  }

  /**
   * 初始化火山引擎RTC引擎
   */
  async initialize(config: RTCConfig): Promise<void> {
    try {
      this.config = config;
      
      // 检查火山引擎SDK是否加载
      if (typeof RTCVideo === 'undefined') {
        throw new RTCError(
          RTCErrorCode.NOT_SUPPORTED,
          '火山引擎RTC SDK未加载，请先引入SDK脚本'
        );
      }

      // 创建引擎实例
      this.engine = RTCVideo.createEngine(config.appId);
      
      if (!this.engine) {
        throw new RTCError(
          RTCErrorCode.UNKNOWN_ERROR,
          '创建火山引擎RTC引擎失败'
        );
      }

      // 绑定引擎事件
      this.bindEngineEvents();
      
      // 设置视频配置
      if (config.videoConfig) {
        this.setupVideoConfig(config.videoConfig);
      }
      
      // 设置音频配置
      if (config.audioConfig) {
        this.setupAudioConfig(config.audioConfig);
      }

    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 销毁引擎
   */
  async destroy(): Promise<void> {
    try {
      // 离开房间
      if (this.room) {
        await this.leaveRoom();
      }

      // 清理本地流
      for (const streamId of this.localStreams.keys()) {
        await this.destroyLocalStream(streamId);
      }
      this.localStreams.clear();
      this.remoteStreams.clear();
      this.streamStates.clear();

      // 销毁引擎
      if (this.engine) {
        this.engine.destroy();
        this.engine = null;
      }

      this.config = null;
      this._roomState = RTCRoomState.IDLE;
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 加入房间
   */
  async joinRoom(options?: RTCRoomOptions): Promise<void> {
    try {
      if (!this.engine) {
        throw new RTCError(
          RTCErrorCode.ROOM_JOIN_FAILED,
          'RTC引擎未初始化'
        );
      }

      if (this.room) {
        throw new RTCError(
          RTCErrorCode.ROOM_ALREADY_JOINED,
          '已经加入房间，请先离开当前房间'
        );
      }

      this._roomState = RTCRoomState.CONNECTING;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);

      // 创建房间实例
      this.room = this.engine.createRoom(this.config!.roomId);
      
      if (!this.room) {
        throw new RTCError(
          RTCErrorCode.ROOM_JOIN_FAILED,
          '创建房间实例失败'
        );
      }

      // 绑定房间事件
      this.bindRoomEvents();

      // 加入房间配置
      const roomConfig = {
        token: options?.token || this.config!.token,
        userId: this.config!.uid,
        userName: options?.userName || this.config!.uid,
        role: options?.role === 'host' ? 0 : 1, // 0:主播, 1:观众
        autoPublish: options?.autoPublish ?? this.config!.autoPublish ?? true,
        autoSubscribe: options?.autoSubscribe ?? this.config!.autoSubscribe ?? true,
      };

      // 加入房间
      await this.room.join(roomConfig);
      
      this._roomState = RTCRoomState.CONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      
    } catch (error) {
      this._roomState = RTCRoomState.ERROR;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      throw this.wrapError(error);
    }
  }

  /**
   * 离开房间
   */
  async leaveRoom(): Promise<void> {
    try {
      if (!this.room) {
        return;
      }

      this._roomState = RTCRoomState.DISCONNECTED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);

      // 停止所有流
      for (const streamId of this.localStreams.keys()) {
        await this.unpublishStream(streamId);
      }

      // 离开房间
      await this.room.leave();
      
      // 销毁房间实例
      this.room = null;
      
      this._roomState = RTCRoomState.IDLE;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 创建本地流
   */
  async createLocalStream(options?: RTCStreamOptions): Promise<RTCLocalStream> {
    try {
      if (!this.engine) {
        throw new RTCError(
          RTCErrorCode.STREAM_PUBLISH_FAILED,
          'RTC引擎未初始化'
        );
      }

      const streamId = `local-${Date.now()}`;
      
      // 获取媒体流
      const constraints: MediaStreamConstraints = {
        video: options?.video !== false ? {
          width: typeof options?.video === 'object' ? options.video.width : 1280,
          height: typeof options?.video === 'object' ? options.video.height : 720,
          frameRate: typeof options?.video === 'object' ? options.video.frameRate : 30,
        } : false,
        audio: options?.audio !== false ? {
          sampleRate: typeof options?.audio === 'object' ? options.audio.sampleRate : 48000,
          echoCancellation: typeof options?.audio === 'object' ? options.audio.echoCancellation : true,
          noiseSuppression: typeof options?.audio === 'object' ? options.audio.noiseSuppression : true,
        } : false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const localStream: RTCLocalStream = {
        streamId,
        userId: this.config!.uid,
        isLocal: true,
        hasVideo: !!constraints.video,
        hasAudio: !!constraints.audio,
        videoTrack: mediaStream.getVideoTracks()[0],
        audioTrack: mediaStream.getAudioTracks()[0],
        mediaStream,
      };

      this.localStreams.set(streamId, localStream);
      this.streamStates.set(streamId, RTCStreamState.IDLE);
      
      return localStream;
      
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new RTCError(
            RTCErrorCode.PERMISSION_DENIED,
            '用户拒绝了摄像头/麦克风权限'
          );
        } else if (error.name === 'NotFoundError') {
          throw new RTCError(
            RTCErrorCode.DEVICE_NOT_FOUND,
            '未找到摄像头/麦克风设备'
          );
        }
      }
      throw this.wrapError(error);
    }
  }

  /**
   * 销毁本地流
   */
  async destroyLocalStream(streamId: string): Promise<void> {
    const stream = this.localStreams.get(streamId);
    if (!stream) return;

    // 停止所有轨道
    if (stream.mediaStream) {
      stream.mediaStream.getTracks().forEach(track => track.stop());
    }

    this.localStreams.delete(streamId);
    this.streamStates.delete(streamId);
  }

  /**
   * 发布本地流
   */
  async publishStream(stream: RTCLocalStream): Promise<void> {
    try {
      if (!this.room) {
        throw new RTCError(
          RTCErrorCode.STREAM_PUBLISH_FAILED,
          '未加入房间，无法发布流'
        );
      }

      this.streamStates.set(stream.streamId, RTCStreamState.PUBLISHING);

      // 创建火山引擎流
      const volcStream = this.engine.createStream(stream.mediaStream);
      
      // 发布流
      await this.room.publishStream(volcStream);
      
      this.streamStates.set(stream.streamId, RTCStreamState.PUBLISHED);
      this.emit(RTCEvent.LOCAL_STREAM_PUBLISHED, { streamId: stream.streamId });
      
    } catch (error) {
      this.streamStates.set(stream.streamId, RTCStreamState.ERROR);
      throw this.wrapError(error);
    }
  }

  /**
   * 取消发布本地流
   */
  async unpublishStream(streamId: string): Promise<void> {
    try {
      if (!this.room) return;

      const stream = this.localStreams.get(streamId);
      if (!stream) return;

      // 取消发布
      await this.room.unpublishStream(streamId);
      
      this.streamStates.delete(streamId);
      this.emit(RTCEvent.LOCAL_STREAM_UNPUBLISHED, { streamId });
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 订阅远程流
   */
  async subscribeStream(userId: string, options?: RTCSubscribeOptions): Promise<RTCRemoteStream> {
    try {
      if (!this.room) {
        throw new RTCError(
          RTCErrorCode.STREAM_SUBSCRIBE_FAILED,
          '未加入房间，无法订阅流'
        );
      }

      // 订阅远程流
      await this.room.subscribeStream(userId, {
        video: options?.video ?? true,
        audio: options?.audio ?? true,
      });

      // 创建远程流对象（实际流数据通过事件回调获取）
      const remoteStream: RTCRemoteStream = {
        streamId: `remote-${userId}`,
        userId,
        isLocal: false,
        hasVideo: options?.video ?? true,
        hasAudio: options?.audio ?? true,
      };

      this.remoteStreams.set(userId, remoteStream);
      this.emit(RTCEvent.REMOTE_STREAM_SUBSCRIBED, { userId, stream: remoteStream });
      
      return remoteStream;
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 取消订阅远程流
   */
  async unsubscribeStream(userId: string): Promise<void> {
    try {
      if (!this.room) return;

      await this.room.unsubscribeStream(userId);
      
      this.remoteStreams.delete(userId);
      this.emit(RTCEvent.REMOTE_STREAM_UNSUBSCRIBED, { userId });
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 切换摄像头
   */
  async switchCamera(deviceId?: string): Promise<void> {
    try {
      if (!this.engine) {
        throw new RTCError(
          RTCErrorCode.DEVICE_NOT_FOUND,
          'RTC引擎未初始化'
        );
      }

      // 切换摄像头设备
      await this.engine.switchCamera(deviceId);
      
      this.emit(RTCEvent.CAMERA_CHANGED, { deviceId });
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 切换麦克风
   */
  async switchMicrophone(deviceId?: string): Promise<void> {
    try {
      if (!this.engine) {
        throw new RTCError(
          RTCErrorCode.DEVICE_NOT_FOUND,
          'RTC引擎未初始化'
        );
      }

      // 切换麦克风设备
      await this.engine.switchMicrophone(deviceId);
      
      this.emit(RTCEvent.MICROPHONE_CHANGED, { deviceId });
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 开启/关闭视频
   */
  async enableVideo(enabled: boolean): Promise<void> {
    try {
      this.videoEnabled = enabled;
      
      if (this.engine) {
        if (enabled) {
          await this.engine.enableVideo();
        } else {
          await this.engine.disableVideo();
        }
      }

      // 更新所有本地流
      for (const stream of this.localStreams.values()) {
        if (stream.videoTrack) {
          stream.videoTrack.enabled = enabled;
        }
      }
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 开启/关闭音频
   */
  async enableAudio(enabled: boolean): Promise<void> {
    try {
      this.audioEnabled = enabled;
      
      if (this.engine) {
        if (enabled) {
          await this.engine.enableAudio();
        } else {
          await this.engine.disableAudio();
        }
      }

      // 更新所有本地流
      for (const stream of this.localStreams.values()) {
        if (stream.audioTrack) {
          stream.audioTrack.enabled = enabled;
        }
      }
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<RTCStatistics> {
    try {
      if (!this.engine) {
        return {
          timestamp: Date.now(),
          localStreams: [],
          remoteStreams: [],
        };
      }

      const stats = await this.engine.getStats();
      
      // 转换统计信息格式
      return {
        timestamp: Date.now(),
        localStreams: this.convertLocalStats(stats),
        remoteStreams: this.convertRemoteStats(stats),
      };
      
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 绑定引擎事件
   */
  private bindEngineEvents(): void {
    if (!this.engine) return;

    // 错误事件
    this.engine.on('error', (error: any) => {
      this.emit(RTCEvent.ROOM_ERROR, this.wrapError(error));
    });

    // 设备变化事件
    this.engine.on('deviceChanged', (data: any) => {
      this.emit(RTCEvent.DEVICE_CHANGED, data);
    });
  }

  /**
   * 绑定房间事件
   */
  private bindRoomEvents(): void {
    if (!this.room) return;

    // 用户加入
    this.room.on('userJoined', (userId: string, userInfo: any) => {
      this.emit(RTCEvent.USER_JOINED, { userId, userInfo });
    });

    // 用户离开
    this.room.on('userLeft', (userId: string, reason: any) => {
      this.remoteStreams.delete(userId);
      this.emit(RTCEvent.USER_LEFT, { userId, reason });
    });

    // 远程流添加
    this.room.on('streamAdded', (userId: string, stream: any) => {
      const remoteStream: RTCRemoteStream = {
        streamId: `remote-${userId}`,
        userId,
        isLocal: false,
        hasVideo: stream.hasVideo,
        hasAudio: stream.hasAudio,
      };
      this.remoteStreams.set(userId, remoteStream);
      this.emit(RTCEvent.REMOTE_STREAM_ADDED, { userId, stream: remoteStream });
    });

    // 远程流移除
    this.room.on('streamRemoved', (userId: string) => {
      this.remoteStreams.delete(userId);
      this.emit(RTCEvent.REMOTE_STREAM_REMOVED, { userId });
    });

    // 网络质量
    this.room.on('networkQuality', (quality: any) => {
      this.emit(RTCEvent.NETWORK_QUALITY, quality);
    });

    // 房间状态变化
    this.room.on('roomStateChanged', (state: any) => {
      this._roomState = this.convertRoomState(state);
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
    });
  }

  /**
   * 设置视频配置
   */
  private setupVideoConfig(config: any): void {
    if (!this.engine) return;
    
    this.engine.setVideoEncoderConfig({
      width: config.width || 1280,
      height: config.height || 720,
      frameRate: config.frameRate || 30,
      maxBitrate: config.bitrate || 2000,
    });
  }

  /**
   * 设置音频配置
   */
  private setupAudioConfig(config: any): void {
    if (!this.engine) return;
    
    this.engine.setAudioProfile({
      sampleRate: config.sampleRate || 48000,
      channel: 1,
    });
  }

  /**
   * 转换房间状态
   */
  private convertRoomState(state: any): RTCRoomState {
    const stateMap: Record<string, RTCRoomState> = {
      'idle': RTCRoomState.IDLE,
      'connecting': RTCRoomState.CONNECTING,
      'connected': RTCRoomState.CONNECTED,
      'reconnecting': RTCRoomState.RECONNECTING,
      'disconnected': RTCRoomState.DISCONNECTED,
      'error': RTCRoomState.ERROR,
    };
    return stateMap[state] || RTCRoomState.IDLE;
  }

  /**
   * 转换本地流统计
   */
  private convertLocalStats(stats: any): any[] {
    // 实际实现需要根据火山引擎SDK的统计格式转换
    return [];
  }

  /**
   * 转换远程流统计
   */
  private convertRemoteStats(stats: any): any[] {
    // 实际实现需要根据火山引擎SDK的统计格式转换
    return [];
  }

  /**
   * 包装错误
   */
  private wrapError(error: any): RTCError {
    if (error instanceof RTCError) {
      return error;
    }
    
    return new RTCError(
      RTCErrorCode.UNKNOWN_ERROR,
      error?.message || '未知错误',
      error
    );
  }
}

export default VolcengineRTCProvider;
