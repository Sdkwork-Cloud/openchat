/**
 * 娑堟伅闃熷垪鏈嶅姟
 *
 * 鑱岃矗锛氱鐞嗘秷鎭彂閫侀槦鍒楋紝瀹炵幇绂荤嚎娑堟伅缂撳瓨鍜岄噸鍙? */

import { v4 as uuidv4 } from 'uuid';

// 娑堟伅鐘舵€?export enum MessageStatus {
  PENDING = 'pending',      // 寰呭彂閫?  SENDING = 'sending',      // 鍙戦€佷腑
  SENT = 'sent',            // 宸插彂閫?  DELIVERED = 'delivered',  // 宸查€佽揪
  READ = 'read',            // 宸茶
  FAILED = 'failed',        // 鍙戦€佸け璐?  RETRYING = 'retrying',    // 閲嶈瘯涓?}

// 闃熷垪娑堟伅
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

// 杩炴帴鐘舵€?export enum ConnectionState {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

// 閲嶈繛绛栫暐閰嶇疆
interface ReconnectConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// 榛樿閲嶈繛閰嶇疆
const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * 娑堟伅闃熷垪鏈嶅姟
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
   * 娣诲姞娑堟伅鍒伴槦鍒?   */
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

    // 濡傛灉宸茶繛鎺ワ紝绔嬪嵆灏濊瘯鍙戦€?    if (this.connectionState === ConnectionState.CONNECTED) {
      this.processQueue();
    }

    return message;
  }

  /**
   * 鏇存柊娑堟伅鐘舵€?   */
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

    // 濡傛灉鍙戦€佹垚鍔燂紝浠庨槦鍒椾腑绉婚櫎
    if (status === MessageStatus.SENT || status === MessageStatus.DELIVERED) {
      this.queue.delete(messageId);
    }

    // 濡傛灉鍙戦€佸け璐ヤ笖鏈秴杩囬噸璇曟鏁帮紝鏍囪涓洪噸璇?    if (status === MessageStatus.FAILED && message.retryCount < message.maxRetries) {
      message.status = MessageStatus.RETRYING;
      message.retryCount++;
      
      // 寤惰繜閲嶈瘯
      setTimeout(() => {
        message.status = MessageStatus.PENDING;
        this.processQueue();
      }, 1000 * message.retryCount);
    }

    this.notifyMessageUpdate(message);
  }

  /**
   * 鑾峰彇寰呭彂閫佹秷鎭?   */
  getPendingMessages(): QueuedMessage[] {
    return Array.from(this.queue.values()).filter(
      (msg) => msg.status === MessageStatus.PENDING || msg.status === MessageStatus.RETRYING
    );
  }

  /**
   * 鑾峰彇鎵€鏈夋秷鎭?   */
  getAllMessages(): QueuedMessage[] {
    return Array.from(this.queue.values());
  }

  /**
   * 璁剧疆杩炴帴鐘舵€?   */
  setConnectionState(state: ConnectionState): void {
    const prevState = this.connectionState;
    this.connectionState = state;

    // 閫氱煡鐩戝惉鍣?    this.listeners.forEach((listener) => listener(state));

    // 濡傛灉杩炴帴鎴愬姛锛屽鐞嗛槦鍒?    if (state === ConnectionState.CONNECTED && prevState !== ConnectionState.CONNECTED) {
      this.reconnectAttempts = 0;
      this.processQueue();
    }

    // 濡傛灉鏂紑杩炴帴锛屽惎鍔ㄩ噸杩?    if (state === ConnectionState.DISCONNECTED) {
      this.scheduleReconnect();
    }
  }

  /**
   * 鑾峰彇杩炴帴鐘舵€?   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 澶勭悊鍙戦€侀槦鍒?   */
  private async processQueue(): Promise<void> {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      return;
    }

    const pendingMessages = this.getPendingMessages();

    for (const message of pendingMessages) {
      try {
        this.updateMessageStatus(message.id, MessageStatus.SENDING);
        
        // 瀹為檯鍙戦€侀€昏緫鐢卞閮ㄥ疄鐜?        // 杩欓噷瑙﹀彂鍙戦€佷簨浠?        await this.sendMessage(message);
      } catch (error) {
        this.updateMessageStatus(
          message.id,
          MessageStatus.FAILED,
          error instanceof Error ? error.message : '鍙戦€佸け璐?
        );
      }
    }
  }

  /**
   * 鍙戦€佹秷鎭紙鐢卞閮ㄥ疄鐜帮級
   */
  private async sendMessage(message: QueuedMessage): Promise<void> {
    // 杩欓噷搴旇璋冪敤瀹為檯鐨?SDK 鍙戦€佹柟娉?    // 鏆傛椂妯℃嫙鍙戦€佹垚鍔?    return new Promise((resolve, reject) => {
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
   * 璋冨害閲嶈繛
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

    // 璁＄畻寤惰繜鏃堕棿锛堟寚鏁伴€€閬匡級
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
   * 灏濊瘯閲嶈繛
   */
  private attemptReconnect(): void {
    // 杩欓噷搴旇璋冪敤瀹為檯鐨?SDK 閲嶈繛鏂规硶
    // 鏆傛椂妯℃嫙閲嶈繛
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
   * 鍚姩瀹氭湡鍒锋柊瀹氭椂鍣?   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * 鎵嬪姩鍒锋柊闃熷垪
   */
  flush(): void {
    this.processQueue();
  }

  /**
   * 娓呯┖闃熷垪
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * 鍙栨秷鐗瑰畾娑堟伅
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
   * 閲嶈瘯澶辫触娑堟伅
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
   * 璁㈤槄杩炴帴鐘舵€佸彉鍖?   */
  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 璁㈤槄娑堟伅鏇存柊
   */
  onMessageUpdate(listener: (message: QueuedMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * 閫氱煡娑堟伅鏇存柊
   */
  private notifyMessageUpdate(message: QueuedMessage): void {
    this.messageListeners.forEach((listener) => listener(message));
  }

  /**
   * 閿€姣佹湇鍔?   */
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

// 鍗曚緥瀹炰緥
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

