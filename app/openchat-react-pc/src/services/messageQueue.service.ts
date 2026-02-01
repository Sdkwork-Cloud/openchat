/**
 * 消息队列服务
 *
 * 职责：管理消息发送队列，实现离线消息缓存和重发
 */

import { v4 as uuidv4 } from 'uuid';

// 消息状态
export enum MessageStatus {
  PENDING = 'pending',      // 待发送
  SENDING = 'sending',      // 发送中
  SENT = 'sent',            // 已发送
  DELIVERED = 'delivered',  // 已送达
  READ = 'read',            // 已读
  FAILED = 'failed',        // 发送失败
  RETRYING = 'retrying',    // 重试中
}

// 队列消息
export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file';
  status: MessageStatus;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
    name?: string;
  }>;
}

// 连接状态
export enum ConnectionState {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

// 重连策略配置
interface ReconnectConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// 默认重连配置
const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * 消息队列服务
 */
export class MessageQueueService {
  private queue: Map<string, QueuedMessage> = new Map();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private config: ReconnectConfig;
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private messageListeners: Set<(message: QueuedMessage) => void> = new Set();

  constructor(config: Partial<ReconnectConfig> = {}) {
    this.config = { ...DEFAULT_RECONNECT_CONFIG, ...config };
    this.startFlushTimer();
  }

  /**
   * 添加消息到队列
   */
  enqueue(
    conversationId: string,
    content: string,
    type: QueuedMessage['type'] = 'text',
    attachments?: QueuedMessage['attachments']
  ): QueuedMessage {
    const message: QueuedMessage = {
      id: uuidv4(),
      conversationId,
      content,
      type,
      status: MessageStatus.PENDING,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      attachments,
    };

    this.queue.set(message.id, message);
    this.notifyMessageUpdate(message);

    // 如果已连接，立即尝试发送
    if (this.connectionState === ConnectionState.CONNECTED) {
      this.processQueue();
    }

    return message;
  }

  /**
   * 更新消息状态
   */
  updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    error?: string
  ): void {
    const message = this.queue.get(messageId);
    if (!message) return;

    message.status = status;
    if (error) {
      message.error = error;
    }

    // 如果发送成功，从队列中移除
    if (status === MessageStatus.SENT || status === MessageStatus.DELIVERED) {
      this.queue.delete(messageId);
    }

    // 如果发送失败且未超过重试次数，标记为重试
    if (status === MessageStatus.FAILED && message.retryCount < message.maxRetries) {
      message.status = MessageStatus.RETRYING;
      message.retryCount++;
      
      // 延迟重试
      setTimeout(() => {
        message.status = MessageStatus.PENDING;
        this.processQueue();
      }, 1000 * message.retryCount);
    }

    this.notifyMessageUpdate(message);
  }

  /**
   * 获取待发送消息
   */
  getPendingMessages(): QueuedMessage[] {
    return Array.from(this.queue.values()).filter(
      (msg) => msg.status === MessageStatus.PENDING || msg.status === MessageStatus.RETRYING
    );
  }

  /**
   * 获取所有消息
   */
  getAllMessages(): QueuedMessage[] {
    return Array.from(this.queue.values());
  }

  /**
   * 设置连接状态
   */
  setConnectionState(state: ConnectionState): void {
    const prevState = this.connectionState;
    this.connectionState = state;

    // 通知监听器
    this.listeners.forEach((listener) => listener(state));

    // 如果连接成功，处理队列
    if (state === ConnectionState.CONNECTED && prevState !== ConnectionState.CONNECTED) {
      this.reconnectAttempts = 0;
      this.processQueue();
    }

    // 如果断开连接，启动重连
    if (state === ConnectionState.DISCONNECTED) {
      this.scheduleReconnect();
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 处理发送队列
   */
  private async processQueue(): Promise<void> {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      return;
    }

    const pendingMessages = this.getPendingMessages();

    for (const message of pendingMessages) {
      try {
        this.updateMessageStatus(message.id, MessageStatus.SENDING);
        
        // 实际发送逻辑由外部实现
        // 这里触发发送事件
        await this.sendMessage(message);
      } catch (error) {
        this.updateMessageStatus(
          message.id,
          MessageStatus.FAILED,
          error instanceof Error ? error.message : '发送失败'
        );
      }
    }
  }

  /**
   * 发送消息（由外部实现）
   */
  private async sendMessage(message: QueuedMessage): Promise<void> {
    // 这里应该调用实际的 SDK 发送方法
    // 暂时模拟发送成功
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          this.updateMessageStatus(message.id, MessageStatus.SENT);
          resolve();
        } else {
          reject(new Error('Network error'));
        }
      }, 100);
    });
  }

  /**
   * 调度重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.setConnectionState(ConnectionState.FAILED);
      return;
    }

    this.setConnectionState(ConnectionState.RECONNECTING);

    // 计算延迟时间（指数退避）
    const delay = Math.min(
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts),
      this.config.maxDelay
    );

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    // 这里应该调用实际的 SDK 重连方法
    // 暂时模拟重连
    this.setConnectionState(ConnectionState.CONNECTING);
    
    setTimeout(() => {
      if (Math.random() > 0.3) {
        this.setConnectionState(ConnectionState.CONNECTED);
      } else {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    }, 1000);
  }

  /**
   * 启动定期刷新定时器
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * 手动刷新队列
   */
  flush(): void {
    this.processQueue();
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * 取消特定消息
   */
  cancel(messageId: string): boolean {
    const message = this.queue.get(messageId);
    if (message && message.status === MessageStatus.PENDING) {
      this.queue.delete(messageId);
      return true;
    }
    return false;
  }

  /**
   * 重试失败消息
   */
  retry(messageId: string): boolean {
    const message = this.queue.get(messageId);
    if (message && message.status === MessageStatus.FAILED) {
      message.status = MessageStatus.PENDING;
      message.retryCount = 0;
      message.error = undefined;
      this.processQueue();
      return true;
    }
    return false;
  }

  /**
   * 订阅连接状态变化
   */
  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 订阅消息更新
   */
  onMessageUpdate(listener: (message: QueuedMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * 通知消息更新
   */
  private notifyMessageUpdate(message: QueuedMessage): void {
    this.messageListeners.forEach((listener) => listener(message));
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.listeners.clear();
    this.messageListeners.clear();
    this.queue.clear();
  }
}

// 单例实例
let messageQueueInstance: MessageQueueService | null = null;

export function getMessageQueueService(): MessageQueueService {
  if (!messageQueueInstance) {
    messageQueueInstance = new MessageQueueService();
  }
  return messageQueueInstance;
}

export function resetMessageQueueService(): void {
  messageQueueInstance?.destroy();
  messageQueueInstance = null;
}
