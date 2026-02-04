// OpenChat SDK - IM Protocol Layer
// 封装悟空IM EasySDK，提供统一的即时通讯协议接口

import {
  OpenChatSDKConfig,
  Message,
  MessageType,
  ChannelType,
  MessageStatus,
  OpenChatEvent,
  ErrorCode,
  OpenChatError,
  EventCallback,
} from '../types';

// 悟空IM EasySDK 类型定义（参考文档）
interface WKIMConfig {
  uid: string;
  token: string;
  deviceId?: string;
  deviceFlag?: number;
}

interface WKIMMessage {
  messageId: string;
  messageType: number;
  content: any;
  fromUid: string;
  toUid?: string;
  channelId?: string;
  channelType: number;
  timestamp: number;
  clientSeq?: number;
}

// IM协议接口
export interface IMProtocol {
  // 连接管理
  connect(config: WKIMConfig): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  isConnected(): boolean;
  
  // 消息发送
  sendMessage(message: Partial<Message>): Promise<Message>;
  sendTextMessage(channelId: string, channelType: ChannelType, text: string): Promise<Message>;
  sendImageMessage(channelId: string, channelType: ChannelType, imageUrl: string): Promise<Message>;
  sendAudioMessage(channelId: string, channelType: ChannelType, audioUrl: string, duration: number): Promise<Message>;
  sendVideoMessage(channelId: string, channelType: ChannelType, videoUrl: string, duration: number): Promise<Message>;
  sendFileMessage(channelId: string, channelType: ChannelType, fileUrl: string, fileName: string, fileSize: number): Promise<Message>;
  sendCustomMessage(channelId: string, channelType: ChannelType, customData: any): Promise<Message>;
  
  // 消息操作
  recallMessage(messageId: string): Promise<boolean>;
  deleteMessage(messageId: string): Promise<boolean>;
  
  // 事件监听
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
  
  // 同步消息
  syncMessages(channelId: string, channelType: ChannelType, options?: { startSeq?: number; limit?: number }): Promise<Message[]>;
}

// 悟空IM协议实现
export class WukongIMProtocol implements IMProtocol {
  private wkim: any = null;
  private config: OpenChatSDKConfig | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private connected: boolean = false;
  private messageQueue: Partial<Message>[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: any = null;

  constructor() {}

  // 连接IM服务器
  async connect(config: WKIMConfig): Promise<void> {
    try {
      // 动态导入悟空IM SDK
      const { WKIM, WKIMEvent } = await this.loadWKIMSDK();
      
      // 初始化WKIM
      // 注意：这里的config参数已经是WKIMConfig类型，包含了所需的所有信息
      this.wkim = WKIM.init('ws://localhost:3000/ws', {
        uid: config.uid,
        token: config.token,
        deviceId: config.deviceId,
        deviceFlag: config.deviceFlag || 2,
      });

      // 绑定事件
      this.bindEvents(WKIMEvent);
      
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // 发送队列中的消息
      this.flushMessageQueue();
      
    } catch (error) {
      this.emit(OpenChatEvent.ERROR, this.createError(ErrorCode.IM_CONNECT_FAILED, 'Failed to connect to IM server', error));
      throw error;
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.wkim) {
      this.wkim.disconnect();
      this.wkim = null;
    }
    this.connected = false;
    this.clearReconnectTimer();
  }

  // 重新连接
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit(OpenChatEvent.ERROR, this.createError(ErrorCode.IM_CONNECT_FAILED, 'Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    this.emit(OpenChatEvent.RECONNECTING, { attempt: this.reconnectAttempts });

    try {
      // 实现重连逻辑
      await this.delay(1000 * this.reconnectAttempts);
      // 重新连接...
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  // 是否已连接
  isConnected(): boolean {
    return this.connected && this.wkim !== null;
  }

  // 发送消息
  async sendMessage(message: Partial<Message>): Promise<Message> {
    if (!this.isConnected()) {
      // 添加到队列，等待连接后发送
      this.messageQueue.push(message);
      throw this.createError(ErrorCode.IM_DISCONNECTED, 'IM not connected, message queued');
    }

    try {
      const wkMessage = this.convertToWKMessage(message);
      const result = await this.wkim.sendMessage(wkMessage);
      
      const sentMessage = this.convertFromWKMessage(result);
      this.emit(OpenChatEvent.MESSAGE_SENT, sentMessage);
      
      return sentMessage;
    } catch (error) {
      this.emit(OpenChatEvent.MESSAGE_FAILED, { message, error });
      throw this.createError(ErrorCode.MESSAGE_SEND_FAILED, 'Failed to send message', error);
    }
  }

  // 发送文本消息
  async sendTextMessage(channelId: string, channelType: ChannelType, text: string): Promise<Message> {
    return this.sendMessage({
      channelId,
      channelType,
      type: MessageType.TEXT,
      content: { text },
    });
  }

  // 发送图片消息
  async sendImageMessage(channelId: string, channelType: ChannelType, imageUrl: string): Promise<Message> {
    return this.sendMessage({
      channelId,
      channelType,
      type: MessageType.IMAGE,
      content: { image: { url: imageUrl } },
    });
  }

  // 发送语音消息
  async sendAudioMessage(channelId: string, channelType: ChannelType, audioUrl: string, duration: number): Promise<Message> {
    return this.sendMessage({
      channelId,
      channelType,
      type: MessageType.AUDIO,
      content: { audio: { url: audioUrl, duration } },
    });
  }

  // 发送视频消息
  async sendVideoMessage(channelId: string, channelType: ChannelType, videoUrl: string, duration: number): Promise<Message> {
    return this.sendMessage({
      channelId,
      channelType,
      type: MessageType.VIDEO,
      content: { video: { url: videoUrl, duration } },
    });
  }

  // 发送文件消息
  async sendFileMessage(channelId: string, channelType: ChannelType, fileUrl: string, fileName: string, fileSize: number): Promise<Message> {
    return this.sendMessage({
      channelId,
      channelType,
      type: MessageType.FILE,
      content: { file: { url: fileUrl, name: fileName, size: fileSize } },
    });
  }

  // 发送自定义消息
  async sendCustomMessage(channelId: string, channelType: ChannelType, customData: any): Promise<Message> {
    return this.sendMessage({
      channelId,
      channelType,
      type: MessageType.CUSTOM,
      content: { custom: customData },
    });
  }

  // 撤回消息
  async recallMessage(messageId: string): Promise<boolean> {
    if (!this.wkim) return false;
    
    try {
      await this.wkim.recallMessage(messageId);
      this.emit(OpenChatEvent.MESSAGE_RECALLED, { messageId });
      return true;
    } catch (error) {
      return false;
    }
  }

  // 删除消息
  async deleteMessage(messageId: string): Promise<boolean> {
    if (!this.wkim) return false;
    
    try {
      await this.wkim.deleteMessage(messageId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 事件监听
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  // 取消事件监听
  off(event: string, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  // 同步消息
  async syncMessages(channelId: string, channelType: ChannelType, options?: { startSeq?: number; limit?: number }): Promise<Message[]> {
    if (!this.wkim) return [];
    
    try {
      const messages = await this.wkim.syncMessages({
        channelId,
        channelType: this.convertChannelType(channelType),
        ...options,
      });
      
      return messages.map((msg: WKIMMessage) => this.convertFromWKMessage(msg));
    } catch (error) {
      return [];
    }
  }

  // ==================== 私有方法 ====================

  // 加载悟空IM SDK
  private async loadWKIMSDK(): Promise<any> {
    // 浏览器环境
    if (typeof window !== 'undefined') {
      if ((window as any).EasyJSSDK) {
        return (window as any).EasyJSSDK;
      }
      // 动态加载CDN
      await this.loadScript('https://unpkg.com/easyjssdk@latest/dist/easyjssdk.min.js');
      return (window as any).EasyJSSDK;
    }
    
    // Node.js环境
    try {
      // 尝试CommonJS导入
      if (typeof require === 'function') {
        return require('easyjssdk');
      }
    } catch (error) {
      console.error('Failed to load easyjssdk:', error);
    }

    throw new Error('EasyJSSDK is not available in this environment');

  }

  // 加载脚本
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  // 绑定事件
  private bindEvents(WKIMEvent: any): void {
    if (!this.wkim) return;

    // 连接成功
    this.wkim.on(WKIMEvent.Connect, (result: any) => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit(OpenChatEvent.CONNECTED, result);
    });

    // 连接断开
    this.wkim.on(WKIMEvent.Disconnect, (info: any) => {
      this.connected = false;
      this.emit(OpenChatEvent.DISCONNECTED, info);
      this.scheduleReconnect();
    });

    // 收到消息
    this.wkim.on(WKIMEvent.Message, (wkMessage: WKIMMessage) => {
      const message = this.convertFromWKMessage(wkMessage);
      this.emit(OpenChatEvent.MESSAGE_RECEIVED, message);
    });

    // 错误
    this.wkim.on(WKIMEvent.Error, (error: any) => {
      this.emit(OpenChatEvent.ERROR, this.createError(ErrorCode.UNKNOWN_ERROR, 'IM Error', error));
    });
  }

  // 触发事件
  private emit(event: string, data?: any): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // 转换消息格式（OpenChat -> WKIM）
  private convertToWKMessage(message: Partial<Message>): any {
    return {
      messageType: message.type,
      content: message.content,
      channelId: message.channelId,
      channelType: this.convertChannelType(message.channelType || ChannelType.PERSON),
      clientSeq: message.clientSeq,
    };
  }

  // 转换消息格式（WKIM -> OpenChat）
  private convertFromWKMessage(wkMessage: WKIMMessage): Message {
    return {
      id: wkMessage.messageId,
      type: wkMessage.messageType as MessageType,
      content: wkMessage.content,
      fromUid: wkMessage.fromUid,
      toUid: wkMessage.toUid,
      channelId: wkMessage.channelId,
      channelType: this.parseChannelType(wkMessage.channelType),
      status: MessageStatus.SENT,
      timestamp: wkMessage.timestamp,
      clientSeq: wkMessage.clientSeq,
      isRead: false,
    };
  }

  // 转换频道类型
  private convertChannelType(channelType: ChannelType): number {
    switch (channelType) {
      case ChannelType.PERSON: return 1;
      case ChannelType.GROUP: return 2;
      case ChannelType.CUSTOMER: return 3;
      default: return 1;
    }
  }

  // 解析频道类型
  private parseChannelType(channelType: number): ChannelType {
    switch (channelType) {
      case 1: return ChannelType.PERSON;
      case 2: return ChannelType.GROUP;
      case 3: return ChannelType.CUSTOMER;
      default: return ChannelType.PERSON;
    }
  }

  // 发送队列中的消息
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message).catch(() => {
          // 发送失败，重新放回队列
          this.messageQueue.unshift(message);
        });
      }
    }
  }

  // 计划重连
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnect();
    }, 3000);
  }

  // 清除重连定时器
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // 延迟
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 创建错误
  private createError(code: ErrorCode, message: string, data?: any): OpenChatError {
    const error = new Error(message) as OpenChatError;
    error.code = code;
    error.data = data;
    return error;
  }
}

// 协议工厂
export class IMProtocolFactory {
  static create(protocol: 'wukong' = 'wukong'): IMProtocol {
    switch (protocol) {
      case 'wukong':
      default:
        return new WukongIMProtocol();
    }
  }
}
