/**
 * IM服务层 - 标准化的即时通讯服务接口
 * 
 * 设计原则：
 * 1. 符合IM行业标准接口设计
 * 2. 隐藏底层协议实现细节（悟空IM等）
 * 3. 提供高内聚低耦合的消息操作接口
 * 4. 采用MediaResource标准定义
 * 5. 支持开闭原则，易于扩展新的协议实现
 */

import type { EventEmitter } from 'eventemitter3';
import {
  Message,
  MessageStatus,
  ReadReceipt,
  Conversation,
  ConversationType,
  OpenChatEvent,
  ErrorCode,
  OpenChatError,
  User,
  ConversationMember,
  QueryConversationsOptions,
  QueryMessagesOptions,
} from '../types';

import {
  AnyMediaResource,
  ImageMediaResource,
  AudioMediaResource,
  VideoMediaResource,
  FileMediaResource,
  LocationMediaResource,
  CardMediaResource,
  CustomMediaResource,
  CharacterMediaResource,
  MusicMediaResource,
  Model3DMediaResource,
  MediaResourceType,
  SendTextMessageParams,
  SendMediaMessageParams,
  SendCombinedMessageParams,
  SendCustomMessageParams,
} from '../types/message';

// ==================== IM服务配置 ====================

export interface IMServiceConfig {
  /** 用户ID */
  uid: string;
  /** 认证Token */
  token: string;
  /** IM服务器WebSocket地址 */
  serverUrl: string;
  /** 设备标识 */
  deviceId?: string;
  /** 设备类型 */
  deviceFlag?: number;
  /** 悟空IM应用ID */
  appId?: string;
  /** 悟空IM应用密钥 */
  appKey?: string;
  /** 第三方认证信息 */
  thirdPartyAuth?: {
    /** 认证类型 */
    type: string;
    /** 认证信息 */
    info: Record<string, any>;
  };
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 最大重连尝试次数 */
  reconnectMaxAttempts?: number;
  /** 重连延迟时间（毫秒） */
  reconnectDelay?: number;
}

// ==================== 会话操作参数 ====================

export interface CreateConversationParams {
  /** 目标ID */
  targetId: string;
  /** 会话类型 */
  type: ConversationType;
  /** 会话标题 */
  title?: string;
  /** 会话头像 */
  avatar?: string;
  /** 成员列表（群组会话） */
  members?: string[];
}

export interface UpdateConversationParams {
  conversationId: string;
  title?: string;
  avatar?: string;
  notice?: string;
}

// ==================== IM服务接口 ====================

export interface IIMService {
  // ==================== EventEmitter 方法 ====================
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  
  // ==================== 连接管理 ====================
  
  /**
   * 连接IM服务器
   */
  connect(config: IMServiceConfig): Promise<void>;
  
  /**
   * 断开连接
   */
  disconnect(): void;
  
  /**
   * 重新连接
   */
  reconnect(): Promise<void>;
  
  /**
   * 是否已连接
   */
  isConnected(): boolean;
  
  /**
   * 获取连接状态
   */
  getConnectionState(): ConnectionState;

  // ==================== 消息发送 - 优化版API（直接使用toUserId/groupId） ====================

  /**
   * 发送文本消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendText({
   *   toUserId: 'user-123',
   *   text: 'Hello, World!'
   * });
   *
   * // 发送到群组
   * await imService.sendText({
   *   groupId: 'group-456',
   *   text: '大家好!'
   * });
   * ```
   */
  sendText(params: SendTextMessageParams): Promise<Message>;

  /**
   * 发送图片消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendImage({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.image('https://example.com/image.jpg', {
   *     width: '1920',
   *     height: '1080'
   *   })
   * });
   *
   * // 发送到群组
   * await imService.sendImage({
   *   groupId: 'group-456',
   *   resource: ResourceBuilder.image('https://example.com/image.jpg')
   * });
   * ```
   */
  sendImage(params: SendMediaMessageParams<ImageMediaResource>): Promise<Message>;

  /**
   * 发送语音消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendAudio({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.audio('https://example.com/audio.mp3', '60')
   * });
   * ```
   */
  sendAudio(params: SendMediaMessageParams<AudioMediaResource>): Promise<Message>;

  /**
   * 发送视频消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendVideo({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.video('https://example.com/video.mp4', '120', {
   *     coverUrl: 'https://example.com/cover.jpg'
   *   })
   * });
   * ```
   */
  sendVideo(params: SendMediaMessageParams<VideoMediaResource>): Promise<Message>;

  /**
   * 发送文件消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendFile({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.file('https://example.com/file.pdf', 'document.pdf')
   * });
   * ```
   */
  sendFile(params: SendMediaMessageParams<FileMediaResource>): Promise<Message>;

  /**
   * 发送位置消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendLocation({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.location('39.9042', '116.4074', {
   *     locationName: '天安门广场',
   *     address: '北京市东城区'
   *   })
   * });
   * ```
   */
  sendLocation(params: SendMediaMessageParams<LocationMediaResource>): Promise<Message>;

  /**
   * 发送名片消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendCard({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.card('user', {
   *     title: '张三',
   *     description: '产品经理',
   *     imageUrl: 'https://example.com/avatar.jpg'
   *   })
   * });
   * ```
   */
  sendCard(params: SendMediaMessageParams<CardMediaResource>): Promise<Message>;

  /**
   * 发送数字人/角色消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendCharacter({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.character('avatar', {
   *     title: 'AI助手',
   *     personalityPrompt: '友好、专业的AI助手',
   *     avatarUrl: 'https://example.com/avatar.jpg'
   *   })
   * });
   * ```
   */
  sendCharacter(params: SendMediaMessageParams<CharacterMediaResource>): Promise<Message>;

  /**
   * 发送音乐消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendMusic({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.music('https://example.com/music.mp3', '180', {
   *     genre: 'pop',
   *     mood: 'happy'
   *   })
   * });
   * ```
   */
  sendMusic(params: SendMediaMessageParams<MusicMediaResource>): Promise<Message>;

  /**
   * 发送3D模型消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendModel3D({
   *   toUserId: 'user-123',
   *   resource: ResourceBuilder.model3d('https://example.com/model.glb', 'glb', {
   *     previewUrl: 'https://example.com/preview.jpg'
   *   })
   * });
   * ```
   */
  sendModel3D(params: SendMediaMessageParams<Model3DMediaResource>): Promise<Message>;

  /**
   * 发送自定义消息 - 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendCustom({
   *   toUserId: 'user-123',
   *   customType: 'order',
   *   data: { orderId: '123', status: 'paid' }
   * });
   * ```
   */
  sendCustom(params: SendCustomMessageParams): Promise<Message>;

  /**
   * 发送组合消息（支持多个资源）- 优化版API
   * @example
   * ```typescript
   * // 发送给单个用户
   * await imService.sendCombined({
   *   toUserId: 'user-123',
   *   resources: [
   *     ResourceBuilder.image('https://example.com/1.jpg'),
   *     ResourceBuilder.image('https://example.com/2.jpg')
   *   ],
   *   caption: '看看这些照片'
   * });
   * ```
   */
  sendCombined(params: SendCombinedMessageParams): Promise<Message>;
  
  /**
   * 转发消息
   */
  forwardMessage(messageId: string, targetId: string, conversationType: ConversationType): Promise<Message>;

  /**
   * 引用回复消息
   */
  replyMessage(messageId: string, replyToId: string, content: string, conversationType: ConversationType): Promise<Message>;

  /**
   * 翻译消息
   */
  translateMessage(messageId: string, targetLanguage: string): Promise<{ original: string; translated: string }>;

  // ==================== 消息操作 ====================
  
  /**
   * 撤回消息
   */
  recallMessage(messageId: string): Promise<boolean>;
  
  /**
   * 删除消息
   */
  deleteMessage(messageId: string): Promise<boolean>;
  
  /**
   * 获取消息详情
   */
  getMessage(messageId: string): Promise<Message | null>;
  
  /**
   * 获取消息列表
   */
  getMessageList(conversationId: string, options?: QueryMessagesOptions): Promise<Message[]>;
  
  /**
   * 搜索消息
   */
  searchMessages(keyword: string, conversationId?: string): Promise<Message[]>;
  
  /**
   * 标记消息已读
   */
  markMessageAsRead(messageId: string): Promise<void>;
  
  /**
   * 标记会话已读
   */
  markConversationAsRead(conversationId: string): Promise<void>;
  
  /**
   * 获取已读回执
   */
  getMessageReadReceipt(messageId: string): Promise<ReadReceipt[]>;

  // ==================== 会话管理 ====================
  
  /**
   * 创建会话
   */
  createConversation(params: CreateConversationParams): Promise<Conversation>;
  
  /**
   * 获取会话列表
   */
  getConversationList(options?: QueryConversationsOptions): Promise<Conversation[]>;
  
  /**
   * 获取会话详情
   */
  getConversation(conversationId: string): Promise<Conversation | null>;
  
  /**
   * 删除会话
   */
  deleteConversation(conversationId: string): Promise<void>;
  
  /**
   * 清空会话消息
   */
  clearConversationMessages(conversationId: string): Promise<void>;
  
  /**
   * 设置会话置顶
   */
  setConversationPinned(conversationId: string, isPinned: boolean): Promise<void>;
  
  /**
   * 设置会话免打扰
   */
  setConversationMuted(conversationId: string, isMuted: boolean): Promise<void>;
  
  /**
   * 设置会话草稿
   */
  setConversationDraft(conversationId: string, draft: string): Promise<void>;
  
  /**
   * 获取会话草稿
   */
  getConversationDraft(conversationId: string): Promise<string | null>;
  
  /**
   * 清空会话草稿
   */
  clearConversationDraft(conversationId: string): Promise<void>;
  
  /**
   * 获取会话成员
   */
  getConversationMembers(conversationId: string): Promise<ConversationMember[]>;

  // ==================== 同步 ====================
  
  /**
   * 同步消息
   */
  syncMessages(conversationId: string, options?: { startTime?: number; limit?: number }): Promise<Message[]>;
  
  /**
   * 同步会话
   */
  syncConversations(): Promise<Conversation[]>;
}

// ==================== 连接状态 ====================

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// ==================== IM服务事件 ====================

export enum IMServiceEvent {
  // 连接事件
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  CONNECTION_ERROR = 'connection_error',
  
  // 消息事件
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_FAILED = 'message_failed',
  MESSAGE_RECALLED = 'message_recalled',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_READ = 'message_read',
  
  // 会话事件
  CONVERSATION_CREATED = 'conversation_created',
  CONVERSATION_UPDATED = 'conversation_updated',
  CONVERSATION_DELETED = 'conversation_deleted',
  CONVERSATION_CLEARED = 'conversation_cleared',
  
  // 成员事件
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  MEMBER_UPDATED = 'member_updated',
  
  // 输入状态
  TYPING_STATUS = 'typing_status',
  
  // 错误
  ERROR = 'error',
}

// ==================== IM服务工厂 ====================

export interface IMServiceFactory {
  create(protocol: string): IIMService;
}

// ==================== 默认导出 ====================

export default IIMService;
