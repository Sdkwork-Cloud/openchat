/**
 * WebSocket 客户端 - 增强版
 *
 * 功能：
 * 1. 自动重连（指数退避，带最大延迟限制）
 * 2. 心跳检测（智能心跳机制）
 * 3. 消息队列（优先级管理，消息过期机制）
 * 4. 事件订阅（增强的事件系统）
 * 5. ACK 确认机制（超时处理）
 * 6. 连接状态管理（详细的状态信息）
 * 7. 错误处理（健壮的错误处理策略）
 * 8. 性能优化（内存使用优化）
 */

import { IM_WS_URL } from '@/app/env';

// 自定义事件发射器，兼容浏览器环境
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      this.events.set(event, listeners.filter(l => l !== listener));
    }
  }

  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }
}

export interface WebSocketConfig {
  url: string;
  token: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  messageQueueSize?: number;
  messageExpiryTime?: number;
}

export interface WebSocketMessage {
  event: string;
  payload: any;
  messageId?: string;
  timestamp?: number;
  priority?: 'low' | 'normal' | 'high';
  expiryTime?: number;
}

export interface MessageAck {
  messageId: string;
  status: 'delivered' | 'read';
  timestamp: number;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface ConnectionInfo {
  state: ConnectionState;
  reconnectAttempts: number;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  heartbeatStatus: 'healthy' | 'warning' | 'error';
  messageQueueSize: number;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;
  private heartbeatTimeoutTimer: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingAcks: Map<string, { resolve: () => void; reject: () => void; timeout: number }> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private lastConnectedAt?: number;
  private lastDisconnectedAt?: number;
  private heartbeatStatus: 'healthy' | 'warning' | 'error' = 'healthy';
  private lastHeartbeatTime = 0;

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      messageQueueSize: 1000,
      messageExpiryTime: 300000,
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
   * 获取详细的连接信息
   */
  get connectionInfo(): ConnectionInfo {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      heartbeatStatus: this.heartbeatStatus,
      messageQueueSize: this.messageQueue.length,
    };
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('stateChange', this.connectionState, this.connectionInfo);

    try {
      const url = `${this.config.url}?token=${this.config.token}&timestamp=${Date.now()}`;
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
    this.lastDisconnectedAt = Date.now();
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('disconnected', this.connectionInfo);
  }

  /**
   * 发送消息
   */
  send(event: string, payload: any, options?: {
    requireAck?: boolean;
    priority?: 'low' | 'normal' | 'high';
    expiryTime?: number;
  }): Promise<void> {
    const {
      requireAck = false,
      priority = 'normal',
      expiryTime = this.config.messageExpiryTime,
    } = options || {};

    const message: WebSocketMessage = {
      event,
      payload,
      messageId: requireAck ? this.generateMessageId() : undefined,
      timestamp: Date.now(),
      priority,
      expiryTime: Date.now() + expiryTime,
    };

    if (this.isConnected) {
      this.doSend(message);

      if (requireAck && message.messageId) {
        return this.waitForAck(message.messageId);
      }

      return Promise.resolve();
    } else {
      // 缓存到队列（带优先级）
      this.enqueueMessage(message);
      this.emit('messageQueued', message, this.messageQueue.length);

      if (requireAck && message.messageId) {
        return this.waitForAck(message.messageId);
      }

      return Promise.resolve();
    }
  }

  /**
   * 发送消息并等待确认
   */
  async sendWithAck(event: string, payload: any, options?: {
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
    expiryTime?: number;
  }): Promise<void> {
    const {
      timeout = 30000,
      priority = 'high',
      expiryTime = this.config.messageExpiryTime,
    } = options || {};

    const messageId = this.generateMessageId();
    const message: WebSocketMessage = {
      event,
      payload,
      messageId,
      timestamp: Date.now(),
      priority,
      expiryTime: Date.now() + expiryTime,
    };

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutTimer = window.setTimeout(() => {
        this.pendingAcks.delete(messageId);
        const error = new Error('Message acknowledgment timeout');
        this.emit('ackTimeout', messageId, error);
        reject(error);
      }, timeout);

      // 存储 ACK 等待
      this.pendingAcks.set(messageId, {
        resolve: () => {
          clearTimeout(timeoutTimer);
          resolve();
        },
        reject: (error?: Error) => {
          clearTimeout(timeoutTimer);
          reject(error || new Error('Message acknowledgment failed'));
        },
        timeout: timeoutTimer,
      });

      // 发送消息
      if (this.isConnected) {
        this.doSend(message);
      } else {
        this.enqueueMessage(message);
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
    }, {
      priority: 'low',
    });
  }

  /**
   * 清理过期消息
   */
  cleanupExpiredMessages(): number {
    const now = Date.now();
    const initialSize = this.messageQueue.length;
    
    this.messageQueue = this.messageQueue.filter(message => {
      const isExpired = message.expiryTime && message.expiryTime < now;
      if (isExpired) {
        this.emit('messageExpired', message);
      }
      return !isExpired;
    });
    
    return initialSize - this.messageQueue.length;
  }

  /**
   * 清空消息队列
   */
  clearMessageQueue(): void {
    const clearedMessages = [...this.messageQueue];
    this.messageQueue = [];
    this.emit('messageQueueCleared', clearedMessages.length);
  }

  /**
   * 获取消息队列状态
   */
  getMessageQueueStatus() {
    const now = Date.now();
    const expiredCount = this.messageQueue.filter(message => 
      message.expiryTime && message.expiryTime < now
    ).length;
    
    return {
      total: this.messageQueue.length,
      expired: expiredCount,
      healthy: this.messageQueue.length < this.config.messageQueueSize * 0.8,
      byPriority: {
        high: this.messageQueue.filter(m => m.priority === 'high').length,
        normal: this.messageQueue.filter(m => m.priority === 'normal').length,
        low: this.messageQueue.filter(m => m.priority === 'low').length,
      },
    };
  }

  // ========== 私有方法 ==========

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.connectionState = 'connected';
    this.lastConnectedAt = Date.now();
    this.heartbeatStatus = 'healthy';
    this.lastHeartbeatTime = Date.now();
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('connected', this.connectionInfo);

    // 启动心跳
    this.startHeartbeat();

    // 清理过期消息
    const expiredCount = this.cleanupExpiredMessages();
    if (expiredCount > 0) {
      this.emit('expiredMessagesCleaned', expiredCount);
    }

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
      this.emit(data.event, data.payload, data);
      this.emit('message', data);
    } catch (error: any) {
      const parseError = new Error(`Failed to parse message: ${error.message}`);
      this.emit('error', parseError);
      this.emit('messageParseError', parseError, event.data);
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.connectionState = 'disconnected';
    this.lastDisconnectedAt = Date.now();
    this.heartbeatStatus = 'error';
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('disconnected', event.code, event.reason);

    // 尝试重连
    this.attemptReconnect();
  }

  private handleError(error: any): void {
    this.connectionState = 'error';
    this.heartbeatStatus = 'error';
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('error', error);
    this.emit('connectionError', error);

    // 尝试重连
    this.attemptReconnect();
  }

  private handlePong(): void {
    // 清除心跳超时
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    // 更新心跳状态
    this.lastHeartbeatTime = Date.now();
    this.heartbeatStatus = 'healthy';
    this.emit('heartbeatHealthy');
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
      try {
        this.ws.send(JSON.stringify(message));
        this.emit('messageSent', message);
      } catch (error) {
        this.emit('sendError', error, message);
        // 重新加入队列
        this.enqueueMessage(message);
      }
    } else {
      // 重新加入队列
      this.enqueueMessage(message);
    }
  }

  private enqueueMessage(message: WebSocketMessage): void {
    // 检查队列大小
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      // 移除最旧的低优先级消息
      const lowPriorityIndex = this.messageQueue.findIndex(m => m.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        // 如果没有低优先级消息，移除最旧的消息
        this.messageQueue.shift();
      }
      this.emit('messageQueueFull', this.config.messageQueueSize);
    }

    // 按优先级插入
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const messagePriority = priorityOrder[message.priority || 'normal'];
    
    let insertIndex = this.messageQueue.length;
    for (let i = 0; i < this.messageQueue.length; i++) {
      const queuePriority = priorityOrder[this.messageQueue[i].priority || 'normal'];
      if (messagePriority < queuePriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.messageQueue.splice(insertIndex, 0, message);
  }

  private flushMessageQueue(): void {
    // 清理过期消息
    this.cleanupExpiredMessages();
    
    // 按优先级发送
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    this.messageQueue.sort((a, b) => {
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      return priorityA - priorityB;
    });

    // 发送消息
    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];
    
    messagesToSend.forEach(message => {
      // 再次检查是否过期
      if (!message.expiryTime || message.expiryTime >= Date.now()) {
        this.doSend(message);
      } else {
        this.emit('messageExpired', message);
      }
    });

    this.emit('messageQueueFlushed', messagesToSend.length);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;
      
      // 检查心跳状态
      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 1.5) {
        this.heartbeatStatus = 'warning';
        this.emit('heartbeatWarning', timeSinceLastHeartbeat);
      }

      // 发送心跳
      this.send('ping', { 
        timestamp: now,
        sequence: Math.floor(now / this.config.heartbeatInterval)
      }, {
        priority: 'low',
        requireAck: false,
      });

      // 设置心跳超时
      this.heartbeatTimeoutTimer = window.setTimeout(() => {
        this.heartbeatStatus = 'error';
        this.emit('heartbeatTimeout');
        this.emit('connectionError', new Error('Heartbeat timeout'));
        
        // 主动关闭连接以触发重连
        if (this.ws) {
          this.ws.close(4000, 'Heartbeat timeout');
        }
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
      this.emit('reconnectFailed', this.reconnectAttempts);
      this.connectionState = 'disconnected';
      this.emit('stateChange', this.connectionState, this.connectionInfo);
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = 'reconnecting';
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('reconnecting', this.reconnectAttempts, this.config.reconnectAttempts);

    // 指数退避，带最大延迟限制
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    // 添加随机抖动，避免重连风暴
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    const finalDelay = Math.max(this.config.reconnectDelay, delay + jitter);

    setTimeout(() => {
      this.connect();
    }, finalDelay);
  }

  private waitForAck(messageId: string, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutTimer = window.setTimeout(() => {
        this.pendingAcks.delete(messageId);
        const error = new Error('Message acknowledgment timeout');
        this.emit('ackTimeout', messageId, error);
        reject(error);
      }, timeout);

      this.pendingAcks.set(messageId, {
        resolve,
        reject,
        timeout: timeoutTimer,
      });
    });
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default WebSocketClient;

// 导出单例实例
export const websocketClient = new WebSocketClient({
  url: IM_WS_URL || 'ws://localhost:5200',
  token: localStorage.getItem('token') || '',
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  messageQueueSize: 1000,
  messageExpiryTime: 300000
});
