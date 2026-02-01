/**
 * RTC管理器 - 实时音视频通话管理
 * 
 * 设计原则：
 * 1. 完全封装Provider细节，对外提供统一的RTC接口
 * 2. 支持多Provider扩展（火山引擎、Agora、TRTC等）
 * 3. 完整的生命周期管理：初始化 -> 加入房间 -> 发布/订阅 -> 离开房间 -> 销毁
 * 4. 信令通过IM服务传输，实现信令与媒体分离
 * 5. 状态机管理，确保状态转换的正确性
 * 
 * 使用示例：
 * ```typescript
 * // 初始化RTC
 * await client.rtc.init({
 *   provider: RTCProviderType.VOLCENGINE,
 *   providerConfig: { appId: 'your-app-id' }
 * });
 * 
 * // 开始通话
 * await client.rtc.startCall('room-123');
 * 
 * // 创建并发布本地流
 * const stream = await client.rtc.createLocalStream({ video: true, audio: true });
 * await client.rtc.publishStream(stream.streamId);
 * 
 * // 订阅远程流
 * await client.rtc.subscribeStream('remote-user-id');
 * 
 * // 结束通话
 * await client.rtc.endCall();
 * ```
 */

import { EventEmitter } from 'eventemitter3';
import {
  IRTCProvider,
  RTCConfig,
  RTCProviderType,
  RTCRoomState,
  RTCStreamState,
  RTCLocalStream,
  RTCRemoteStream,
  RTCEvent,
  RTCError,
  RTCErrorCode,
  RTCManagerConfig,
  RTCProviderConfig,
  RTCRoomOptions,
  RTCStreamOptions,
  RTCSubscribeOptions,
  RTCStatistics,
  RTCSignalMessage,
  RTCSignalType,
} from './types';

import { VolcengineRTCProvider } from './providers/volcengine-provider';
import { RTCSignaling } from './signaling';
import { IIMService } from '../services/im-service';

/**
 * RTC管理器状态
 */
enum RTCManagerState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  JOINING = 'joining',
  JOINED = 'joined',
  LEAVING = 'leaving',
  DESTROYING = 'destroying',
  ERROR = 'error',
}

/**
 * RTC管理器
 * 
 * 职责：
 * 1. Provider工厂，根据配置创建对应的Provider实例
 * 2. 生命周期管理，维护RTC通话的完整生命周期
 * 3. 信令协调，通过IM服务发送/接收RTC信令
 * 4. 状态管理，维护房间状态、流状态
 * 5. 事件转发，将Provider事件转发给上层
 */
export class RTCManager extends EventEmitter {
  // Provider实例
  private provider: IRTCProvider | null = null;
  
  // 信令模块
  private signaling: RTCSignaling | null = null;
  
  // 配置
  private config: RTCManagerConfig | null = null;
  private providerConfig: RTCProviderConfig | null = null;
  
  // 状态
  private _state: RTCManagerState = RTCManagerState.IDLE;
  private _roomState: RTCRoomState = RTCRoomState.IDLE;
  private _inCall: boolean = false;
  private _roomId: string | null = null;
  
  // 流管理
  private localStreams: Map<string, RTCLocalStream> = new Map();
  private remoteStreams: Map<string, RTCRemoteStream> = new Map();
  
  // IM服务（用于信令）
  private imService: IIMService;
  private uid: string;

  constructor(options: { imService: IIMService; uid: string }) {
    super();
    this.imService = options.imService;
    this.uid = options.uid;
  }

  // ==================== 状态查询 ====================

  get state(): RTCManagerState {
    return this._state;
  }

  get roomState(): RTCRoomState {
    return this._roomState;
  }

  get inCall(): boolean {
    return this._inCall;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  get providerType(): RTCProviderType | null {
    return this.provider?.providerType || null;
  }

  // ==================== 生命周期管理 ====================

  /**
   * 初始化RTC管理器
   * 
   * @param config RTC管理器配置
   * 
   * 流程：
   * 1. 根据provider类型创建对应的Provider实例
   * 2. 初始化信令模块
   * 3. 初始化Provider
   * 4. 绑定Provider事件
   */
  async initialize(config: RTCManagerConfig): Promise<void> {
    if (this._state !== RTCManagerState.IDLE) {
      throw new RTCError(
        RTCErrorCode.INVALID_PARAM,
        `RTC管理器状态错误，当前状态: ${this._state}`
      );
    }

    try {
      this._state = RTCManagerState.INITIALIZING;
      this.config = config;
      this.providerConfig = config.providerConfig;

      // 1. 创建Provider实例
      this.provider = this.createProvider(config.provider);
      
      if (!this.provider) {
        throw new RTCError(
          RTCErrorCode.NOT_SUPPORTED,
          `不支持的Provider类型: ${config.provider}`
        );
      }

      // 2. 初始化信令模块
      this.signaling = new RTCSignaling({
        imService: this.imService,
        uid: this.uid,
        onSignal: this.handleSignal.bind(this),
      });

      // 3. 绑定Provider事件
      this.bindProviderEvents();

      // 4. 初始化Provider
      const rtcConfig: RTCConfig = {
        provider: config.provider,
        appId: config.providerConfig.appId,
        appKey: config.providerConfig.appKey,
        uid: this.uid,
        roomId: '', // 加入房间时设置
        token: config.providerConfig.token,
      };

      await this.provider.initialize(rtcConfig);

      this._state = RTCManagerState.INITIALIZED;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, RTCRoomState.IDLE);
      
    } catch (error) {
      this._state = RTCManagerState.ERROR;
      throw this.wrapError(error);
    }
  }

  /**
   * 销毁RTC管理器
   * 
   * 流程：
   * 1. 结束当前通话
   * 2. 销毁信令模块
   * 3. 销毁Provider
   * 4. 清理状态
   */
  async destroy(): Promise<void> {
    if (this._state === RTCManagerState.IDLE || this._state === RTCManagerState.DESTROYING) {
      return;
    }

    try {
      this._state = RTCManagerState.DESTROYING;

      // 1. 结束通话
      if (this._inCall) {
        await this.endCall();
      }

      // 2. 销毁信令模块
      if (this.signaling) {
        await this.signaling.destroy();
        this.signaling = null;
      }

      // 3. 销毁Provider
      if (this.provider) {
        await this.provider.destroy();
        this.provider = null;
      }

      // 4. 清理状态
      this.localStreams.clear();
      this.remoteStreams.clear();
      this._state = RTCManagerState.IDLE;
      this._roomState = RTCRoomState.IDLE;
      this._inCall = false;
      this._roomId = null;
      this.config = null;
      this.providerConfig = null;
      
    } catch (error) {
      this._state = RTCManagerState.ERROR;
      throw this.wrapError(error);
    }
  }

  // ==================== 通话控制 ====================

  /**
   * 开始通话（加入房间）
   * 
   * @param roomId 房间ID
   * @param options 房间选项
   * 
   * 流程：
   * 1. 检查状态
   * 2. 发送加入房间信令
   * 3. 调用Provider加入房间
   * 4. 更新状态
   */
  async startCall(roomId: string, options?: RTCRoomOptions): Promise<void> {
    if (this._state !== RTCManagerState.INITIALIZED) {
      throw new RTCError(
        RTCErrorCode.INVALID_PARAM,
        `RTC管理器未初始化，当前状态: ${this._state}`
      );
    }

    if (this._inCall) {
      throw new RTCError(
        RTCErrorCode.ROOM_ALREADY_JOINED,
        '已经在通话中，请先结束当前通话'
      );
    }

    try {
      this._state = RTCManagerState.JOINING;
      this._roomId = roomId;

      // 1. 发送加入房间信令（通知其他用户）
      if (this.signaling) {
        await this.signaling.sendJoinSignal(roomId);
      }

      // 2. 调用Provider加入房间
      if (this.provider) {
        await this.provider.joinRoom(options);
      }

      this._state = RTCManagerState.JOINED;
      this._inCall = true;
      this._roomState = RTCRoomState.CONNECTED;
      
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      
    } catch (error) {
      this._state = RTCManagerState.ERROR;
      this._roomId = null;
      throw this.wrapError(error);
    }
  }

  /**
   * 结束通话（离开房间）
   * 
   * 流程：
   * 1. 发送离开房间信令
   * 2. 取消发布所有本地流
   * 3. 取消订阅所有远程流
   * 4. 调用Provider离开房间
   * 5. 更新状态
   */
  async endCall(): Promise<void> {
    if (!this._inCall || !this.provider) {
      return;
    }

    try {
      this._state = RTCManagerState.LEAVING;

      // 1. 发送离开房间信令
      if (this.signaling && this._roomId) {
        await this.signaling.sendLeaveSignal(this._roomId);
      }

      // 2. 取消发布所有本地流
      for (const streamId of this.localStreams.keys()) {
        await this.unpublishStream(streamId);
      }

      // 3. 取消订阅所有远程流
      for (const userId of this.remoteStreams.keys()) {
        await this.unsubscribeStream(userId);
      }

      // 4. 调用Provider离开房间
      await this.provider.leaveRoom();

      this._state = RTCManagerState.INITIALIZED;
      this._inCall = false;
      this._roomState = RTCRoomState.IDLE;
      this._roomId = null;
      
      this.localStreams.clear();
      this.remoteStreams.clear();
      
      this.emit(RTCEvent.ROOM_STATE_CHANGED, this._roomState);
      
    } catch (error) {
      this._state = RTCManagerState.ERROR;
      throw this.wrapError(error);
    }
  }

  // ==================== 流管理 ====================

  /**
   * 创建本地流
   */
  async createLocalStream(options?: RTCStreamOptions): Promise<RTCLocalStream> {
    if (!this.provider) {
      throw new RTCError(
        RTCErrorCode.STREAM_PUBLISH_FAILED,
        'RTC Provider未初始化'
      );
    }

    try {
      const stream = await this.provider.createLocalStream(options);
      this.localStreams.set(stream.streamId, stream);
      return stream;
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 销毁本地流
   */
  async destroyLocalStream(streamId: string): Promise<void> {
    const stream = this.localStreams.get(streamId);
    if (!stream) return;

    // 如果已发布，先取消发布
    if (this.provider) {
      try {
        await this.provider.unpublishStream(streamId);
      } catch (error) {
        // 忽略取消发布错误
      }
    }

    // 停止所有轨道
    if (stream.mediaStream) {
      stream.mediaStream.getTracks().forEach(track => track.stop());
    }

    this.localStreams.delete(streamId);
  }

  /**
   * 发布本地流
   */
  async publishStream(streamId: string): Promise<void> {
    if (!this.provider) {
      throw new RTCError(
        RTCErrorCode.STREAM_PUBLISH_FAILED,
        'RTC Provider未初始化'
      );
    }

    if (!this._inCall) {
      throw new RTCError(
        RTCErrorCode.STREAM_PUBLISH_FAILED,
        '未加入房间，无法发布流'
      );
    }

    const stream = this.localStreams.get(streamId);
    if (!stream) {
      throw new RTCError(
        RTCErrorCode.STREAM_PUBLISH_FAILED,
        `本地流不存在: ${streamId}`
      );
    }

    try {
      // 发送发布信令
      if (this.signaling && this._roomId) {
        await this.signaling.sendPublishSignal(this._roomId, streamId);
      }

      await this.provider.publishStream(stream);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 取消发布本地流
   */
  async unpublishStream(streamId: string): Promise<void> {
    if (!this.provider) return;

    try {
      // 发送取消发布信令
      if (this.signaling && this._roomId) {
        await this.signaling.sendUnpublishSignal(this._roomId, streamId);
      }

      await this.provider.unpublishStream(streamId);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 订阅远程流
   */
  async subscribeStream(userId: string, options?: RTCSubscribeOptions): Promise<RTCRemoteStream> {
    if (!this.provider) {
      throw new RTCError(
        RTCErrorCode.STREAM_SUBSCRIBE_FAILED,
        'RTC Provider未初始化'
      );
    }

    if (!this._inCall) {
      throw new RTCError(
        RTCErrorCode.STREAM_SUBSCRIBE_FAILED,
        '未加入房间，无法订阅流'
      );
    }

    try {
      // 发送订阅信令
      if (this.signaling && this._roomId) {
        await this.signaling.sendSubscribeSignal(this._roomId, userId);
      }

      const stream = await this.provider.subscribeStream(userId, options);
      this.remoteStreams.set(userId, stream);
      return stream;
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 取消订阅远程流
   */
  async unsubscribeStream(userId: string): Promise<void> {
    if (!this.provider) return;

    try {
      // 发送取消订阅信令
      if (this.signaling && this._roomId) {
        await this.signaling.sendUnsubscribeSignal(this._roomId, userId);
      }

      await this.provider.unsubscribeStream(userId);
      this.remoteStreams.delete(userId);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  // ==================== 设备控制 ====================

  /**
   * 开启/关闭视频
   */
  async enableVideo(enabled: boolean): Promise<void> {
    if (!this.provider) {
      throw new RTCError(
        RTCErrorCode.INVALID_PARAM,
        'RTC Provider未初始化'
      );
    }

    try {
      await this.provider.enableVideo(enabled);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 开启/关闭音频
   */
  async enableAudio(enabled: boolean): Promise<void> {
    if (!this.provider) {
      throw new RTCError(
        RTCErrorCode.INVALID_PARAM,
        'RTC Provider未初始化'
      );
    }

    try {
      await this.provider.enableAudio(enabled);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 切换摄像头
   */
  async switchCamera(deviceId?: string): Promise<void> {
    if (!this.provider) {
      throw new RTCError(
        RTCErrorCode.DEVICE_NOT_FOUND,
        'RTC Provider未初始化'
      );
    }

    try {
      await this.provider.switchCamera(deviceId);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * 切换麦克风
   */
  async switchMicrophone(deviceId?: string): Promise<void> {
    if (!this.provider) {
      throw new RTCError(
        RTCErrorCode.DEVICE_NOT_FOUND,
        'RTC Provider未初始化'
      );
    }

    try {
      await this.provider.switchMicrophone(deviceId);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  // ==================== 统计信息 ====================

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<RTCStatistics> {
    if (!this.provider) {
      return {
        timestamp: Date.now(),
        localStreams: [],
        remoteStreams: [],
      };
    }

    try {
      return await this.provider.getStatistics();
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 创建Provider实例
   */
  private createProvider(type: RTCProviderType): IRTCProvider | null {
    switch (type) {
      case RTCProviderType.VOLCENGINE:
        return new VolcengineRTCProvider();
      // 未来可以扩展其他Provider
      // case RTCProviderType.AGORA:
      //   return new AgoraRTCProvider();
      // case RTCProviderType.TRTC:
      //   return new TrtcRTCProvider();
      default:
        return null;
    }
  }

  /**
   * 绑定Provider事件
   */
  private bindProviderEvents(): void {
    if (!this.provider) return;

    // 房间状态变化
    this.provider.on(RTCEvent.ROOM_STATE_CHANGED, (state: RTCRoomState) => {
      this._roomState = state;
      this.emit(RTCEvent.ROOM_STATE_CHANGED, state);
    });

    // 用户加入
    this.provider.on(RTCEvent.USER_JOINED, (data: any) => {
      this.emit(RTCEvent.USER_JOINED, data);
    });

    // 用户离开
    this.provider.on(RTCEvent.USER_LEFT, (data: any) => {
      this.remoteStreams.delete(data.userId);
      this.emit(RTCEvent.USER_LEFT, data);
    });

    // 本地流发布
    this.provider.on(RTCEvent.LOCAL_STREAM_PUBLISHED, (data: any) => {
      this.emit(RTCEvent.LOCAL_STREAM_PUBLISHED, data);
    });

    // 本地流取消发布
    this.provider.on(RTCEvent.LOCAL_STREAM_UNPUBLISHED, (data: any) => {
      this.emit(RTCEvent.LOCAL_STREAM_UNPUBLISHED, data);
    });

    // 远程流添加
    this.provider.on(RTCEvent.REMOTE_STREAM_ADDED, (data: any) => {
      this.remoteStreams.set(data.userId, data.stream);
      this.emit(RTCEvent.REMOTE_STREAM_ADDED, data);
    });

    // 远程流移除
    this.provider.on(RTCEvent.REMOTE_STREAM_REMOVED, (data: any) => {
      this.remoteStreams.delete(data.userId);
      this.emit(RTCEvent.REMOTE_STREAM_REMOVED, data);
    });

    // 网络质量
    this.provider.on(RTCEvent.NETWORK_QUALITY, (data: any) => {
      this.emit(RTCEvent.NETWORK_QUALITY, data);
    });

    // 错误
    this.provider.on(RTCEvent.ROOM_ERROR, (error: RTCError) => {
      this.emit(RTCEvent.ROOM_ERROR, error);
    });
  }

  /**
   * 处理信令消息
   */
  private handleSignal(message: RTCSignalMessage): void {
    // 根据信令类型处理
    switch (message.type) {
      case RTCSignalType.JOIN:
        // 其他用户加入房间
        this.emit(RTCEvent.USER_JOINED, { userId: message.userId });
        break;
      case RTCSignalType.LEAVE:
        // 其他用户离开房间
        this.remoteStreams.delete(message.userId);
        this.emit(RTCEvent.USER_LEFT, { userId: message.userId });
        break;
      case RTCSignalType.PUBLISH:
        // 其他用户发布流
        this.emit(RTCEvent.REMOTE_STREAM_ADDED, { userId: message.userId });
        break;
      case RTCSignalType.UNPUBLISH:
        // 其他用户取消发布流
        this.remoteStreams.delete(message.userId);
        this.emit(RTCEvent.REMOTE_STREAM_REMOVED, { userId: message.userId });
        break;
      case RTCSignalType.OFFER:
      case RTCSignalType.ANSWER:
      case RTCSignalType.ICE_CANDIDATE:
        // WebRTC信令，转发给Provider处理
        // 实际实现中需要将这些信令传递给Provider
        break;
    }
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

export default RTCManager;
