/**
 * 消息服务 V2
 *
 * 功能：
 * 1. 发送消息（带重试和确认）
 * 2. 消息状态管理
 * 3. 离线消息同步
 * 4. 消息缓存
 * 5. 消息搜索
 */

import { apiClient } from '@/services/api.client';
import { WebSocketClient, MessageAck } from '@/services/websocket.client';
import { generateUUID, generateTimestampId } from '@/utils/uuid';
import type { Message, MessageStatus } from '../entities/message.entity';

export type MessageContentType = 'text' | 'image' | 'file' | 'voice' | 'video' | 'location' | 'card';

export interface MessageContent {
  type: MessageContentType;
  text?: string;
  html?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  card?: {
    title: string;
    description: string;
    url: string;
    image?: string;
  };
}

export interface SendMessageParams {
  conversationId: string;
  content: MessageContent;
  replyToMessageId?: string;
  mentions?: string[];
}

export interface MessageQueryParams {
  conversationId: string;
  beforeMessageId?: string;
  afterMessageId?: string;
  limit?: number;
  keyword?: string;
}

export interface PendingMessage extends Message {
  clientSeq: number;
  retryCount: number;
  maxRetries: number;
  ackReceived: boolean;
  pendingPromise?: Promise<void>;
}

export interface SyncOptions {
  conversationId: string;
  lastSequence?: number;
  limit?: number;
}

export interface SyncResult {
  messages: Message[];
  hasMore: boolean;
  lastSequence: number;
}

/**
 * 消息服务类
 */
export class MessageServiceV2 {
  private wsClient: WebSocketClient | null = null;
  private messageQueue: Map<string, PendingMessage> = new Map();
  private localStorageKey = 'openchat_messages';
  private syncInProgress = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * 初始化 WebSocket 连接
   */
  initWebSocket(wsClient: WebSocketClient): void {
    this.wsClient = wsClient;
    this.setupWebSocketHandlers();
  }

  /**
   * 发送消息（带重试和确认）
   */
  async sendMessage(params: SendMessageParams): Promise<Message> {
    const messageId = generateUUID();
    const clientSeq = generateTimestampId();

    const pendingMessage: PendingMessage = {
      id: messageId,
      conversationId: params.conversationId,
      senderId: 'current-user',
      senderName: '我',
      senderAvatar: '👤',
      content: params.content,
      time: new Date().toISOString(),
      status: 'sending' as MessageStatus,
      replyToMessageId: params.replyToMessageId,
      mentions: params.mentions,
      clientSeq,
      retryCount: 0,
      maxRetries: 3,
      ackReceived: false,
    };

    // 1. 保存到本地（乐观更新）
    this.saveMessage(pendingMessage);

    try {
      // 2. 通过 WebSocket 发送（带 ACK）
      await this.sendViaWebSocket(pendingMessage);

      // 3. 更新状态为已发送
      pendingMessage.status = 'sent' as MessageStatus;
      this.updateMessage(pendingMessage);

      return pendingMessage;
    } catch (error) {
      // 4. 重试逻辑
      if (pendingMessage.retryCount < pendingMessage.maxRetries) {
        pendingMessage.retryCount++;
        await this.delay(1000 * pendingMessage.retryCount); // 指数退避
        return this.sendMessage(params);
      }

      // 5. 标记为失败
      pendingMessage.status = 'failed' as MessageStatus;
      this.updateMessage(pendingMessage);
      throw error;
    } finally {
      this.messageQueue.delete(messageId);
    }
  }

  /**
   * 同步离线消息
   */
  async syncOfflineMessages(options: SyncOptions): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { messages: [], hasMore: false, lastSequence: 0 };
    }

    this.syncInProgress = true;

    try {
      const response = await apiClient.get<SyncResult>(`/messages/sync`, {
        params: {
          conversationId: options.conversationId,
          afterSeq: options.lastSequence || 0,
          limit: options.limit || 50,
        },
      });

      // 合并到本地存储
      for (const message of response.messages) {
        this.saveMessage(message);
      }

      return response;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 获取消息列表（优先从本地获取）
   */
  async getMessages(params: MessageQueryParams): Promise<Message[]> {
    // 1. 先从本地获取
    const localMessages = this.getLocalMessages(params.conversationId);

    // 2. 如果本地数据足够，直接返回
    if (localMessages.length >= (params.limit || 50)) {
      return this.filterAndSortMessages(localMessages, params);
    }

    // 3. 从服务器获取更多
    try {
      const serverMessages = await apiClient.get<Message[]>(`/messages`, {
        params: {
          conversationId: params.conversationId,
          beforeMessageId: params.beforeMessageId,
          afterMessageId: params.afterMessageId,
          limit: params.limit || 50,
          keyword: params.keyword,
        },
      });

      // 4. 合并到本地
      for (const message of serverMessages) {
        this.saveMessage(message);
      }

      return serverMessages;
    } catch (error) {
      // 5. 如果服务器请求失败，返回本地数据
      return this.filterAndSortMessages(localMessages, params);
    }
  }

  /**
   * 更新消息状态
   */
  async updateMessageStatus(
    conversationId: string,
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    const message = this.getMessage(conversationId, messageId);
    if (message) {
      message.status = status;
      this.updateMessage(message);

      // 同步到服务器
      if (this.wsClient?.isConnected) {
        this.wsClient.send('message:status', {
          messageId,
          status,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(conversationId: string, messageIds?: string[]): Promise<void> {
    const messages = this.getLocalMessages(conversationId);

    if (messageIds && messageIds.length > 0) {
      // 标记指定消息
      for (const messageId of messageIds) {
        const message = messages.find((m) => m.id === messageId);
        if (message && message.status !== 'read') {
          message.status = 'read';
          message.readTime = new Date().toISOString();
          this.updateMessage(message);
        }
      }
    } else {
      // 标记所有未读消息
      for (const message of messages) {
        if (message.senderId !== 'current-user' && message.status !== 'read') {
          message.status = 'read';
          message.readTime = new Date().toISOString();
          this.updateMessage(message);
        }
      }
    }

    // 发送 ACK
    if (this.wsClient?.isConnected && messageIds) {
      for (const messageId of messageIds) {
        this.wsClient.ack(messageId, 'read');
      }
    }
  }

  /**
   * 撤回消息
   */
  async recallMessage(
    conversationId: string,
    messageId: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = this.getMessage(conversationId, messageId);
    if (!message) {
      return { success: false, error: '消息不存在' };
    }

    // 检查是否在2分钟内
    const messageTime = new Date(message.time).getTime();
    const now = Date.now();
    if (now - messageTime > 2 * 60 * 1000) {
      return { success: false, error: '消息发送超过2分钟，无法撤回' };
    }

    // 发送撤回请求
    try {
      await apiClient.post(`/messages/${messageId}/recall`);

      message.isRecalled = true;
      message.recallTime = new Date().toISOString();
      this.updateMessage(message);

      return { success: true };
    } catch (error) {
      return { success: false, error: '撤回失败' };
    }
  }

  /**
   * 搜索消息
   */
  async searchMessages(
    conversationId: string,
    keyword: string,
    limit = 20
  ): Promise<Message[]> {
    const messages = this.getLocalMessages(conversationId);
    const keywordLower = keyword.toLowerCase();

    return messages
      .filter(
        (m) =>
          m.content.text?.toLowerCase().includes(keywordLower) ||
          m.content.fileName?.toLowerCase().includes(keywordLower)
      )
      .slice(-limit);
  }

  /**
   * 获取未读消息数量
   */
  getUnreadCount(conversationId: string): number {
    const messages = this.getLocalMessages(conversationId);
    return messages.filter(
      (m) => m.senderId !== 'current-user' && m.status !== 'read'
    ).length;
  }

  /**
   * 重试发送失败的消息
   */
  async retryFailedMessage(messageId: string): Promise<boolean> {
    const pendingMessage = this.messageQueue.get(messageId);
    if (!pendingMessage) return false;

    if (pendingMessage.retryCount >= pendingMessage.maxRetries) {
      return false;
    }

    pendingMessage.retryCount++;
    pendingMessage.status = 'sending' as MessageStatus;
    this.updateMessage(pendingMessage);

    try {
      await this.sendViaWebSocket(pendingMessage);
      pendingMessage.status = 'sent' as MessageStatus;
      this.updateMessage(pendingMessage);
      return true;
    } catch (error) {
      pendingMessage.status = 'failed' as MessageStatus;
      this.updateMessage(pendingMessage);
      return false;
    }
  }

  // ========== 私有方法 ==========

  private setupWebSocketHandlers(): void {
    if (!this.wsClient) return;

    // 监听消息确认
    this.wsClient.on('message:ack', (ack: MessageAck) => {
      const pendingMessage = this.messageQueue.get(ack.messageId);
      if (pendingMessage) {
        pendingMessage.ackReceived = true;
        pendingMessage.status = ack.status;
        this.updateMessage(pendingMessage);
      }
    });

    // 监听新消息
    this.wsClient.on('message:received', (message: Message) => {
      this.saveMessage(message);
    });

    // 监听同步请求
    this.wsClient.on('syncRequired', () => {
      // 触发离线消息同步
      this.emit('syncRequired');
    });
  }

  private async sendViaWebSocket(message: PendingMessage): Promise<void> {
    if (!this.wsClient) {
      throw new Error('WebSocket not initialized');
    }

    return this.wsClient.sendWithAck(
      'message:send',
      {
        messageId: message.id,
        conversationId: message.conversationId,
        content: message.content,
        replyToMessageId: message.replyToMessageId,
        mentions: message.mentions,
        clientSeq: message.clientSeq,
      },
      30000 // 30秒超时
    );
  }

  private saveMessage(message: Message): void {
    const messages = this.getLocalMessages(message.conversationId);
    const existingIndex = messages.findIndex((m) => m.id === message.id);

    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }

    this.saveLocalMessages(message.conversationId, messages);
  }

  private updateMessage(message: Message): void {
    this.saveMessage(message);
  }

  private getMessage(conversationId: string, messageId: string): Message | undefined {
    const messages = this.getLocalMessages(conversationId);
    return messages.find((m) => m.id === messageId);
  }

  private getLocalMessages(conversationId: string): Message[] {
    try {
      const data = localStorage.getItem(`${this.localStorageKey}:${conversationId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalMessages(conversationId: string, messages: Message[]): void {
    try {
      // 限制存储数量，保留最新的 500 条
      const trimmedMessages = messages.slice(-500);
      localStorage.setItem(
        `${this.localStorageKey}:${conversationId}`,
        JSON.stringify(trimmedMessages)
      );
    } catch (error) {
      console.error('Failed to save messages to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    // 懒加载，按需从 localStorage 读取
  }

  private filterAndSortMessages(messages: Message[], params: MessageQueryParams): Message[] {
    let result = [...messages];

    // 关键词过滤
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      result = result.filter(
        (m) =>
          m.content.text?.toLowerCase().includes(keyword) ||
          m.content.fileName?.toLowerCase().includes(keyword)
      );
    }

    // 分页处理
    if (params.beforeMessageId) {
      const index = result.findIndex((m) => m.id === params.beforeMessageId);
      if (index !== -1) {
        result = result.slice(0, index);
      }
    }

    if (params.afterMessageId) {
      const index = result.findIndex((m) => m.id === params.afterMessageId);
      if (index !== -1) {
        result = result.slice(index + 1);
      }
    }

    // 排序（最新的在后面）
    result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // 限制数量
    const limit = params.limit || 50;
    return result.slice(-limit);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private emit(event: string, data?: any): void {
    // 触发事件（可以通过 EventEmitter 或其他方式）
    window.dispatchEvent(new CustomEvent(`message:${event}`, { detail: data }));
  }
}

export const messageServiceV2 = new MessageServiceV2();
export default messageServiceV2;
