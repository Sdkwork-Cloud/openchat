// OpenChat SDK - Core Type Definitions
// 基础类型定义，与UI框架无关

import {
  RTCManagerConfig
} from '../rtc/types';

// ==================== 配置类型 ====================

/**
 * 服务端API配置
 */
export interface ServerConfig {
  /** OpenChat Server API地址 */
  baseUrl: string;
  /** API密钥（可选） */
  apiKey?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 缓存配置 */
  cache?: {
    /** 最大缓存大小 */
    maxSize?: number;
    /** 默认缓存TTL（毫秒） */
    defaultTTL?: number;
  };
}

/**
 * 悟空IM配置
 */
export interface WukongIMConfig {
  /** 悟空IM WebSocket地址 */
  wsUrl: string;
  /** 悟空IM API地址（可选，用于REST API调用） */
  apiUrl?: string;
  /** 设备标识 */
  deviceId?: string;
  /** 设备类型 */
  deviceFlag?: DeviceFlag;
  /** 悟空IM应用ID */
  appId?: string;
  /** 悟空IM应用密钥 */
  appKey?: string;
}

/**
 * 认证配置
 */
export interface AuthConfig {
  /** 用户ID */
  uid: string;
  /** 认证Token */
  token: string;
  /** 是否使用第三方认证系统 */
  useThirdPartyAuth?: boolean;
  /** 第三方认证配置 */
  thirdPartyAuth?: {
    /** 认证类型 */
    type: string;
    /** 认证信息 */
    info: Record<string, any>;
  };
}

export interface OpenChatSDKConfig {
  /** 服务端API配置 */
  server: ServerConfig;
  /** 悟空IM配置 */
  im: WukongIMConfig;
  /** 认证配置 */
  auth: AuthConfig;
  /** RTC配置 */
  rtc?: RTCManagerConfig;
  /** 是否启用调试日志 */
  debug?: boolean;
  /** 全局扩展字段 */
  extras?: Record<string, any>;
}

export enum DeviceFlag {
  APP = 1,
  WEB = 2,
  MINI_PROGRAM = 3,
}

// ==================== 用户类型 ====================

export interface User {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname?: string;
  /** 头像URL */
  avatar?: string;
  /** 在线状态 */
  status?: UserStatus;
  /** 最后在线时间 */
  lastSeenAt?: number;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 扩展字段 */
  extras?: Record<string, any>;
}

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  AWAY = 'away',
}

export interface UserInfo {
  user: User;
  token: string;
  expiresAt?: number;
}

// ==================== 消息类型 ====================

// 基础消息接口（完整定义在 ./message.ts）
export interface Message {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: MessageType;
  /** 消息内容 */
  content: any;
  /** 发送者ID */
  fromUid: string;
  /** 接收者ID（单聊） */
  toUid?: string;
  /** 频道ID（群聊） */
  channelId?: string;
  /** 频道类型 */
  channelType: ChannelType;
  /** 消息状态 */
  status: MessageStatus;
  /** 发送时间 */
  timestamp: number;
  /** 客户端序列号 */
  clientSeq?: number;
  /** 是否已读 */
  isRead?: boolean;
}

export enum MessageType {
  TEXT = 1,
  IMAGE = 2,
  AUDIO = 3,
  VIDEO = 4,
  FILE = 5,
  LOCATION = 6,
  CARD = 7,
  CUSTOM = 99,
}

export enum ChannelType {
  PERSON = 1,    // 单聊
  GROUP = 2,     // 群聊
  CUSTOMER = 3,  // 客服
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  RECALLED = 'recalled',
}

// 为了向后兼容，保留基础类型定义
export interface ImageContent {
  url: string;
  width?: number;
  height?: number;
  size?: number;
  thumbnail?: string;
}

export interface AudioContent {
  url: string;
  duration: number;
  size?: number;
  text?: string; // 语音转文字
}

export interface VideoContent {
  url: string;
  thumbnail?: string;
  duration: number;
  width?: number;
  height?: number;
  size?: number;
}

export interface FileContent {
  url: string;
  name: string;
  size: number;
  mimeType?: string;
}

export interface LocationContent {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

export interface CardContent {
  type: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  data?: Record<string, any>;
}

// ==================== 会话类型 ====================

export enum ConversationType {
  SINGLE = 'single',
  GROUP = 'group',
  CUSTOMER = 'customer',
}

export interface Conversation {
  /** 会话ID */
  id: string;
  /** 频道ID */
  channelId: string;
  /** 频道类型 */
  channelType: ChannelType;
  /** 会话类型 */
  type: ConversationType;
  /** 目标ID（用户ID或群组ID） */
  targetId: string;
  /** 会话名称 */
  name?: string;
  /** 头像 */
  avatar?: string;
  /** 最后一条消息 */
  lastMessage?: Message;
  /** 未读数 */
  unreadCount: number;
  /** 是否置顶 */
  isPinned: boolean;
  /** 是否免打扰 */
  isMuted: boolean;
  /** 最后更新时间 */
  updatedAt: number;
  /** 创建时间 */
  createdAt?: number;
  /** 扩展字段 */
  extras?: Record<string, any>;
}

export interface ConversationMember {
  /** 用户ID */
  userId: string;
  /** 角色 */
  role?: number;
  /** 加入时间 */
  joinTime?: number;
}

/**
 * 已读回执
 */
export interface ReadReceipt {
  /** 用户ID */
  userId: string;
  /** 已读时间戳 */
  timestamp: number;
}

// ==================== 好友类型 ====================

export interface Friend {
  /** 好友ID */
  uid: string;
  /** 好友信息 */
  user?: User;
  /** 备注名 */
  remark?: string;
  /** 状态 */
  status: FriendStatus;
  /** 添加时间 */
  createdAt: number;
  /** 扩展字段 */
  extras?: Record<string, any>;
}

export enum FriendStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

export interface FriendRequest {
  /** 请求ID */
  id: string;
  /** 发送者ID */
  fromUid: string;
  /** 接收者ID */
  toUid: string;
  /** 验证消息 */
  message?: string;
  /** 状态 */
  status: FriendRequestStatus;
  /** 创建时间 */
  createdAt: number;
}

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

// ==================== 群组类型 ====================

export interface Group {
  /** 群组ID */
  id: string;
  /** 群组名称 */
  name: string;
  /** 群组头像 */
  avatar?: string;
  /** 群组公告 */
  notice?: string;
  /** 群主ID */
  ownerUid: string;
  /** 成员数量 */
  memberCount: number;
  /** 最大成员数 */
  maxMembers: number;
  /** 群组类型 */
  type: GroupType;
  /** 创建时间 */
  createdAt: number;
  /** 扩展字段 */
  extras?: Record<string, any>;
}

export enum GroupType {
  NORMAL = 1,
  TEMP = 2,
}

export interface GroupMember {
  /** 群组ID */
  groupId: string;
  /** 用户ID */
  uid: string;
  /** 用户信息 */
  user?: User;
  /** 角色 */
  role: GroupRole;
  /** 群昵称 */
  groupNickname?: string;
  /** 加入时间 */
  joinedAt: number;
}

export enum GroupRole {
  OWNER = 1,
  ADMIN = 2,
  MEMBER = 3,
}

// ==================== 联系人类型 ====================

export interface Contact {
  /** 联系人ID */
  id: string;
  /** 用户ID */
  uid: string;
  /** 类型 */
  type: ContactType;
  /** 名称 */
  name?: string;
  /** 备注 */
  remark?: string;
  /** 标签 */
  tags?: string[];
  /** 是否收藏 */
  isFavorite: boolean;
  /** 最后联系时间 */
  lastContactAt?: number;
}

export enum ContactType {
  USER = 'user',
  GROUP = 'group',
}

// ==================== 事件类型 ====================

export enum OpenChatEvent {
  // 连接事件
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  RECONNECTED = 'reconnected',
  
  // 消息事件
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_FAILED = 'message_failed',
  MESSAGE_READ = 'message_read',
  MESSAGE_RECALLED = 'message_recalled',
  
  // 用户事件
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  USER_INFO_UPDATED = 'user_info_updated',
  
  // 好友事件
  FRIEND_REQUEST_RECEIVED = 'friend_request_received',
  FRIEND_ADDED = 'friend_added',
  FRIEND_REMOVED = 'friend_removed',
  FRIEND_BLOCKED = 'friend_blocked',
  
  // 群组事件
  GROUP_INVITATION_RECEIVED = 'group_invitation_received',
  GROUP_MEMBER_ADDED = 'group_member_added',
  GROUP_MEMBER_REMOVED = 'group_member_removed',
  GROUP_INFO_UPDATED = 'group_info_updated',
  
  // 会话事件
  CONVERSATION_UPDATED = 'conversation_updated',
  CONVERSATION_DELETED = 'conversation_deleted',
  
  // 错误事件
  ERROR = 'error',
}

// ==================== 错误类型 ====================

export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 1000,
  NETWORK_ERROR = 1001,
  TIMEOUT_ERROR = 1002,
  INVALID_PARAM = 1003,
  
  // 认证错误
  AUTH_FAILED = 1100,
  TOKEN_EXPIRED = 1101,
  TOKEN_INVALID = 1102,
  
  // 用户错误
  USER_NOT_FOUND = 1200,
  USER_ALREADY_EXISTS = 1201,
  
  // 消息错误
  MESSAGE_SEND_FAILED = 1300,
  MESSAGE_NOT_FOUND = 1301,
  
  // 好友错误
  FRIEND_NOT_FOUND = 1400,
  FRIEND_ALREADY_EXISTS = 1401,
  
  // 群组错误
  GROUP_NOT_FOUND = 1500,
  GROUP_ALREADY_EXISTS = 1501,
  GROUP_PERMISSION_DENIED = 1502,
  
  // IM连接错误
  IM_CONNECT_FAILED = 2000,
  IM_DISCONNECTED = 2001,
  
  // RTC错误
  RTC_NOT_INITIALIZED = 2100,
  RTC_CONNECT_FAILED = 2101,
  RTC_CALL_FAILED = 2102,
}

export interface OpenChatError extends Error {
  code: ErrorCode;
  data?: any;
}

export class OpenChatError extends Error {
  code: ErrorCode;
  data?: any;

  constructor(code: ErrorCode, message: string, data?: any) {
    super(message);
    this.name = 'OpenChatError';
    this.code = code;
    this.data = data;
  }
}

// ==================== 选项类型 ====================

export interface SendMessageOptions {
  /** 是否持久化 */
  persist?: boolean;
  /** 是否需要回执 */
  receipt?: boolean;
  /** 超时时间 */
  timeout?: number;
}

export interface QueryMessagesOptions {
  /** 起始消息ID */
  startMessageId?: string;
  /** 结束消息ID */
  endMessageId?: string;
  /** 查询数量 */
  limit?: number;
  /** 是否倒序 */
  reverse?: boolean;
}

export interface QueryConversationsOptions {
  /** 会话类型过滤 */
  channelType?: ChannelType;
  /** 是否包含置顶 */
  includePinned?: boolean;
  /** 查询数量 */
  limit?: number;
}

// ==================== 回调类型 ====================

export type EventCallback<T = any> = (data: T) => void;

export type MessageCallback = EventCallback<Message>;
export type UserCallback = EventCallback<User>;
export type ErrorCallback = EventCallback<OpenChatError>;
export type ConnectionCallback = EventCallback<{ uid: string }>;
export type DisconnectionCallback = EventCallback<{ code: number; reason: string }>;
