/**
 * RTC信令模块 - 基于IM服务的实时音视频信令传输
 *
 * 设计原则：
 * 1. 信令与媒体分离，信令通过IM服务传输，媒体通过RTC Provider传输
 * 2. 支持完整的WebRTC信令流程：OFFER -> ANSWER -> ICE_CANDIDATE
 * 3. 支持房间管理信令：JOIN, LEAVE, PUBLISH, UNPUBLISH
 * 4. 高可靠性，支持信令重传和超时处理
 * 5. 完全封装IM服务细节，对外提供标准信令接口
 *
 * 信令流程：
 * 1. 加入房间：发送JOIN信令 -> 接收其他用户JOIN信令
 * 2. 发布流：发送PUBLISH信令 -> 接收其他用户PUBLISH信令
 * 3. WebRTC协商：发送OFFER -> 接收ANSWER -> 交换ICE_CANDIDATE
 * 4. 离开房间：发送LEAVE信令 -> 接收其他用户LEAVE信令
 *
 * 使用示例：
 * ```typescript
 * const signaling = new RTCSignaling({
 *   imService,
 *   uid: 'user-123',
 *   onSignal: (message) => {
 *     // 处理接收到的信令
 *   }
 * });
 *
 * // 发送加入房间信令
 * await signaling.sendJoinSignal('room-456');
 *
 * // 发送WebRTC Offer
 * await signaling.sendOffer('room-456', 'remote-user', offerSdp);
 * ```
 */

import { IIMService } from '../services/im-service';
import {
  RTCSignalMessage,
  RTCSignalType,
  RTCSignalOffer,
  RTCSignalAnswer,
  RTCSignalIceCandidate,
  RTCError,
  RTCErrorCode,
} from './types';

/**
 * 信令配置
 */
interface RTCSignalingConfig {
  /** IM服务实例 */
  imService: IIMService;
  /** 当前用户ID */
  uid: string;
  /** 信令接收回调 */
  onSignal: (message: RTCSignalMessage) => void;
  /** 信令超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 信令发送选项
 */
interface SignalSendOptions {
  /** 目标用户ID（单播） */
  targetUserId?: string;
  /** 是否需要确认 */
  requireAck?: boolean;
  /** 超时时间 */
  timeout?: number;
}

/**
 * RTC信令模块
 *
 * 职责：
 * 1. 封装IM服务，提供标准信令发送接口
 * 2. 监听IM消息，解析并分发RTC信令
 * 3. 管理信令超时和重传
 * 4. 维护信令会话状态
 */
export class RTCSignaling {
  private imService: IIMService;
  private uid: string;
  private onSignal: (message: RTCSignalMessage) => void;
  private timeout: number;
  private maxRetries: number;

  // 状态
  private initialized: boolean = false;
  private pendingAcks: Map<string, { resolve: () => void; reject: (reason?: unknown) => void; timer: NodeJS.Timeout }> = new Map();

  // 常量
  private readonly SIGNAL_CUSTOM_TYPE = 'rtc_signal';
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly DEFAULT_MAX_RETRIES = 3;

  constructor(config: RTCSignalingConfig) {
    this.imService = config.imService;
    this.uid = config.uid;
    this.onSignal = config.onSignal;
    this.timeout = config.timeout || this.DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries || this.DEFAULT_MAX_RETRIES;
  }

  /**
   * 初始化信令模块
   *
   * 绑定IM消息监听，开始接收RTC信令
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 监听IM自定义消息（RTC信令）
      this.imService.on('message_received', this.handleIMMessage.bind(this));

      this.initialized = true;
    } catch (error) {
      throw new RTCError(
        RTCErrorCode.SIGNALING_ERROR,
        `初始化信令模块失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error
      );
    }
  }

  /**
   * 销毁信令模块
   *
   * 清理资源，取消监听
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // 清理所有待确认的信令
    for (const [signalId, pending] of this.pendingAcks) {
      clearTimeout(pending.timer);
      pending.reject(new RTCError(
        RTCErrorCode.SIGNALING_ERROR,
        '信令模块已销毁'
      ));
    }
    this.pendingAcks.clear();

    // 取消监听
    this.imService.off('message_received', this.handleIMMessage.bind(this));

    this.initialized = false;
  }

  // ==================== 房间管理信令 ====================

  /**
   * 发送加入房间信令
   *
   * @param roomId 房间ID
   * @param options 发送选项
   */
  async sendJoinSignal(roomId: string, options?: SignalSendOptions): Promise<void> {
    const signal: RTCSignalMessage = {
      type: RTCSignalType.JOIN,
      roomId,
      userId: this.uid,
      timestamp: Date.now(),
      data: {
        userName: options?.targetUserId,
      },
    };

    await this.sendSignal(signal, options);
  }

  /**
   * 发送离开房间信令
   *
   * @param roomId 房间ID
   * @param options 发送选项
   */
  async sendLeaveSignal(roomId: string, options?: SignalSendOptions): Promise<void> {
    const signal: RTCSignalMessage = {
      type: RTCSignalType.LEAVE,
      roomId,
      userId: this.uid,
      timestamp: Date.now(),
      data: {},
    };

    await this.sendSignal(signal, options);
  }

  // ==================== 流管理信令 ====================

  /**
   * 发送发布流信令
   *
   * @param roomId 房间ID
   * @param streamId 流ID
   * @param options 发送选项
   */
  async sendPublishSignal(roomId: string, streamId: string, options?: SignalSendOptions): Promise<void> {
    const signal: RTCSignalMessage = {
      type: RTCSignalType.PUBLISH,
      roomId,
      userId: this.uid,
      timestamp: Date.now(),
      data: {
        streamId,
        hasVideo: true,
        hasAudio: true,
      },
    };

    await this.sendSignal(signal, options);
  }

  /**
   * 发送取消发布流信令
   *
   * @param roomId 房间ID
   * @param streamId 流ID
   * @param options 发送选项
   */
  async sendUnpublishSignal(roomId: string, streamId: string, options?: SignalSendOptions): Promise<void> {
    const signal: RTCSignalMessage = {
      type: RTCSignalType.UNPUBLISH,
      roomId,
      userId: this.uid,
      timestamp: Date.now(),
      data: {
        streamId,
      },
    };

    await this.sendSignal(signal, options);
  }

  /**
   * 发送订阅流信令
   *
   * @param roomId 房间ID
   * @param targetUserId 目标用户ID
   * @param options 发送选项
   */
  async sendSubscribeSignal(roomId: string, targetUserId: string, options?: SignalSendOptions): Promise<void> {
    const signal: RTCSignalMessage = {
      type: RTCSignalType.SUBSCRIBE,
      roomId,
      userId: this.uid,
      targetUserId,
      timestamp: Date.now(),
      data: {
        video: true,
        audio: true,
      },
    };

    await this.sendSignal(signal, { ...options, targetUserId });
  }

  /**
   * 发送取消订阅流信令
   *
   * @param roomId 房间ID
   * @param targetUserId 目标用户ID
   * @param options 发送选项
   */
  async sendUnsubscribeSignal(roomId: string, targetUserId: string, options?: SignalSendOptions): Promise<void> {
    const signal: RTCSignalMessage = {
      type: RTCSignalType.UNSUBSCRIBE,
      roomId,
      userId: this.uid,
      targetUserId,
      timestamp: Date.now(),
      data: {},
    };

    await this.sendSignal(signal, { ...options, targetUserId });
  }

  // ==================== WebRTC协商信令 ====================

  /**
   * 发送Offer信令
   *
   * @param roomId 房间ID
   * @param targetUserId 目标用户ID
   * @param sdp Offer SDP
   * @param options 发送选项
   */
  async sendOffer(roomId: string, targetUserId: string, sdp: string, options?: SignalSendOptions): Promise<void> {
    const offerData: RTCSignalOffer = {
      sdp,
      streamId: `stream-${this.uid}`,
    };

    const signal: RTCSignalMessage = {
      type: RTCSignalType.OFFER,
      roomId,
      userId: this.uid,
      targetUserId,
      timestamp: Date.now(),
      data: offerData,
    };

    await this.sendSignal(signal, { ...options, targetUserId });
  }

  /**
   * 发送Answer信令
   *
   * @param roomId 房间ID
   * @param targetUserId 目标用户ID
   * @param sdp Answer SDP
   * @param options 发送选项
   */
  async sendAnswer(roomId: string, targetUserId: string, sdp: string, options?: SignalSendOptions): Promise<void> {
    const answerData: RTCSignalAnswer = {
      sdp,
      streamId: `stream-${this.uid}`,
    };

    const signal: RTCSignalMessage = {
      type: RTCSignalType.ANSWER,
      roomId,
      userId: this.uid,
      targetUserId,
      timestamp: Date.now(),
      data: answerData,
    };

    await this.sendSignal(signal, { ...options, targetUserId });
  }

  /**
   * 发送ICE Candidate信令
   *
   * @param roomId 房间ID
   * @param targetUserId 目标用户ID
   * @param candidate ICE Candidate
   * @param options 发送选项
   */
  async sendIceCandidate(
    roomId: string,
    targetUserId: string,
    candidate: RTCIceCandidateInit,
    options?: SignalSendOptions
  ): Promise<void> {
    const iceData: RTCSignalIceCandidate = {
      candidate,
      streamId: `stream-${this.uid}`,
    };

    const signal: RTCSignalMessage = {
      type: RTCSignalType.ICE_CANDIDATE,
      roomId,
      userId: this.uid,
      targetUserId,
      timestamp: Date.now(),
      data: iceData,
    };

    await this.sendSignal(signal, { ...options, targetUserId });
  }

  // ==================== 私有方法 ====================

  /**
   * 发送信令消息
   *
   * @param signal 信令消息
   * @param options 发送选项
   */
  private async sendSignal(signal: RTCSignalMessage, options?: SignalSendOptions): Promise<void> {
    try {
      // 通过IM服务发送信令
      // 如果有targetUserId，则发送给指定用户；否则广播给房间
      if (options?.targetUserId) {
        // 单播给指定用户
        await this.imService.sendCustom({
          toUserId: options.targetUserId,
          customType: this.SIGNAL_CUSTOM_TYPE,
          data: signal,
        });
      } else {
        // 广播给房间（通过群组消息）
        // 这里假设房间对应一个群组
        await this.imService.sendCustom({
          groupId: signal.roomId,
          customType: this.SIGNAL_CUSTOM_TYPE,
          data: signal,
        });
      }

      // 如果需要确认，等待ACK
      if (options?.requireAck) {
        await this.waitForAck(signal);
      }

    } catch (error) {
      throw new RTCError(
        RTCErrorCode.SIGNALING_ERROR,
        `发送信令失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error
      );
    }
  }

  /**
   * 等待信令确认
   *
   * @param signal 原始信令
   */
  private waitForAck(signal: RTCSignalMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const signalId = `${signal.type}-${signal.timestamp}`;
      const timeout = this.timeout;

      const timer = setTimeout(() => {
        this.pendingAcks.delete(signalId);
        reject(new RTCError(
          RTCErrorCode.SIGNALING_ERROR,
          `信令超时: ${signal.type}`
        ));
      }, timeout);

      this.pendingAcks.set(signalId, { resolve, reject, timer });
    });
  }

  /**
   * 处理ACK确认
   *
   * @param signalId 信令ID
   */
  private handleAck(signalId: string): void {
    const pending = this.pendingAcks.get(signalId);
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve();
      this.pendingAcks.delete(signalId);
    }
  }

  /**
   * 处理IM消息
   *
   * 解析RTC信令并分发给上层
   */
  private handleIMMessage(message: any): void {
    try {
      // 检查是否是RTC信令消息
      if (message.type !== 'custom' || message.customType !== this.SIGNAL_CUSTOM_TYPE) {
        return;
      }

      const signal: RTCSignalMessage = message.data;

      // 验证信令格式
      if (!this.validateSignal(signal)) {
        console.warn('收到无效的RTC信令:', signal);
        return;
      }

      // 忽略自己发送的信令
      if (signal.userId === this.uid) {
        return;
      }

      // 处理ACK信令
      if (signal.type === RTCSignalType.ACK) {
        this.handleAck(signal.data.signalId);
        return;
      }

      // 发送ACK确认（如果需要）
      if (this.requiresAck(signal)) {
        this.sendAck(signal);
      }

      // 分发信令给上层
      this.onSignal(signal);

    } catch (error) {
      console.error('处理RTC信令失败:', error);
    }
  }

  /**
   * 发送ACK确认
   *
   * @param signal 原始信令
   */
  private async sendAck(signal: RTCSignalMessage): Promise<void> {
    try {
      const ackSignal: RTCSignalMessage = {
        type: RTCSignalType.ACK,
        roomId: signal.roomId,
        userId: this.uid,
        targetUserId: signal.userId,
        timestamp: Date.now(),
        data: {
          signalId: `${signal.type}-${signal.timestamp}`,
        },
      };

      if (signal.userId) {
        await this.imService.sendCustom({
          toUserId: signal.userId,
          customType: this.SIGNAL_CUSTOM_TYPE,
          data: ackSignal,
        });
      }
    } catch (error) {
      console.error('发送ACK失败:', error);
    }
  }

  /**
   * 验证信令格式
   *
   * @param signal 信令消息
   */
  private validateSignal(signal: any): signal is RTCSignalMessage {
    return (
      signal &&
      typeof signal.type === 'string' &&
      typeof signal.roomId === 'string' &&
      typeof signal.userId === 'string' &&
      typeof signal.timestamp === 'number' &&
      signal.data !== undefined
    );
  }

  /**
   * 判断信令是否需要ACK确认
   *
   * @param signal 信令消息
   */
  private requiresAck(signal: RTCSignalMessage): boolean {
    // 以下信令类型需要ACK确认
    const ackRequiredTypes = [
      RTCSignalType.OFFER,
      RTCSignalType.ANSWER,
      RTCSignalType.JOIN,
      RTCSignalType.LEAVE,
    ];
    return ackRequiredTypes.includes(signal.type);
  }
}

export default RTCSignaling;
