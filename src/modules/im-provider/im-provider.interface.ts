// 即时通讯Provider抽象接口定义
import { AnyMediaResource, ImageMediaResource, AudioMediaResource, VideoMediaResource, FileMediaResource } from './media-resource.interface';

// Provider配置接口
export interface IMProviderConfig {
  provider: string;
  endpoint: string; // API端点
  apiKey?: string; // API密钥
  apiSecret?: string; // API密钥
  appId?: string; // 应用ID
  timeout?: number; // 请求超时时间（毫秒）
  [key: string]: any; // 其他配置参数
}

// 卡片消息接口
export interface CardMessageContent {
  type: string; // 卡片类型，如 'miniprogram', 'article', 'product' 等
  title?: string; // 卡片标题
  description?: string; // 卡片描述
  imageUrl?: string; // 卡片图片
  url?: string; // 卡片链接
  appId?: string; // 小程序AppID
  pagePath?: string; // 小程序页面路径
  parameters?: Record<string, any>; // 卡片参数
  [key: string]: any; // 其他卡片属性
}

// 消息内容接口
export interface IMMessageContent {
  text?: string; // 文本内容
  image?: ImageMediaResource; // 图片内容
  audio?: AudioMediaResource; // 音频内容
  video?: VideoMediaResource; // 视频内容
  file?: FileMediaResource; // 文件内容
  card?: CardMessageContent; // 卡片消息内容（如小程序）
  custom?: Record<string, any>; // 自定义消息内容
  system?: any; // 系统消息内容
  [key: string]: any; // 其他类型内容
}

// 消息类型接口
export interface IMMessage {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom' | 'system';
  content: IMMessageContent; // 消息内容，结构化对象
  from: string; // 发送者ID
  to: string; // 接收者ID（用户ID或群组ID）
  roomId?: string; // 群组ID，用于群聊
  timestamp: number; // 消息时间戳
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  [key: string]: any; // 其他消息属性
}

// 用户信息接口
export interface IMUser {
  id: string;
  name?: string;
  avatar?: string | ImageMediaResource; // 头像，支持URL或结构化图片资源
  online?: boolean;
  lastSeen?: number;
  resources?: Record<string, AnyMediaResource>; // 用户相关的其他媒体资源
  [key: string]: any; // 其他用户属性
}

// 群组信息接口
export interface IMGroup {
  id: string;
  name: string;
  avatar?: string | ImageMediaResource; // 群头像，支持URL或结构化图片资源
  members: string[]; // 成员ID列表
  owner?: string; // 群主ID
  createdAt: number;
  resources?: Record<string, AnyMediaResource>; // 群组相关的其他媒体资源
  [key: string]: any; // 其他群组属性
}

// 连接状态接口
export interface IMConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  reason?: string; // 状态变更原因
  timestamp: number;
}

// 即时通讯Provider抽象接口
export interface IMProvider {
  // 获取Provider名称
  getProviderName(): string;
  
  // 初始化Provider
  initialize(config: IMProviderConfig): Promise<void>;
  
  // 发送消息
  sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;
  
  // 发送群消息
  sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;
  
  // 获取消息历史
  getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]>;
  
  // 获取群消息历史
  getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]>;
  
  // 标记消息已读
  markMessageAsRead(messageId: string): Promise<boolean>;
  
  // 标记所有消息已读
  markAllMessagesAsRead(conversationId: string): Promise<boolean>;
  
  // 创建用户
  createUser(user: Omit<IMUser, 'id'>): Promise<IMUser>;
  
  // 获取用户信息
  getUserInfo(userId: string): Promise<IMUser | null>;
  
  // 更新用户信息
  updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null>;
  
  // 创建群组
  createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup>;
  
  // 获取群组信息
  getGroupInfo(groupId: string): Promise<IMGroup | null>;
  
  // 更新群组信息
  updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null>;
  
  // 添加群成员
  addGroupMember(groupId: string, userId: string): Promise<boolean>;
  
  // 移除群成员
  removeGroupMember(groupId: string, userId: string): Promise<boolean>;
  
  // 加入群组
  joinGroup(groupId: string, userId: string): Promise<boolean>;
  
  // 离开群组
  leaveGroup(groupId: string, userId: string): Promise<boolean>;
  
  // 建立连接
  connect(userId: string, token?: string): Promise<IMConnectionStatus>;
  
  // 断开连接
  disconnect(): Promise<boolean>;
  
  // 订阅消息
  subscribeToMessages(callback: (message: IMMessage) => void): void;
  
  // 订阅连接状态
  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void;
  
  // 订阅用户状态
  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline') => void): void;
  
  // 生成认证令牌
  generateToken(userId: string, expiresIn?: number): Promise<string>;
  
  // 验证令牌
  validateToken(token: string): Promise<{ userId: string; valid: boolean }>;
  
  // 健康检查
  healthCheck(): Promise<boolean>;
}

// Provider工厂接口
export interface IMProviderFactory {
  // 注册Provider
  registerProvider(provider: string, providerClass: new () => IMProvider): void;
  
  // 创建Provider实例
  createProvider(provider: string): IMProvider;
  
  // 获取所有支持的Provider
  getSupportedProviders(): string[];
}

// Provider插件接口
export interface IMProviderPlugin {
  // 插件名称
  getName(): string;
  
  // 初始化插件
  initialize(provider: IMProvider): Promise<void>;
  
  // 销毁插件
  destroy(): Promise<void>;
  
  // 插件优先级
  getPriority(): number;
}

// 插件管理器接口
export interface IMProviderPluginManager {
  // 注册插件
  registerPlugin(plugin: IMProviderPlugin): void;
  
  // 初始化所有插件
  initializePlugins(provider: IMProvider): Promise<void>;
  
  // 销毁所有插件
  destroyPlugins(): Promise<void>;
  
  // 获取所有插件
  getPlugins(): IMProviderPlugin[];
}
