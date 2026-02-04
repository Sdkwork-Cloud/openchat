/**
 * RTC Service
 *
 * 职责：
 * 1. 封装 RTC 业务逻辑
 * 2. 管理通话生命周期
 * 3. 处理信令通信
 * 4. 协调 Repository 和 UI 状态
 */

import type {
  CallSession,
  CallType,
  CallSignal,
} from '../entities/rtc.entity';
import {
  createRoom,
  endRoom,
  getToken,
} from '../repositories/rtc.repository';
import { generateUUID } from '@/utils/uuid';
import {
  createRTCSDK,
  RTCConfig,
  DEFAULT_RTC_CONFIG,
  DeviceType,
  DeviceInfo,
} from './rtc-sdk-abstract';

// 当前用户 ID（应该从用户服务获取）
const CURRENT_USER_ID = 'current-user';

// 模拟信令服务器（用于测试）
const MOCK_SIGNALING = true;

// 版本标记用于强制刷新缓存 - 每次修改后更新此版本号
const RTC_SERVICE_VERSION = '1.0.9';



/**
 * RTC Service 类
 */
export class RTCService {
  private session: CallSession | null = null;
  private rtcSdk: any = null;
  private rtcConfig: RTCConfig = DEFAULT_RTC_CONFIG;
  private onSessionChange: ((session: CallSession | null) => void) | null = null;
  private onLocalStream: ((stream: MediaStream) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private signalHandler: ((signal: CallSignal) => void) | null = null;

  constructor(callbacks?: {
    onSessionChange?: (session: CallSession | null) => void;
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onSignal?: (signal: CallSignal) => void;
  }, config?: RTCConfig) {
    this.onSessionChange = callbacks?.onSessionChange || null;
    this.onLocalStream = callbacks?.onLocalStream || null;
    this.onRemoteStream = callbacks?.onRemoteStream || null;
    this.signalHandler = callbacks?.onSignal || null;
    this.rtcConfig = config || DEFAULT_RTC_CONFIG;
    this.initRTCSDK();
  }

  /**
   * 初始化 RTC SDK
   */
  private async initRTCSDK() {
    try {
      this.rtcSdk = createRTCSDK(this.rtcConfig);
      await this.rtcSdk.init(this.rtcConfig);
      
      // 注册事件监听
      this.rtcSdk.on('stream-added', (event: any) => {
        console.log('[RTC] Stream added:', event);
      });
      
      this.rtcSdk.on('stream-updated', (event: any) => {
        console.log('[RTC] Stream updated:', event);
      });
      
      this.rtcSdk.on('stream-removed', (event: any) => {
        console.log('[RTC] Stream removed:', event);
      });
      
      this.rtcSdk.on('room-state-changed', (event: any) => {
        console.log('[RTC] Room state changed:', event);
      });
    } catch (error) {
      console.error('[RTC] Failed to initialize RTC SDK:', error);
    }
  }

  /**
   * 发起通话
   */
  async initiateCall(
    calleeId: string,
    calleeName: string,
    calleeAvatar: string,
    callType: CallType
  ): Promise<boolean> {
    try {
      console.log('[RTC] Initiating call to:', calleeId, 'type:', callType);

      // 创建通话会话
      const session: CallSession = {
        id: this.generateCallId(),
        callType,
        status: 'calling',
        direction: 'outgoing',
        localUserId: CURRENT_USER_ID,
        remoteUserId: calleeId,
        remoteUserName: calleeName,
        remoteUserAvatar: calleeAvatar,
        startTime: new Date().toISOString(),
        isMuted: false,
        isCameraOff: false,
        isSpeakerOff: false,
      };

      this.session = session;
      this.notifySessionChange();

      // 创建房间
      console.log('[RTC] Creating room...');
      const { room, token } = await createRoom({
        type: 'p2p',
        participants: [CURRENT_USER_ID, calleeId],
      });
      console.log('[RTC] Room created:', room.id);

      this.session.roomId = room.id;
      this.session.status = 'ringing';
      this.notifySessionChange();

      // 初始化 RTC SDK 连接（错误不影响通话流程）
      try {
        await this.initRTCConnection(callType, room.id, token.token);
      } catch (rtcError) {
        // RTC 初始化失败（如无设备），但继续通话流程
        console.error('[RTC] Failed to initialize RTC connection:', rtcError);
      }

      // 发送呼叫信令（通过 IM 或其他方式）
      this.sendSignal({
        type: 'call',
        callId: session.id,
        from: CURRENT_USER_ID,
        to: calleeId,
        payload: {
          roomId: room.id,
          token: token.token,
          callType,
        },
        timestamp: new Date().toISOString(),
      });

      // 模拟：3秒后自动接听（测试用）
      if (MOCK_SIGNALING) {
        setTimeout(() => {
          console.log('[RTC] Mock: Auto accepting call after 3s');
          this.simulateAcceptCall();
        }, 3000);
      }

      return true;
    } catch (error) {
      console.error('[RTC] Failed to initiate call:', error);
      if (this.session) {
        this.session = {
          ...this.session,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        this.notifySessionChange();
      }
      return false;
    }
  }

  /**
   * 接听通话
   */
  async acceptCall(callId: string, roomId: string, callType: CallType): Promise<boolean> {
    try {
      console.log('[RTC] Accepting call:', callId);

      if (!this.session || this.session.id !== callId) {
        throw new Error('Call session not found');
      }

      // 更新状态
      this.session.status = 'connecting';
      this.session.connectTime = new Date().toISOString();
      this.notifySessionChange();

      // 获取令牌
      const tokenResult = await getToken(roomId);

      // 初始化 RTC 连接
      await this.initRTCConnection(callType, roomId, tokenResult.token);

      // 发送接受信令
      this.sendSignal({
        type: 'accept',
        callId,
        from: CURRENT_USER_ID,
        to: this.session.remoteUserId || '',
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('[RTC] Failed to accept call:', error);
      if (this.session) {
        this.session.status = 'failed';
        this.session.error = error instanceof Error ? error.message : 'Unknown error';
        this.notifySessionChange();
      }
      return false;
    }
  }

  /**
   * 拒绝通话
   */
  async rejectCall(callId: string): Promise<boolean> {
    if (!this.session || this.session.id !== callId) {
      return false;
    }

    console.log('[RTC] Rejecting call:', callId);

    // 发送拒绝信令
    this.sendSignal({
      type: 'reject',
      callId,
      from: CURRENT_USER_ID,
      to: this.session.remoteUserId || '',
      timestamp: new Date().toISOString(),
    });

    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    try {
      await this.cleanup();
    } catch (error) {
      console.error('[RTC] Error during cleanup:', error);
    }
    return true;
  }

  /**
   * 挂断通话
   */
  async hangup(): Promise<boolean> {
    if (!this.session) {
      return false;
    }

    console.log('[RTC] Hanging up call:', this.session.id);

    const { roomId, remoteUserId } = this.session;

    // 发送挂断信令
    if (remoteUserId) {
      this.sendSignal({
        type: 'hangup',
        callId: this.session.id,
        from: CURRENT_USER_ID,
        to: remoteUserId,
        timestamp: new Date().toISOString(),
      });
    }

    // 结束房间
    if (roomId) {
      try {
        await endRoom(roomId);
        console.log('[RTC] Ended room:', roomId);
      } catch (error) {
        console.error('[RTC] Error ending room:', error);
      }
    }

    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
    return true;
  }

  /**
   * 处理来电
   */
  handleIncomingCall(
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    roomId: string,
    callType: CallType
  ) {
    console.log('[RTC] Incoming call from:', callerId);

    const session: CallSession = {
      id: callId,
      roomId,
      callType,
      status: 'ringing',
      direction: 'incoming',
      localUserId: CURRENT_USER_ID,
      remoteUserId: callerId,
      remoteUserName: callerName,
      remoteUserAvatar: callerAvatar,
      startTime: new Date().toISOString(),
      isMuted: false,
      isCameraOff: false,
      isSpeakerOff: false,
    };

    this.session = session;
    this.notifySessionChange();
  }

  /**
   * 处理信令
   */
  async handleSignal(signal: CallSignal) {
    console.log('[RTC] Received signal:', signal.type);

    if (!this.session || this.session.id !== signal.callId) {
      return;
    }

    try {
      switch (signal.type) {
        case 'accept':
          await this.handleAccept();
          break;
        case 'reject':
          await this.handleReject();
          break;
        case 'hangup':
          await this.handleHangup();
          break;
        case 'offer':
          // 信令处理现在由 RTC SDK 抽象层管理
          console.log('[RTC] Received offer signal, handled by SDK');
          break;
        case 'answer':
          // 信令处理现在由 RTC SDK 抽象层管理
          console.log('[RTC] Received answer signal, handled by SDK');
          break;
        case 'ice-candidate':
          // 信令处理现在由 RTC SDK 抽象层管理
          console.log('[RTC] Received ice-candidate signal, handled by SDK');
          break;
      }
    } catch (error) {
      console.error('[RTC] Error handling signal:', error);
    }
  }

  /**
   * 切换麦克风
   */
  async toggleMute(): Promise<boolean> {
    try {
      if (this.session) {
        const newMuteState = !this.session.isMuted;
        await this.rtcSdk.setLocalStreamEnabled(!newMuteState, !this.session.isCameraOff);
        this.session.isMuted = newMuteState;
        this.notifySessionChange();
      }
      return this.session?.isMuted || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle mute:', error);
      return this.session?.isMuted || false;
    }
  }

  /**
   * 切换摄像头
   */
  async toggleCamera(): Promise<boolean> {
    try {
      if (this.session) {
        const newCameraState = !this.session.isCameraOff;
        await this.rtcSdk.setLocalStreamEnabled(!this.session.isMuted, !newCameraState);
        this.session.isCameraOff = newCameraState;
        this.notifySessionChange();
      }
      return this.session?.isCameraOff || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle camera:', error);
      return this.session?.isCameraOff || false;
    }
  }

  /**
   * 切换扬声器
   */
  async toggleSpeaker(): Promise<boolean> {
    try {
      if (this.session) {
        this.session.isSpeakerOff = !this.session.isSpeakerOff;
        this.notifySessionChange();
      }
      return this.session?.isSpeakerOff || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle speaker:', error);
      return this.session?.isSpeakerOff || false;
    }
  }

  /**
   * 获取当前会话
   */
  getSession(): CallSession | null {
    return this.session;
  }

  /**
   * 初始化 RTC 连接
   */
  private async initRTCConnection(callType: CallType, roomId: string, token: string) {
    if (!this.rtcSdk) {
      throw new Error('RTC SDK not initialized');
    }

    try {
      // 加入房间
      await this.rtcSdk.joinRoom(roomId, CURRENT_USER_ID, token, callType);
      console.log('[RTC] Joined room:', roomId);

      // 获取本地媒体流
      console.log('[RTC] Getting local stream...');
      const localStream = await this.rtcSdk.getLocalStream({
        video: callType === 'video',
        audio: true
      });
      
      if (localStream) {
        console.log('[RTC] Local stream obtained');
        this.onLocalStream?.(localStream);

        // 发布本地流
        await this.rtcSdk.publishStream(localStream);
        console.log('[RTC] Local stream published');

        // 订阅远程流
        if (this.session?.remoteUserId) {
          await this.rtcSdk.subscribeStream(this.session.remoteUserId);
          console.log('[RTC] Subscribed to remote stream');
        }
      } else {
        // 在模拟模式下，即使没有设备也继续通话流程
        if (MOCK_SIGNALING) {
          // 更新会话状态，标记没有媒体设备
          if (this.session) {
            this.session.isCameraOff = true;
            this.session.isMuted = true;
            // 添加错误信息提示用户
            this.session.error = '未检测到摄像头或麦克风设备';
            this.notifySessionChange();
          }
        }
      }
    } catch (error) {
      console.error('[RTC] Failed to initialize RTC connection:', error);
      throw error;
    }
  }

  /**
   * 模拟接听通话（测试用）
   */
  private async simulateAcceptCall() {
    if (!this.session) return;

    console.log('[RTC] Simulating accept call');

    // 更新状态
    this.session.status = 'connecting';
    this.session.connectTime = new Date().toISOString();
    this.notifySessionChange();

    // 模拟：1秒后连接成功
    setTimeout(() => {
      if (this.session) {
        this.session.status = 'connected';
        this.notifySessionChange();
        console.log('[RTC] Call connected (simulated)');
      }
    }, 1000);
  }

  /**
   * 处理接受
   */
  private async handleAccept() {
    if (!this.session) return;

    console.log('[RTC] Call accepted');
    this.session.status = 'connecting';
    this.session.connectTime = new Date().toISOString();
    this.notifySessionChange();
  }

  /**
   * 处理拒绝
   */
  private async handleReject() {
    if (!this.session) return;

    console.log('[RTC] Call rejected');
    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
  }

  /**
   * 处理挂断
   */
  private async handleHangup() {
    if (!this.session) return;

    console.log('[RTC] Call hung up by remote');
    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
  }

  /**
   * 设备管理方法
   */
  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    try {
      if (!this.rtcSdk) {
        throw new Error('RTC SDK not initialized');
      }
      return await this.rtcSdk.getDevices(deviceType);
    } catch (error) {
      console.error('[RTC] Failed to get devices:', error);
      return [];
    }
  }

  async switchDevice(deviceType: DeviceType, deviceId: string): Promise<boolean> {
    try {
      if (!this.rtcSdk) {
        throw new Error('RTC SDK not initialized');
      }
      await this.rtcSdk.switchDevice(deviceType, deviceId);
      return true;
    } catch (error) {
      console.error('[RTC] Failed to switch device:', error);
      return false;
    }
  }

  /**
   * 发送信令
   */
  private sendSignal(signal: CallSignal) {
    console.log('[RTC] Sending signal:', signal.type, 'to:', signal.to);

    // 这里应该通过 IM 服务发送信令
    // 暂时直接调用回调
    this.signalHandler?.(signal);

    // 模拟：如果是 call 信令，模拟对方收到
    if (MOCK_SIGNALING && signal.type === 'call') {
      console.log('[RTC] Mock: Simulating remote user receiving call');
    }
  }

  /**
   * 通知会话变化
   */
  private notifySessionChange() {
    if (this.session) {
      this.onSessionChange?.({ ...this.session });
    }
  }

  /**
   * 生成通话 ID
   */
  private generateCallId(): string {
    return generateUUID();
  }

  /**
   * 清理资源
   */
  private async cleanup() {
    console.log('[RTC] Cleaning up resources');
    
    try {
      if (this.rtcSdk && this.session?.roomId) {
        await this.rtcSdk.leaveRoom(this.session.roomId);
        console.log('[RTC] Left room:', this.session.roomId);
      }
    } catch (error) {
      console.error('[RTC] Error during cleanup:', error);
    } finally {
      this.rtcSdk = null;
      this.session = null;
    }
  }
}

// 单例实例
let rtcServiceInstance: RTCService | null = null;

/**
 * RTC Service 构造函数参数类型
 */
interface RTCServiceCallbacks {
  onSessionChange?: (session: CallSession | null) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onSignal?: (signal: CallSignal) => void;
}

/**
 * 获取 RTC Service 实例
 */
export function getRTCService(callbacks?: RTCServiceCallbacks): RTCService {
  if (!rtcServiceInstance) {
    rtcServiceInstance = new RTCService(callbacks);
  }
  return rtcServiceInstance;
}

/**
 * 销毁 RTC Service 实例
 */
export function destroyRTCService() {
  rtcServiceInstance = null;
}
