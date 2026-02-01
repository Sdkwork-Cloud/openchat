/**
 * WebSocket 客户端
 *
 * 功能：
 * 1. 自动重连（指数退避）
 * 2. 心跳检测
 * 3. 消息队列（断线时缓存）
 * 4. 事件订阅
 * 5. ACK 确认机制
 */

import { EventEmitter } from 'events';
import { API_BASE_URL, WS_BASE_URL } from '@/app/env';

export interface WebSocketConfig {
  url: string;
  token: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

export interface WebSocketMessage {
  event: string;
  payload: any;
  messageId?: string;
  timestamp?: number;
}

export interface MessageAck {
  messageId: string;
  status: 'delivered' | 'read';
  timestamp: number;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;
  private heartbeatTimeoutTimer: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingAcks: Map<string, { resolve: () => void; reject: () => void }> = new Map();
  private connectionState: ConnectionState = 'disconnected';

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      ...config,
    };
  }

  /**
   * 获取当前连接状态
   */
  get state(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('stateChange', this.connectionState);

    try {
      const url = `${this.config.url}?token=${this.config.token}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.reconnectAttempts = this.config.reconnectAttempts; // 阻止自动重连

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.emit('stateChange', this.connectionState);
    this.emit('disconnected');
  }

  /**
   * 发送消息
   */
  send(event: string, payload: any, requireAck = false): Promise<void> {
    const message: WebSocketMessage = {
      event,
      payload,
      messageId: requireAck ? this.generateMessageId() : undefined,
      timestamp: Date.now(),
    };

    if (this.isConnected) {
      this.doSend(message);

      if (requireAck && message.messageId) {
        return this.waitForAck(message.messageId);
      }

      return Promise.resolve();
    } else {
      // 缓存到队列
      this.messageQueue.push(message);
      this.emit('messageQueued', message);

      if (requireAck && message.messageId) {
        return this.waitForAck(message.messageId);
      }

      return Promise.resolve();
    }
  }

  /**
   * 发送消息并等待确认
   */
  async sendWithAck(event: string, payload: any, timeout = 30000): Promise<void> {
    const messageId = this.generateMessageId();
    const message: WebSocketMessage = {
      event,
      payload,
      messageId,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutTimer = window.setTimeout(() => {
        this.pendingAcks.delete(messageId);
        reject(new Error('Message acknowledgment timeout'));
      }, timeout);

      // 存储 ACK 等待
      this.pendingAcks.set(messageId, {
        resolve: () => {
          clearTimeout(timeoutTimer);
          resolve();
        },
        reject: () => {
          clearTimeout(timeoutTimer);
          reject(new Error('Message acknowledgment failed'));
        },
      });

      // 发送消息
      if (this.isConnected) {
        this.doSend(message);
      } else {
        this.messageQueue.push(message);
      }
    });
  }

  /**
   * 确认消息接收
   */
  ack(messageId: string, status: 'delivered' | 'read' = 'delivered'): void {
    this.send('message:ack', {
      messageId,
      status,
      timestamp: Date.now(),
    });
  }

  // ========== 私有方法 ==========

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.connectionState = 'connected';
    this.emit('stateChange', this.connectionState);
    this.emit('connected');

    // 启动心跳
    this.startHeartbeat();

    // 刷新消息队列
    this.flushMessageQueue();

    // 同步离线消息
    this.emit('syncRequired');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;

      // 处理心跳响应
      if (data.event === 'pong') {
        this.handlePong();
        return;
      }

      // 处理 ACK
      if (data.event === 'message:ack' && data.payload?.messageId) {
        this.handleAck(data.payload as MessageAck);
        return;
      }

      // 触发事件
      this.emit(data.event, data.payload);
      this.emit('message', data);
    } catch (error) {
      this.emit('error', new Error('Failed to parse message'));
    }
  }

  private handleClose(): void {
    this.stopHeartbeat();
    this.connectionState = 'disconnected';
    this.emit('stateChange', this.connectionState);
    this.emit('disconnected');

    // 尝试重连
    this.attemptReconnect();
  }

  private handleError(error: any): void {
    this.emit('error', error);
  }

  private handlePong(): void {
    // 清除心跳超时
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private handleAck(ack: MessageAck): void {
    const pending = this.pendingAcks.get(ack.messageId);
    if (pending) {
      pending.resolve();
      this.pendingAcks.delete(ack.messageId);
    }

    this.emit('ack', ack);
  }

  private doSend(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.doSend(message);
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      this.send('ping', { timestamp: Date.now() });

      // 设置心跳超时
      this.heartbeatTimeoutTimer = window.setTimeout(() => {
        this.emit('heartbeatTimeout');
        this.ws?.close();
      }, this.config.heartbeatTimeout);
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = 'reconnecting';
    this.emit('stateChange', this.connectionState);
    this.emit('reconnecting', this.reconnectAttempts);

    // 指数退避
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private waitForAck(messageId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = window.setInterval(() => {
        if (!this.pendingAcks.has(messageId)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default WebSocketClient;
