/**
 * OpenChat SDK - Main Client
 * 
 * 设计原则：
 * 1. 统一连接管理，用户只需调用client.init()即可连接所有服务
 * 2. 提供client.im.messages.xxx、client.im.contacts.xxx和client.auth.xxx的简洁接口
 * 3. 隐藏底层实现细节（悟空IM、火山引擎等）
 * 4. 符合开闭原则，易于扩展
 * 5. 严格遵循OpenAPI 3.x标准
 * 
 * 使用示例：
 * ```typescript
 * const client = new OpenChatClient(config);
 * await client.init(); // 一键连接所有服务
 * 
 * // 发送消息
 * await client.im.messages.sendText({ targetId: 'user1', content: 'Hello' });
 * 
 * // 管理联系人
 * await client.im.contacts.add('user1');
 * 
 * // 登录
 * await client.auth.login({ username: 'user', password: 'pass' });
 * ```
 */

import { EventEmitter } from 'eventemitter3';
import {
  OpenChatSDKConfig,
  OpenChatEvent,
  ErrorCode,
  OpenChatError,
  EventCallback,
  User,
  UserInfo,
  Message,
  Conversation,
  ConversationType,
  Friend,
  FriendRequest,
  Group,
  GroupMember,
  Contact,
  SendMessageOptions,
  QueryMessagesOptions,
  QueryConversationsOptions,
  DeviceFlag,
  ServerConfig,
  WukongIMConfig,
  AuthConfig,
} from './types';

import {
  ResourceBuilder,
  ImageResource,
  AudioResource,
  VideoResource,
  FileResource,
  LocationResource,
  CardResource,
  CustomResource,
  MessageResource,
  SendTextMessageParams,
  SendMediaMessageParams,
  SendCombinedMessageParams,
  SendCustomMessageParams,
} from './types/message';

import { ApiService } from './services/api-service';
import { WukongIMService } from './services/im-service-wukong';
import { RTCManager } from './rtc/rtc-manager';
import { RTCProviderType, RTCManagerConfig } from './rtc/types';

// SDK配置默认值
const DEFAULT_SERVER_CONFIG: Partial<ServerConfig> = {
  timeout: 30000,
  maxRetries: 3,
  headers: {},
};

const DEFAULT_IM_CONFIG: Partial<WukongIMConfig> = {
  deviceFlag: DeviceFlag.WEB,
};

const DEFAULT_AUTH_CONFIG: Partial<AuthConfig> = {
  useThirdPartyAuth: false,
};

const DEFAULT_CONFIG: Partial<OpenChatSDKConfig> = {
  debug: false,
  extras: {},
};

export class OpenChatClient extends EventEmitter {
  // 配置
  private config: OpenChatSDKConfig;

  // 服务层
  private apiService: ApiService;
  private imService: WukongIMService;
  private rtcManager: RTCManager | null = null;

  // 状态
  private initialized: boolean = false;
  private currentUser: User | null = null;

  // 模块
  public readonly auth: AuthModule;
  public readonly im: IMModule;
  public readonly rtc: RTCModule;
  public readonly api: ApiServiceAccessor;

  constructor(config: OpenChatSDKConfig) {
    super();
    // 合并默认配置
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      server: {
        ...DEFAULT_SERVER_CONFIG,
        ...config.server,
      },
      im: {
        ...DEFAULT_IM_CONFIG,
        ...config.im,
      },
      auth: {
        ...DEFAULT_AUTH_CONFIG,
        ...config.auth,
      },
    } as OpenChatSDKConfig;

    // 初始化服务
    this.apiService = new ApiService(this.config);
    this.imService = new WukongIMService();

    // 初始化模块
    this.auth = new AuthModule(this);
    this.im = new IMModule(this);
    this.rtc = new RTCModule(this);
    this.api = new ApiServiceAccessor(this);

    // 绑定IM事件
    this.bindIMEvents();
  }

  // ==================== 初始化与连接 ====================

  /**
   * 初始化SDK并连接所有服务
   * 一键连接IM服务器和API服务
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.warn('OpenChatClient already initialized');
      return;
    }

    try {
      // 获取当前用户信息
      this.currentUser = await this.apiService.getCurrentUser();

      // 连接IM服务器（内部封装，用户无感知）
      await this.imService.connect({
        uid: this.config.auth.uid,
        token: this.config.auth.token,
        serverUrl: this.config.im.wsUrl,
        deviceId: this.config.im.deviceId,
        deviceFlag: this.config.im.deviceFlag,
        appId: this.config.im.appId,
        appKey: this.config.im.appKey,
        autoReconnect: true,
        reconnectMaxAttempts: this.config.server.maxRetries || 5,
        reconnectDelay: 1000,
      });

      this.initialized = true;
      this.emit(OpenChatEvent.CONNECTED, { uid: this.config.auth.uid });

    } catch (error) {
      const openChatError = error instanceof OpenChatError 
        ? error 
        : new OpenChatError(ErrorCode.NETWORK_ERROR, 'Initialization failed', error);
      this.emit(OpenChatEvent.ERROR, openChatError);
      throw openChatError;
    }
  }

  /**
   * 使用第三方认证初始化
   * @param thirdPartyAuth 第三方认证信息
   */
  async initWithThirdPartyAuth(thirdPartyAuth: {
    type: string;
    info: Record<string, any>;
  }): Promise<void> {
    if (this.initialized) {
      console.warn('OpenChatClient already initialized');
      return;
    }

    try {
      // 更新认证配置
      this.config.auth.useThirdPartyAuth = true;
      this.config.auth.thirdPartyAuth = thirdPartyAuth;

      // 连接IM服务器
      await this.imService.connect({
        uid: this.config.auth.uid,
        token: this.config.auth.token,
        serverUrl: this.config.im.wsUrl,
        deviceId: this.config.im.deviceId,
        deviceFlag: this.config.im.deviceFlag,
        appId: this.config.im.appId,
        appKey: this.config.im.appKey,
        thirdPartyAuth,
      });

      this.initialized = true;
      this.emit(OpenChatEvent.CONNECTED, { uid: this.config.auth.uid });

    } catch (error) {
      this.emit(OpenChatEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * 断开连接并清理资源
   */
  destroy(): void {
    // 销毁RTC
    if (this.rtcManager) {
      this.rtcManager.destroy();
      this.rtcManager = null;
    }

    // 断开IM连接
    this.imService.disconnect();

    this.initialized = false;
    this.currentUser = null;
    this.removeAllListeners();
  }

  /**
   * 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.initialized && this.imService.isConnected();
  }

  // ==================== 内部方法 ====================

  private bindIMEvents(): void {
    // 连接成功
    this.imService.on('connected', (data) => {
      this.emit(OpenChatEvent.CONNECTED, data);
    });

    // 连接断开
    this.imService.on('disconnected', (data) => {
      this.emit(OpenChatEvent.DISCONNECTED, data);
    });

    // 收到消息
    this.imService.on('message_received', (message: Message) => {
      this.emit(OpenChatEvent.MESSAGE_RECEIVED, message);
    });

    // 消息发送成功
    this.imService.on('message_sent', (message: Message) => {
      this.emit(OpenChatEvent.MESSAGE_SENT, message);
    });

    // 错误
    this.imService.on('error', (error) => {
      this.emit(OpenChatEvent.ERROR, error);
    });
  }

  // ==================== Getters ====================

  getConfig(): OpenChatSDKConfig {
    return this.config;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  getApiService(): ApiService {
    return this.apiService;
  }

  getIMService(): WukongIMService {
    return this.imService;
  }

  getRTCManager(): RTCManager | null {
    return this.rtcManager;
  }

  setRTCManager(rtcManager: RTCManager): void {
    this.rtcManager = rtcManager;
  }

  setToken(token: string): void {
    this.config.auth.token = token;
    this.apiService.setToken(token);
  }

  /**
   * 获取服务端API配置
   */
  getServerConfig(): ServerConfig {
    return this.config.server;
  }

  /**
   * 获取悟空IM配置
   */
  getIMConfig(): WukongIMConfig {
    return this.config.im;
  }

  /**
   * 获取认证配置
   */
  getAuthConfig(): AuthConfig {
    return this.config.auth;
  }

  /**
   * 更新认证配置
   */
  updateAuthConfig(authConfig: Partial<AuthConfig>): void {
    this.config.auth = {
      ...this.config.auth,
      ...authConfig,
    };
  }

  /**
   * 更新服务端API配置
   */
  updateServerConfig(serverConfig: Partial<ServerConfig>): void {
    this.config.server = {
      ...this.config.server,
      ...serverConfig,
    };
  }

  /**
   * 更新悟空IM配置
   */
  updateIMConfig(imConfig: Partial<WukongIMConfig>): void {
    this.config.im = {
      ...this.config.im,
      ...imConfig,
    };
  }
}

/**
 * 认证模块
 */
class AuthModule {
  private client: OpenChatClient;

  constructor(client: OpenChatClient) {
    this.client = client;
  }

  /**
   * 登录
   * @param credentials 登录凭证
   */
  async login(credentials: { username: string; password: string }): Promise<UserInfo> {
    const { username, password } = credentials;
    const userInfo = await this.client.getApiService().login(username, password);
    this.client.setCurrentUser(userInfo.user);
    this.client.setToken(userInfo.token);
    
    if (userInfo.imConfig) {
      const config = this.client.getConfig();
      config.im.wsUrl = userInfo.imConfig.wsUrl;
      config.auth.uid = userInfo.imConfig.uid;
      config.auth.token = userInfo.imConfig.token;
    }
    
    await this.client.init();
    return userInfo;
  }

  /**
   * 注册
   * @param userInfo 用户信息
   */
  async register(userInfo: { username: string; password: string; nickname?: string; email?: string; phone?: string }): Promise<UserInfo> {
    const { username, password, ...options } = userInfo;
    const result = await this.client.getApiService().register(username, password, options);
    this.client.setCurrentUser(result.user);
    this.client.setToken(result.token);
    
    if (result.imConfig) {
      const config = this.client.getConfig();
      config.im.wsUrl = result.imConfig.wsUrl;
      config.auth.uid = result.imConfig.uid;
      config.auth.token = result.imConfig.token;
    }
    
    return result;
  }

  /**
   * 登出
   */
  async logout(refreshToken?: string): Promise<void> {
    await this.client.getApiService().logout(refreshToken);
    this.client.destroy();
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken?: string): Promise<string> {
    const userInfo = await this.client.getApiService().refreshToken(refreshToken);
    this.client.setToken(userInfo.token);
    return userInfo.token;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return this.client.getCurrentUser();
  }

  /**
   * 验证令牌
   * @param token 令牌
   */
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    return this.client.getApiService().validateToken(token);
  }
}

/**
 * IM模块
 */
class IMModule {
  private client: OpenChatClient;
  
  public readonly messages: MessagesModule;
  public readonly contacts: ContactsModule;
  public readonly conversations: ConversationsModule;
  public readonly groups: GroupsModule;

  constructor(client: OpenChatClient) {
    this.client = client;
    this.messages = new MessagesModule(client);
    this.contacts = new ContactsModule(client);
    this.conversations = new ConversationsModule(client);
    this.groups = new GroupsModule(client);
  }

  /**
   * 是否连接
   */
  isConnected(): boolean {
    return this.client.getIMService().isConnected();
  }

  /**
   * 获取连接状态
   */
  getConnectionState() {
    return this.client.getIMService().getConnectionState();
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    const config = this.client.getConfig();
    await this.client.getIMService().connect({
      uid: config.auth.uid,
      token: config.auth.token,
      serverUrl: config.im.wsUrl,
      deviceId: config.im.deviceId,
      deviceFlag: config.im.deviceFlag,
      appId: config.im.appId,
      appKey: config.im.appKey,
    });
  }
}

/**
 * 消息模块
 */
class MessagesModule {
  private client: OpenChatClient;

  constructor(client: OpenChatClient) {
    this.client = client;
  }

  /**
   * 发送文本消息
   * @example
   * ```typescript
   * await client.im.messages.sendText({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   text: 'Hello, World!'
   * });
   * ```
   */
  async sendText(params: any): Promise<Message> {
    return this.client.getIMService().sendText(params);
  }

  /**
   * 发送图片消息
   * @example
   * ```typescript
   * await client.im.messages.sendImage({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   resource: ResourceBuilder.image('https://example.com/image.jpg', {
   *     width: 1920,
   *     height: 1080
   *   })
   * });
   * ```
   */
  async sendImage(params: any): Promise<Message> {
    return this.client.getIMService().sendImage(params);
  }

  /**
   * 发送语音消息
   * @example
   * ```typescript
   * await client.im.messages.sendAudio({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   resource: ResourceBuilder.audio('https://example.com/audio.mp3', 60)
   * });
   * ```
   */
  async sendAudio(params: any): Promise<Message> {
    return this.client.getIMService().sendAudio(params);
  }

  /**
   * 发送视频消息
   * @example
   * ```typescript
   * await client.im.messages.sendVideo({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   resource: ResourceBuilder.video('https://example.com/video.mp4', 120, {
   *     coverUrl: 'https://example.com/cover.jpg'
   *   })
   * });
   * ```
   */
  async sendVideo(params: any): Promise<Message> {
    return this.client.getIMService().sendVideo(params);
  }

  /**
   * 发送文件消息
   * @example
   * ```typescript
   * await client.im.messages.sendFile({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   resource: ResourceBuilder.file('https://example.com/file.pdf', 'document.pdf')
   * });
   * ```
   */
  async sendFile(params: any): Promise<Message> {
    return this.client.getIMService().sendFile(params);
  }

  /**
   * 发送位置消息
   * @example
   * ```typescript
   * await client.im.messages.sendLocation({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   resource: ResourceBuilder.location(39.9042, 116.4074, {
   *     name: '天安门广场',
   *     address: '北京市东城区'
   *   })
   * });
   * ```
   */
  async sendLocation(params: any): Promise<Message> {
    return this.client.getIMService().sendLocation(params);
  }

  /**
   * 发送名片消息
   * @example
   * ```typescript
   * await client.im.messages.sendCard({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   resource: ResourceBuilder.card('user', {
   *     title: '张三',
   *     description: '产品经理',
   *     imageUrl: 'https://example.com/avatar.jpg'
   *   })
   * });
   * ```
   */
  async sendCard(params: any): Promise<Message> {
    return this.client.getIMService().sendCard(params);
  }

  /**
   * 发送自定义消息
   * @example
   * ```typescript
   * await client.im.messages.sendCustom({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   customType: 'order',
   *   data: { orderId: '123', status: 'paid' }
   * });
   * ```
   */
  async sendCustom(params: any): Promise<Message> {
    return this.client.getIMService().sendCustom(params);
  }

  /**
   * 发送组合消息（支持多个资源）
   * @example
   * ```typescript
   * await client.im.messages.sendCombined({
   *   targetId: 'user-123',
   *   conversationType: ConversationType.SINGLE,
   *   resources: [
   *     ResourceBuilder.image('https://example.com/1.jpg'),
   *     ResourceBuilder.image('https://example.com/2.jpg')
   *   ],
   *   caption: '看看这些照片'
   * });
   * ```
   */
  async sendCombined(params: any): Promise<Message> {
    return this.client.getIMService().sendCombined(params);
  }

  /**
   * 撤回消息
   * @param messageId 消息ID
   */
  async recallMessage(messageId: string): Promise<boolean> {
    return this.client.getIMService().recallMessage(messageId);
  }

  /**
   * 删除消息
   * @param messageId 消息ID
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    return this.client.getIMService().deleteMessage(messageId);
  }

  /**
   * 获取消息
   * @param messageId 消息ID
   */
  async getMessage(messageId: string): Promise<Message | null> {
    return this.client.getIMService().getMessage(messageId);
  }

  /**
   * 获取消息列表
   * @param conversationId 会话ID
   * @param options 查询选项
   */
  async getMessageList(conversationId: string, options?: QueryMessagesOptions): Promise<Message[]> {
    return this.client.getIMService().getMessageList(conversationId, options);
  }

  /**
   * 搜索消息
   * @param keyword 关键词
   * @param conversationId 会话ID（可选）
   */
  async searchMessages(keyword: string, conversationId?: string): Promise<Message[]> {
    return this.client.getIMService().searchMessages(keyword, conversationId);
  }

  /**
   * 标记消息已读
   * @param messageId 消息ID
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    return this.client.getIMService().markMessageAsRead(messageId);
  }

  /**
   * 标记会话已读
   * @param conversationId 会话ID
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    return this.client.getIMService().markConversationAsRead(conversationId);
  }

  /**
   * 引用回复消息
   * @param messageId 消息ID
   * @param replyToId 被回复的消息ID
   * @param content 回复内容
   * @param conversationType 会话类型
   */
  async replyMessage(messageId: string, replyToId: string, content: string, conversationType: ConversationType): Promise<Message> {
    return this.client.getIMService().replyMessage(messageId, replyToId, content, conversationType);
  }

  /**
   * 翻译消息
   * @param messageId 消息ID
   * @param targetLanguage 目标语言
   */
  async translateMessage(messageId: string, targetLanguage: string): Promise<{ original: string; translated: string }> {
    return this.client.getIMService().translateMessage(messageId, targetLanguage);
  }

  /**
   * 获取会话草稿
   * @param conversationId 会话ID
   */
  async getConversationDraft(conversationId: string): Promise<string | null> {
    return this.client.getIMService().getConversationDraft(conversationId);
  }

  /**
   * 清空会话草稿
   * @param conversationId 会话ID
   */
  async clearConversationDraft(conversationId: string): Promise<void> {
    return this.client.getIMService().clearConversationDraft(conversationId);
  }
}

/**
 * 联系人模块
 */
class ContactsModule {
  private client: OpenChatClient;

  constructor(client: OpenChatClient) {
    this.client = client;
  }

  /**
   * 获取好友列表
   */
  async getFriends(): Promise<Friend[]> {
    return this.client.getApiService().getFriends();
  }

  /**
   * 发送好友请求
   * @param uid 用户ID
   * @param message 验证消息
   */
  async sendFriendRequest(uid: string, message?: string): Promise<FriendRequest> {
    return this.client.getApiService().sendFriendRequest(uid, message);
  }

  /**
   * 接受好友请求
   * @param requestId 请求ID
   */
  async acceptFriendRequest(requestId: string): Promise<Friend> {
    return this.client.getApiService().acceptFriendRequest(requestId);
  }

  /**
   * 拒绝好友请求
   * @param requestId 请求ID
   */
  async rejectFriendRequest(requestId: string): Promise<void> {
    return this.client.getApiService().rejectFriendRequest(requestId);
  }

  /**
   * 删除好友
   * @param uid 用户ID
   */
  async removeFriend(uid: string): Promise<void> {
    return this.client.getApiService().removeFriend(uid);
  }

  /**
   * 屏蔽好友
   * @param uid 用户ID
   */
  async blockFriend(uid: string): Promise<void> {
    return this.client.getApiService().blockFriend(uid);
  }

  /**
   * 取消屏蔽
   * @param uid 用户ID
   */
  async unblockFriend(uid: string): Promise<void> {
    return this.client.getApiService().unblockFriend(uid);
  }

  /**
   * 设置好友备注
   * @param uid 用户ID
   * @param remark 备注
   */
  async setFriendRemark(uid: string, remark: string): Promise<void> {
    return this.client.getApiService().setFriendRemark(uid, remark);
  }

  /**
   * 获取联系人列表
   */
  async getContacts(options?: {
    userId: string;
    type?: 'user' | 'group';
    status?: 'active' | 'blocked' | 'deleted';
    isFavorite?: boolean;
    tag?: string;
    keyword?: string;
    limit?: number;
    offset?: number;
  }): Promise<Contact[]> {
    return this.client.getApiService().getContacts(options);
  }

  /**
   * 创建联系人
   */
  async createContact(data: {
    userId: string;
    contactId: string;
    type: 'user' | 'group';
    name: string;
    remark?: string;
    tags?: string[];
  }): Promise<Contact> {
    return this.client.getApiService().createContact(data);
  }

  /**
   * 删除联系人
   * @param id 联系人ID
   */
  async deleteContact(id: string): Promise<boolean> {
    return this.client.getApiService().deleteContact(id);
  }

  /**
   * 更新联系人
   * @param id 联系人ID
   * @param data 更新数据
   */
  async updateContact(
    id: string,
    data: {
      name?: string;
      remark?: string;
      tags?: string[];
      isFavorite?: boolean;
      status?: 'active' | 'blocked' | 'deleted';
    }
  ): Promise<Contact | null> {
    return this.client.getApiService().updateContact(id, data);
  }
}

/**
 * 会话模块
 */
class ConversationsModule {
  private client: OpenChatClient;

  constructor(client: OpenChatClient) {
    this.client = client;
  }

  /**
   * 获取会话列表
   * @param options 查询选项
   */
  async getConversationList(options?: QueryConversationsOptions): Promise<Conversation[]> {
    return this.client.getIMService().getConversationList(options);
  }

  /**
   * 获取会话
   * @param conversationId 会话ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.client.getIMService().getConversation(conversationId);
  }

  /**
   * 删除会话
   * @param conversationId 会话ID
   */
  async deleteConversation(conversationId: string): Promise<void> {
    return this.client.getIMService().deleteConversation(conversationId);
  }

  /**
   * 置顶会话
   * @param conversationId 会话ID
   * @param isPinned 是否置顶
   */
  async pinConversation(conversationId: string, isPinned: boolean = true): Promise<void> {
    return this.client.getIMService().setConversationPinned(conversationId, isPinned);
  }

  /**
   * 静音会话
   * @param conversationId 会话ID
   * @param isMuted 是否静音
   */
  async muteConversation(conversationId: string, isMuted: boolean = true): Promise<void> {
    return this.client.getIMService().setConversationMuted(conversationId, isMuted);
  }

  /**
   * 设置会话草稿
   * @param conversationId 会话ID
   * @param draft 草稿内容
   */
  async setConversationDraft(conversationId: string, draft: string): Promise<void> {
    return this.client.getIMService().setConversationDraft(conversationId, draft);
  }

  /**
   * 创建会话
   * @param type 会话类型
   * @param userId 用户ID
   * @param targetId 目标ID
   */
  async createConversation(type: 'single' | 'group', userId: string, targetId: string): Promise<Conversation> {
    return this.client.getApiService().createConversation(type, userId, targetId);
  }
}

/**
 * 群组模块
 */
class GroupsModule {
  private client: OpenChatClient;

  constructor(client: OpenChatClient) {
    this.client = client;
  }

  /**
   * 创建群组
   * @param name 群组名称
   * @param memberUids 成员ID列表
   * @param options 选项
   */
  async createGroup(name: string, memberUids: string[], options?: { avatar?: string; notice?: string }): Promise<Group> {
    return this.client.getApiService().createGroup(name, memberUids, options);
  }

  /**
   * 获取群组信息
   * @param groupId 群组ID
   */
  async getGroup(groupId: string): Promise<Group> {
    return this.client.getApiService().getGroup(groupId);
  }

  /**
   * 获取我的群组列表
   */
  async getMyGroups(): Promise<Group[]> {
    return this.client.getApiService().getMyGroups();
  }

  /**
   * 更新群组信息
   * @param groupId 群组ID
   * @param data 更新数据
   */
  async updateGroup(groupId: string, data: Partial<Group>): Promise<Group> {
    return this.client.getApiService().updateGroup(groupId, data);
  }

  /**
   * 解散群组
   * @param groupId 群组ID
   */
  async dissolveGroup(groupId: string): Promise<void> {
    return this.client.getApiService().dissolveGroup(groupId);
  }

  /**
   * 获取群成员列表
   * @param groupId 群组ID
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return this.client.getApiService().getGroupMembers(groupId);
  }

  /**
   * 添加群成员
   * @param groupId 群组ID
   * @param uid 用户ID
   */
  async addGroupMember(groupId: string, uid: string): Promise<void> {
    return this.client.getApiService().addGroupMember(groupId, uid);
  }

  /**
   * 移除群成员
   * @param groupId 群组ID
   * @param uid 用户ID
   */
  async removeGroupMember(groupId: string, uid: string): Promise<void> {
    return this.client.getApiService().removeGroupMember(groupId, uid);
  }

  /**
   * 退出群组
   * @param groupId 群组ID
   */
  async quitGroup(groupId: string): Promise<void> {
    return this.client.getApiService().quitGroup(groupId);
  }

  /**
   * 转让群主
   * @param groupId 群组ID
   * @param uid 新群主ID
   */
  async transferGroupOwner(groupId: string, uid: string): Promise<void> {
    return this.client.getApiService().transferGroupOwner(groupId, uid);
  }
}

/**
 * RTC模块
 */
class RTCModule {
  private client: OpenChatClient;

  constructor(client: OpenChatClient) {
    this.client = client;
  }

  /**
   * 初始化RTC
   * @param config RTC配置
   */
  async init(config?: any): Promise<void> {
    const { RTCManager } = await import('./rtc/rtc-manager');
    
    if (this.client.getRTCManager()) {
      await this.client.getRTCManager()?.destroy();
    }

    const rtcManager = new RTCManager({
      imService: this.client.getIMService(),
      uid: this.client.getConfig().auth.uid,
    });

    // 优先使用客户端配置中的RTC配置
    const clientRTCConfig = this.client.getConfig().rtc;
    const defaultConfig = {
      provider: RTCProviderType.VOLCENGINE,
      providerConfig: {
        appId: '', // 需要从配置或服务器获取
      },
      ...clientRTCConfig,
      ...config,
    };

    await rtcManager.initialize(defaultConfig);
    this.client.setRTCManager(rtcManager);
  }

  /**
   * 销毁RTC
   */
  async destroy(): Promise<void> {
    if (this.client.getRTCManager()) {
      await this.client.getRTCManager()?.destroy();
      this.client.setRTCManager(null as any);
    }
  }

  /**
   * 开始通话
   * @param roomId 房间ID
   * @param options 选项
   */
  async startCall(roomId: string, options?: { autoPublish?: boolean; autoSubscribe?: boolean }): Promise<void> {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) {
      throw new OpenChatError(ErrorCode.RTC_NOT_INITIALIZED, 'RTC not initialized. Call client.rtc.init() first.');
    }
    return rtcManager.startCall(roomId, options);
  }

  /**
   * 结束通话
   */
  async endCall(): Promise<void> {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    return rtcManager.endCall();
  }

  /**
   * 创建本地流
   * @param options 选项
   */
  async createLocalStream(options?: { video?: boolean; audio?: boolean }) {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) {
      throw new OpenChatError(ErrorCode.RTC_NOT_INITIALIZED, 'RTC not initialized');
    }
    return rtcManager.createLocalStream(options);
  }

  /**
   * 发布流
   * @param streamId 流ID
   */
  async publishStream(streamId: string): Promise<void> {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    return rtcManager.publishStream(streamId);
  }

  /**
   * 取消发布流
   * @param streamId 流ID
   */
  async unpublishStream(streamId: string): Promise<void> {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    return rtcManager.unpublishStream(streamId);
  }

  /**
   * 订阅流
   * @param userId 用户ID
   * @param options 选项
   */
  async subscribeStream(userId: string, options?: { video?: boolean; audio?: boolean }) {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) {
      throw new OpenChatError(ErrorCode.RTC_NOT_INITIALIZED, 'RTC not initialized');
    }
    return rtcManager.subscribeStream(userId, options);
  }

  /**
   * 启用视频
   * @param enabled 是否启用
   */
  async enableVideo(enabled: boolean): Promise<void> {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    return rtcManager.enableVideo(enabled);
  }

  /**
   * 启用音频
   * @param enabled 是否启用
   */
  async enableAudio(enabled: boolean): Promise<void> {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    return rtcManager.enableAudio(enabled);
  }

  /**
   * 切换摄像头
   */
  async switchCamera(): Promise<void> {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    return rtcManager.switchCamera();
  }

  /**
   * 是否在通话中
   */
  isInCall(): boolean {
    return this.client.getRTCManager()?.inCall || false;
  }

  /**
   * 获取房间ID
   */
  getRoomId(): string | null {
    return this.client.getRTCManager()?.roomId || null;
  }

  /**
   * 监听事件
   * @param event 事件
   * @param callback 回调
   */
  on(event: string, callback: EventCallback): void {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    rtcManager.on(event, callback);
  }

  /**
   * 取消监听事件
   * @param event 事件
   * @param callback 回调
   */
  off(event: string, callback: EventCallback): void {
    const rtcManager = this.client.getRTCManager();
    if (!rtcManager) return;
    rtcManager.off(event, callback);
  }
}

/**
 * API服务访问器
 * 提供对所有API的便捷访问
 */
class ApiServiceAccessor {
  private client: OpenChatClient;

  constructor(client: OpenChatClient) {
    this.client = client;
  }

  /**
   * 直接访问底层ApiService实例
   * 所有API方法都可以通过 client.api.service.xxx() 访问
   */
  get service() {
    return this.client.getApiService();
  }

  // ==================== 认证相关 ====================

  async register(username: string, password: string, options?: {
    nickname?: string;
    email?: string;
    phone?: string;
    verificationCode?: string;
  }) {
    return this.client.getApiService().register(username, password, options);
  }

  async login(username: string, password: string) {
    return this.client.getApiService().login(username, password);
  }

  async logout(refreshToken?: string) {
    return this.client.getApiService().logout(refreshToken);
  }

  async refreshToken(refreshToken?: string) {
    return this.client.getApiService().refreshToken(refreshToken);
  }

  async validateToken(token: string) {
    return this.client.getApiService().validateToken(token);
  }

  async getAuthMe() {
    return this.client.getApiService().getAuthMe();
  }

  async updatePassword(oldPassword: string, newPassword: string) {
    return this.client.getApiService().updatePassword(oldPassword, newPassword);
  }

  async forgotPassword(options: { email?: string; phone?: string }) {
    return this.client.getApiService().forgotPassword(options);
  }

  async sendVerificationCode(options: {
    email?: string;
    phone?: string;
    type: 'register' | 'login' | 'reset';
  }) {
    return this.client.getApiService().sendVerificationCode(options);
  }

  async verifyVerificationCode(options: {
    email?: string;
    phone?: string;
    code: string;
    type: 'register' | 'login' | 'reset';
  }) {
    return this.client.getApiService().verifyVerificationCode(options);
  }

  async getUserOnlineStatus(userId: string) {
    return this.client.getApiService().getUserOnlineStatus(userId);
  }

  async batchGetUserOnlineStatus(userIds: string[]) {
    return this.client.getApiService().batchGetUserOnlineStatus(userIds);
  }

  // ==================== 用户相关 ====================

  async getCurrentUser() {
    return this.client.getApiService().getCurrentUser();
  }

  async getUser(uid: string) {
    return this.client.getApiService().getUser(uid);
  }

  async getUsers(uids: string[]) {
    return this.client.getApiService().getUsers(uids);
  }

  async updateUser(uid: string, data: any) {
    return this.client.getApiService().updateUser(uid, data);
  }

  async searchUsers(keyword: string, limit?: number) {
    return this.client.getApiService().searchUsers(keyword, limit);
  }

  // ==================== 好友相关 ====================

  async getFriends() {
    return this.client.getApiService().getFriends();
  }

  async sendFriendRequest(toUid: string, message?: string) {
    return this.client.getApiService().sendFriendRequest(toUid, message);
  }

  async acceptFriendRequest(requestId: string) {
    return this.client.getApiService().acceptFriendRequest(requestId);
  }

  async rejectFriendRequest(requestId: string) {
    return this.client.getApiService().rejectFriendRequest(requestId);
  }

  async removeFriend(uid: string) {
    return this.client.getApiService().removeFriend(uid);
  }

  async getReceivedFriendRequests() {
    return this.client.getApiService().getReceivedFriendRequests();
  }

  async getSentFriendRequests() {
    return this.client.getApiService().getSentFriendRequests();
  }

  async setFriendRemark(uid: string, remark: string) {
    return this.client.getApiService().setFriendRemark(uid, remark);
  }

  async blockFriend(uid: string) {
    return this.client.getApiService().blockFriend(uid);
  }

  async unblockFriend(uid: string) {
    return this.client.getApiService().unblockFriend(uid);
  }

  // ==================== 群组相关 ====================

  async createGroup(name: string, memberUids: string[], options?: { avatar?: string; notice?: string }) {
    return this.client.getApiService().createGroup(name, memberUids, options);
  }

  async getGroup(groupId: string) {
    return this.client.getApiService().getGroup(groupId);
  }

  async getMyGroups() {
    return this.client.getApiService().getMyGroups();
  }

  async updateGroup(groupId: string, data: any) {
    return this.client.getApiService().updateGroup(groupId, data);
  }

  async dissolveGroup(groupId: string) {
    return this.client.getApiService().dissolveGroup(groupId);
  }

  async getGroupMembers(groupId: string) {
    return this.client.getApiService().getGroupMembers(groupId);
  }

  async addGroupMember(groupId: string, uid: string) {
    return this.client.getApiService().addGroupMember(groupId, uid);
  }

  async removeGroupMember(groupId: string, uid: string) {
    return this.client.getApiService().removeGroupMember(groupId, uid);
  }

  async quitGroup(groupId: string) {
    return this.client.getApiService().quitGroup(groupId);
  }

  async setGroupMemberRole(groupId: string, uid: string, role: number) {
    return this.client.getApiService().setGroupMemberRole(groupId, uid, role);
  }

  async transferGroupOwner(groupId: string, uid: string) {
    return this.client.getApiService().transferGroupOwner(groupId, uid);
  }

  // ==================== 会话相关 ====================

  async getConversations(options?: {
    userId: string;
    type?: 'single' | 'group';
    isPinned?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return this.client.getApiService().getConversations(options);
  }

  async getConversation(conversationId: string) {
    return this.client.getApiService().getConversation(conversationId);
  }

  async getConversationByTarget(userId: string, targetId: string, type: 'single' | 'group') {
    return this.client.getApiService().getConversationByTarget(userId, targetId, type);
  }

  async createConversation(type: 'single' | 'group', userId: string, targetId: string) {
    return this.client.getApiService().createConversation(type, userId, targetId);
  }

  async updateConversation(conversationId: string, data: { isPinned?: boolean; isMuted?: boolean }) {
    return this.client.getApiService().updateConversation(conversationId, data);
  }

  async deleteConversation(conversationId: string) {
    return this.client.getApiService().deleteConversation(conversationId);
  }

  async batchDeleteConversations(ids: string[]) {
    return this.client.getApiService().batchDeleteConversations(ids);
  }

  async pinConversation(conversationId: string, isPinned: boolean) {
    return this.client.getApiService().pinConversation(conversationId, isPinned);
  }

  async muteConversation(conversationId: string, isMuted: boolean) {
    return this.client.getApiService().muteConversation(conversationId, isMuted);
  }

  async clearConversationUnread(conversationId: string) {
    return this.client.getApiService().clearConversationUnread(conversationId);
  }

  async getTotalUnreadCount(userId: string) {
    return this.client.getApiService().getTotalUnreadCount(userId);
  }

  // ==================== 消息相关 ====================

  async sendMessage(data: any): Promise<any> {
    return this.client.getApiService().sendMessage(data);
  }

  async batchSendMessages(messages: any[]): Promise<any[]> {
    return this.client.getApiService().batchSendMessages(messages);
  }

  async getMessage(id: string): Promise<any> {
    return this.client.getApiService().getMessage(id);
  }

  async getUserMessages(userId: string, options?: { limit?: number; offset?: number; cursor?: string }): Promise<any[]> {
    return this.client.getApiService().getUserMessages(userId, options);
  }

  async getGroupMessages(groupId: string, options?: { limit?: number; offset?: number; cursor?: string }): Promise<any[]> {
    return this.client.getApiService().getGroupMessages(groupId, options);
  }

  async updateMessageStatus(id: string, status: string): Promise<boolean> {
    return this.client.getApiService().updateMessageStatus(id, status);
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    return this.client.getApiService().deleteMessage(messageId);
  }

  async markMessagesAsRead(userId: string, messageIds: string[]): Promise<boolean> {
    return this.client.getApiService().markMessagesAsRead(userId, messageIds);
  }

  async recallMessage(messageId: string) {
    return this.client.getApiService().recallMessage(messageId);
  }

  async forwardMessage(
    messageId: string,
    options: { toUserIds?: string[]; toGroupIds?: string[] }
  ): Promise<any[]> {
    return this.client.getApiService().forwardMessage(messageId, options);
  }

  async retrySendMessage(messageId: string): Promise<{ success: boolean; message?: any }> {
    return this.client.getApiService().retrySendMessage(messageId);
  }

  async getMessages(channelId: string, channelType: any, options?: any) {
    return this.client.getApiService().getMessages(channelId, channelType, options);
  }

  // ==================== 联系人相关 ====================

  async getContacts(options?: {
    userId: string;
    type?: 'user' | 'group';
    status?: 'active' | 'blocked' | 'deleted';
    isFavorite?: boolean;
    tag?: string;
    keyword?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.getApiService().getContacts(options);
  }

  async getContactById(id: string) {
    return this.client.getApiService().getContactById(id);
  }

  async createContact(data: {
    userId: string;
    contactId: string;
    type: 'user' | 'group';
    name: string;
    remark?: string;
    tags?: string[];
  }) {
    return this.client.getApiService().createContact(data);
  }

  async updateContact(
    id: string,
    data: {
      name?: string;
      remark?: string;
      tags?: string[];
      isFavorite?: boolean;
      status?: 'active' | 'blocked' | 'deleted';
    }
  ) {
    return this.client.getApiService().updateContact(id, data);
  }

  async deleteContact(id: string) {
    return this.client.getApiService().deleteContact(id);
  }

  async batchDeleteContacts(ids: string[]) {
    return this.client.getApiService().batchDeleteContacts(ids);
  }

  async setContactFavorite(id: string, isFavorite: boolean) {
    return this.client.getApiService().setContactFavorite(id, isFavorite);
  }

  async setContactRemark(id: string, remark: string) {
    return this.client.getApiService().setContactRemark(id, remark);
  }

  async addContactTag(id: string, tag: string) {
    return this.client.getApiService().addContactTag(id, tag);
  }

  async removeContactTag(id: string, tag: string) {
    return this.client.getApiService().removeContactTag(id, tag);
  }

  async searchContacts(userId: string, keyword: string) {
    return this.client.getApiService().searchContacts(userId, keyword);
  }

  async getContactStats(userId: string) {
    return this.client.getApiService().getContactStats(userId);
  }

  // ==================== 消息搜索相关 ====================

  async searchMessages(params: any) {
    return this.client.getApiService().searchMessages(params);
  }

  async quickSearchMessages(keyword: string, limit?: number) {
    return this.client.getApiService().quickSearchMessages(keyword, limit);
  }

  async searchMessagesInConversation(params: any) {
    return this.client.getApiService().searchMessagesInConversation(params);
  }

  async getMessageStats(params?: any) {
    return this.client.getApiService().getMessageStats(params);
  }

  // ==================== 健康检查相关 ====================

  async checkHealth() {
    return this.client.getApiService().checkHealth();
  }

  async checkDetailedHealth() {
    return this.client.getApiService().checkDetailedHealth();
  }

  async checkReady() {
    return this.client.getApiService().checkReady();
  }

  async checkLive() {
    return this.client.getApiService().checkLive();
  }
}

// 导出工厂函数
export function createOpenChatClient(config: OpenChatSDKConfig): OpenChatClient {
  return new OpenChatClient(config);
}

export default OpenChatClient;