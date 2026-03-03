/**
 * WebSocket 瀹㈡埛绔?- 澧炲己鐗? *
 * 鍔熻兘锛? * 1. 鑷姩閲嶈繛锛堟寚鏁伴€€閬匡紝甯︽渶澶у欢杩熼檺鍒讹級
 * 2. 蹇冭烦妫€娴嬶紙鏅鸿兘蹇冭烦鏈哄埗锛? * 3. 娑堟伅闃熷垪锛堜紭鍏堢骇绠＄悊锛屾秷鎭繃鏈熸満鍒讹級
 * 4. 浜嬩欢璁㈤槄锛堝寮虹殑浜嬩欢绯荤粺锛? * 5. ACK 纭鏈哄埗锛堣秴鏃跺鐞嗭級
 * 6. 杩炴帴鐘舵€佺鐞嗭紙璇︾粏鐨勭姸鎬佷俊鎭級
 * 7. 閿欒澶勭悊锛堝仴澹殑閿欒澶勭悊绛栫暐锛? * 8. 鎬ц兘浼樺寲锛堝唴瀛樹娇鐢ㄤ紭鍖栵級
 */

import { IM_WS_URL } from '../config/env';

// 鑷畾涔変簨浠跺彂灏勫櫒锛屽吋瀹规祻瑙堝櫒鐜
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
   * 鑾峰彇褰撳墠杩炴帴鐘舵€?   */
  get state(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 鏄惁宸茶繛鎺?   */
  get isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 鑾峰彇璇︾粏鐨勮繛鎺ヤ俊鎭?   */
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
   * 杩炴帴 WebSocket
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
   * 鏂紑杩炴帴
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.reconnectAttempts = this.config.reconnectAttempts; // 闃绘鑷姩閲嶈繛

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
   * 鍙戦€佹秷鎭?   */
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
      // 缂撳瓨鍒伴槦鍒楋紙甯︿紭鍏堢骇锛?      this.enqueueMessage(message);
      this.emit('messageQueued', message, this.messageQueue.length);

      if (requireAck && message.messageId) {
        return this.waitForAck(message.messageId);
      }

      return Promise.resolve();
    }
  }

  /**
   * 鍙戦€佹秷鎭苟绛夊緟纭
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
      // 璁剧疆瓒呮椂
      const timeoutTimer = window.setTimeout(() => {
        this.pendingAcks.delete(messageId);
        const error = new Error('Message acknowledgment timeout');
        this.emit('ackTimeout', messageId, error);
        reject(error);
      }, timeout);

      // 瀛樺偍 ACK 绛夊緟
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

      // 鍙戦€佹秷鎭?      if (this.isConnected) {
        this.doSend(message);
      } else {
        this.enqueueMessage(message);
      }
    });
  }

  /**
   * 纭娑堟伅鎺ユ敹
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
   * 娓呯悊杩囨湡娑堟伅
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
   * 娓呯┖娑堟伅闃熷垪
   */
  clearMessageQueue(): void {
    const clearedMessages = [...this.messageQueue];
    this.messageQueue = [];
    this.emit('messageQueueCleared', clearedMessages.length);
  }

  /**
   * 鑾峰彇娑堟伅闃熷垪鐘舵€?   */
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

  // ========== 绉佹湁鏂规硶 ==========

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.connectionState = 'connected';
    this.lastConnectedAt = Date.now();
    this.heartbeatStatus = 'healthy';
    this.lastHeartbeatTime = Date.now();
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('connected', this.connectionInfo);

    // 鍚姩蹇冭烦
    this.startHeartbeat();

    // 娓呯悊杩囨湡娑堟伅
    const expiredCount = this.cleanupExpiredMessages();
    if (expiredCount > 0) {
      this.emit('expiredMessagesCleaned', expiredCount);
    }

    // 鍒锋柊娑堟伅闃熷垪
    this.flushMessageQueue();

    // 鍚屾绂荤嚎娑堟伅
    this.emit('syncRequired');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;

      // 澶勭悊蹇冭烦鍝嶅簲
      if (data.event === 'pong') {
        this.handlePong();
        return;
      }

      // 澶勭悊 ACK
      if (data.event === 'message:ack' && data.payload?.messageId) {
        this.handleAck(data.payload as MessageAck);
        return;
      }

      // 瑙﹀彂浜嬩欢
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

    // 灏濊瘯閲嶈繛
    this.attemptReconnect();
  }

  private handleError(error: any): void {
    this.connectionState = 'error';
    this.heartbeatStatus = 'error';
    
    this.emit('stateChange', this.connectionState, this.connectionInfo);
    this.emit('error', error);
    this.emit('connectionError', error);

    // 灏濊瘯閲嶈繛
    this.attemptReconnect();
  }

  private handlePong(): void {
    // 娓呴櫎蹇冭烦瓒呮椂
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    // 鏇存柊蹇冭烦鐘舵€?    this.lastHeartbeatTime = Date.now();
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
        // 閲嶆柊鍔犲叆闃熷垪
        this.enqueueMessage(message);
      }
    } else {
      // 閲嶆柊鍔犲叆闃熷垪
      this.enqueueMessage(message);
    }
  }

  private enqueueMessage(message: WebSocketMessage): void {
    // 妫€鏌ラ槦鍒楀ぇ灏?    if (this.messageQueue.length >= this.config.messageQueueSize) {
      // 绉婚櫎鏈€鏃х殑浣庝紭鍏堢骇娑堟伅
      const lowPriorityIndex = this.messageQueue.findIndex(m => m.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        // 濡傛灉娌℃湁浣庝紭鍏堢骇娑堟伅锛岀Щ闄ゆ渶鏃х殑娑堟伅
        this.messageQueue.shift();
      }
      this.emit('messageQueueFull', this.config.messageQueueSize);
    }

    // 鎸変紭鍏堢骇鎻掑叆
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
    // 娓呯悊杩囨湡娑堟伅
    this.cleanupExpiredMessages();
    
    // 鎸変紭鍏堢骇鍙戦€?    const priorityOrder = { high: 0, normal: 1, low: 2 };
    this.messageQueue.sort((a, b) => {
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      return priorityA - priorityB;
    });

    // 鍙戦€佹秷鎭?    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];
    
    messagesToSend.forEach(message => {
      // 鍐嶆妫€鏌ユ槸鍚﹁繃鏈?      if (!message.expiryTime || message.expiryTime >= Date.now()) {
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
      
      // 妫€鏌ュ績璺崇姸鎬?      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 1.5) {
        this.heartbeatStatus = 'warning';
        this.emit('heartbeatWarning', timeSinceLastHeartbeat);
      }

      // 鍙戦€佸績璺?      this.send('ping', { 
        timestamp: now,
        sequence: Math.floor(now / this.config.heartbeatInterval)
      }, {
        priority: 'low',
        requireAck: false,
      });

      // 璁剧疆蹇冭烦瓒呮椂
      this.heartbeatTimeoutTimer = window.setTimeout(() => {
        this.heartbeatStatus = 'error';
        this.emit('heartbeatTimeout');
        this.emit('connectionError', new Error('Heartbeat timeout'));
        
        // 涓诲姩鍏抽棴杩炴帴浠ヨЕ鍙戦噸杩?        if (this.ws) {
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

    // 鎸囨暟閫€閬匡紝甯︽渶澶у欢杩熼檺鍒?    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    // 娣诲姞闅忔満鎶栧姩锛岄伩鍏嶉噸杩為鏆?    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
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

// 瀵煎嚭鍗曚緥瀹炰緥
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


