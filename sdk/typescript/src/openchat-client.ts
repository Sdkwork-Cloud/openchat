/**
 * OpenChat SDK - Main Client
 * 
 * 设计原则：
 * 1. 统一连接管理，用户只需调用client.init()即可连接所有服务
 * 2. 提供client.im.xxx和client.rtc.xxx的简洁接口
 * 3. 隐藏底层实现细节（悟空IM、火山引擎等）
 * 4. 符合开闭原则，易于扩展
 * 
 * 使用示例：
 * ```typescript
 * const client = new OpenChatClient(config);
 * await client.init(); // 一键连接所有服务
 * 
 * // 发送消息
 * await client.im.sendText({ targetId: 'user1', content: 'Hello' });
 * 
 * // 开始音视频通话
 * await client.rtc.startCall('room-id');
 * ```
 */

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
const DEFAULT_CONFIG: Partial<OpenChatSDKConfig> = {
  timeout: 30000,
  maxRetries: 3,
  debug: false,
  deviceFlag: DeviceFlag.WEB,
};

export class OpenChatClient {
  // 配置
  private config: OpenChatSDKConfig;

  // 服务层
  private api: ApiService;
  private imService: WukongIMService;
  private rtcManager: RTCManager | null = null;

  // 状态
  private initialized: boolean = false;
  private currentUser: User | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  constructor(config: OpenChatSDKConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as OpenChatSDKConfig;

    // 初始化服务
    this.api = new ApiService(this.config);
    this.imService = new WukongIMService();

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
      this.currentUser = await this.api.getCurrentUser();

      // 连接IM服务器（内部封装，用户无感知）
      await this.imService.connect({
        uid: this.config.uid,
        token: this.config.token,
        serverUrl: this.config.imWsUrl,
        deviceId: this.config.deviceId,
        deviceFlag: this.config.deviceFlag,
      });

      this.initialized = true;
      this.emit(OpenChatEvent.CONNECTED, { uid: this.config.uid });

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
    this.eventListeners.clear();
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

  // ==================== 事件系统 ====================

  on(event: OpenChatEvent, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: OpenChatEvent, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: OpenChatEvent, data?: any): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // ==================== 认证模块 ====================

  auth = {
    register: async (username: string, password: string, nickname?: string): Promise<UserInfo> => {
      const userInfo = await this.api.register(username, password, nickname);
      this.currentUser = userInfo.user;
      return userInfo;
    },

    login: async (username: string, password: string): Promise<UserInfo> => {
      const userInfo = await this.api.login(username, password);
      this.currentUser = userInfo.user;
      this.config.token = userInfo.token;
      this.api.setToken(userInfo.token);
      await this.init();
      return userInfo;
    },

    logout: async (): Promise<void> => {
      await this.api.logout();
      this.destroy();
    },

    getCurrentUser: (): User | null => {
      return this.currentUser;
    },

    refreshToken: async (): Promise<string> => {
      const token = await this.api.refreshToken();
      this.config.token = token;
      return token;
    },
  };

  // ==================== 用户模块 ====================

  user = {
    getInfo: async (uid: string): Promise<User> => {
      return this.api.getUser(uid);
    },

    getBatch: async (uids: string[]): Promise<User[]> => {
      return this.api.getUsers(uids);
    },

    update: async (uid: string, data: Partial<User>): Promise<User> => {
      const user = await this.api.updateUser(uid, data);
      if (uid === this.currentUser?.id) {
        this.currentUser = { ...this.currentUser, ...user };
      }
      return user;
    },

    search: async (keyword: string, limit?: number): Promise<User[]> => {
      return this.api.searchUsers(keyword, limit);
    },
  };

  // ==================== IM模块 (即时通讯核心) ====================

  im = {
    // ----- 连接状态 -----
    isConnected: (): boolean => {
      return this.imService.isConnected();
    },

    getConnectionState: () => {
      return this.imService.getConnectionState();
    },

    // ----- 发送消息 - 采用MediaResource标准 -----

    /**
     * 发送文本消息
     * @example
     * ```typescript
     * await client.im.sendText({
     *   targetId: 'user-123',
     *   conversationType: ConversationType.SINGLE,
     *   text: 'Hello, World!'
     * });
     * ```
     */
    sendText: async (params: SendTextMessageParams): Promise<Message> => {
      return this.imService.sendText(params);
    },

    /**
     * 发送图片消息
     * @example
     * ```typescript
     * await client.im.sendImage({
     *   targetId: 'user-123',
     *   conversationType: ConversationType.SINGLE,
     *   resource: ResourceBuilder.image('https://example.com/image.jpg', {
     *     width: 1920,
     *     height: 1080
     *   })
     * });
     * ```
     */
    sendImage: async (params: SendMediaMessageParams<ImageResource>): Promise<Message> => {
      return this.imService.sendImage(params);
    },

    /**
     * 发送语音消息
     * @example
     * ```typescript
     * await client.im.sendAudio({
     *   targetId: 'user-123',
     *   conversationType: ConversationType.SINGLE,
     *   resource: ResourceBuilder.audio('https://example.com/audio.mp3', 60)
     * });
     * ```
     */
    sendAudio: async (params: SendMediaMessageParams<AudioResource>): Promise<Message> => {
      return this.imService.sendAudio(params);
    },

    /**
     * 发送视频消息
     * @example
     * ```typescript
     * await client.im.sendVideo({
     *   targetId: 'user-123',
     *   conversationType: ConversationType.SINGLE,
     *   resource: ResourceBuilder.video('https://example.com/video.mp4', 120, {
     *     coverUrl: 'https://example.com/cover.jpg'
     *   })
     * });
     * ```
     */
    sendVideo: async (params: SendMediaMessageParams<VideoResource>): Promise<Message> => {
      return this.imService.sendVideo(params);
    },

    /**
     * 发送文件消息
     * @example
     * ```typescript
     * await client.im.sendFile({
     *   targetId: 'user-123',
     *   conversationType: ConversationType.SINGLE,
     *   resource: ResourceBuilder.file('https://example.com/file.pdf', 'document.pdf')
     * });
     * ```
     */
    sendFile: async (params: SendMediaMessageParams<FileResource>): Promise<Message> => {
      return this.imService.sendFile(params);
    },

    /**
     * 发送位置消息
     * @example
     * ```typescript
     * await client.im.sendLocation({
     *   targetId: 'user-123',
     *   conversationType: ConversationType.SINGLE,
     *   resource: ResourceBuilder.location(39.9042, 116.4074, {
     *     name: '天安门广场',
     *     address: '北京市东城区'
     *   })
     * });
     * ```
     */
    sendLocation: async (params: SendMediaMessageParams<LocationResource>): Promise<Message> => {
      return this.imService.sendLocation(params);
    },

    /**
     * 发送名片消息
     * @example
     * ```typescript
     * await client.im.sendCard({
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
    sendCard: async (params: SendMediaMessageParams<CardResource>): Promise<Message> => {
      return this.imService.sendCard(params);
    },

    /**
     * 发送自定义消息
     * @example
     * ```typescript
     * await client.im.sendCustom({
     *   targetId: 'user-123',
     *   conversationType: ConversationType.SINGLE,
     *   customType: 'order',
     *   data: { orderId: '123', status: 'paid' }
     * });
     * ```
     */
    sendCustom: async (params: SendCustomMessageParams): Promise<Message> => {
      return this.imService.sendCustom(params);
    },

    /**
     * 发送组合消息（支持多个资源）
     * @example
     * ```typescript
     * await client.im.sendCombined({
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
    sendCombined: async (params: SendCombinedMessageParams): Promise<Message> => {
      return this.imService.sendCombined(params);
    },

    // ----- 消息操作 -----
    recallMessage: async (messageId: string): Promise<boolean> => {
      return this.imService.recallMessage(messageId);
    },

    deleteMessage: async (messageId: string): Promise<boolean> => {
      return this.imService.deleteMessage(messageId);
    },

    getMessage: async (messageId: string): Promise<Message | null> => {
      return this.imService.getMessage(messageId);
    },

    getMessageList: async (conversationId: string, options?: QueryMessagesOptions): Promise<Message[]> => {
      return this.imService.getMessageList(conversationId, options);
    },

    searchMessages: async (keyword: string, conversationId?: string): Promise<Message[]> => {
      return this.imService.searchMessages(keyword, conversationId);
    },

    markMessageAsRead: async (messageId: string): Promise<void> => {
      return this.imService.markMessageAsRead(messageId);
    },

    markConversationAsRead: async (conversationId: string): Promise<void> => {
      return this.imService.markConversationAsRead(conversationId);
    },

    // ----- 会话管理 -----
    getConversationList: async (options?: QueryConversationsOptions): Promise<Conversation[]> => {
      return this.imService.getConversationList(options);
    },

    getConversation: async (conversationId: string): Promise<Conversation | null> => {
      return this.imService.getConversation(conversationId);
    },

    deleteConversation: async (conversationId: string): Promise<void> => {
      return this.imService.deleteConversation(conversationId);
    },

    pinConversation: async (conversationId: string, isPinned: boolean = true): Promise<void> => {
      return this.imService.setConversationPinned(conversationId, isPinned);
    },

    muteConversation: async (conversationId: string, isMuted: boolean = true): Promise<void> => {
      return this.imService.setConversationMuted(conversationId, isMuted);
    },

    setConversationDraft: async (conversationId: string, draft: string): Promise<void> => {
      return this.imService.setConversationDraft(conversationId, draft);
    },

    // ----- 事件监听 -----
    on: (event: string, callback: EventCallback): void => {
      this.imService.on(event, callback);
    },

    off: (event: string, callback: EventCallback): void => {
      this.imService.off(event, callback);
    },
  };

  // ==================== RTC模块 (实时音视频) ====================

  rtc = {
    // ----- 初始化 -----
    init: async (config?: RTCManagerConfig): Promise<void> => {
      if (this.rtcManager) {
        await this.rtcManager.destroy();
      }

      this.rtcManager = new RTCManager({
        imService: this.imService,
        uid: this.config.uid,
      });

      const defaultConfig: RTCManagerConfig = {
        provider: RTCProviderType.VOLCENGINE,
        providerConfig: {
          appId: '', // 需要从配置或服务器获取
        },
        ...config,
      };

      await this.rtcManager.initialize(defaultConfig);
    },

    destroy: async (): Promise<void> => {
      if (this.rtcManager) {
        await this.rtcManager.destroy();
        this.rtcManager = null;
      }
    },

    // ----- 通话控制 -----
    startCall: async (roomId: string, options?: { autoPublish?: boolean; autoSubscribe?: boolean }): Promise<void> => {
      if (!this.rtcManager) {
        throw new Error('RTC not initialized. Call client.rtc.init() first.');
      }
      return this.rtcManager.startCall(roomId, options);
    },

    endCall: async (): Promise<void> => {
      if (!this.rtcManager) return;
      return this.rtcManager.endCall();
    },

    // ----- 流控制 -----
    createLocalStream: async (options?: { video?: boolean; audio?: boolean }) => {
      if (!this.rtcManager) {
        throw new Error('RTC not initialized');
      }
      return this.rtcManager.createLocalStream(options);
    },

    publishStream: async (streamId: string): Promise<void> => {
      if (!this.rtcManager) return;
      return this.rtcManager.publishStream(streamId);
    },

    unpublishStream: async (streamId: string): Promise<void> => {
      if (!this.rtcManager) return;
      return this.rtcManager.unpublishStream(streamId);
    },

    subscribeStream: async (userId: string, options?: { video?: boolean; audio?: boolean }) => {
      if (!this.rtcManager) {
        throw new Error('RTC not initialized');
      }
      return this.rtcManager.subscribeStream(userId, options);
    },

    // ----- 设备控制 -----
    enableVideo: async (enabled: boolean): Promise<void> => {
      if (!this.rtcManager) return;
      return this.rtcManager.enableVideo(enabled);
    },

    enableAudio: async (enabled: boolean): Promise<void> => {
      if (!this.rtcManager) return;
      return this.rtcManager.enableAudio(enabled);
    },

    switchCamera: async (): Promise<void> => {
      if (!this.rtcManager) return;
      return this.rtcManager.switchCamera();
    },

    // ----- 状态查询 -----
    isInCall: (): boolean => {
      return this.rtcManager?.inCall || false;
    },

    getRoomId: (): string | null => {
      return this.rtcManager?.roomId || null;
    },

    // ----- 事件监听 -----
    on: (event: string, callback: EventCallback): void => {
      if (!this.rtcManager) return;
      this.rtcManager.on(event, callback);
    },

    off: (event: string, callback: EventCallback): void => {
      if (!this.rtcManager) return;
      this.rtcManager.off(event, callback);
    },
  };

  // ==================== 好友模块 ====================

  friend = {
    getList: async (): Promise<Friend[]> => {
      return this.api.getFriends();
    },

    sendRequest: async (uid: string, message?: string): Promise<FriendRequest> => {
      const request = await this.api.sendFriendRequest(uid, message);
      this.emit(OpenChatEvent.FRIEND_REQUEST_RECEIVED, request);
      return request;
    },

    acceptRequest: async (requestId: string): Promise<Friend> => {
      const friend = await this.api.acceptFriendRequest(requestId);
      this.emit(OpenChatEvent.FRIEND_ADDED, friend);
      return friend;
    },

    rejectRequest: async (requestId: string): Promise<void> => {
      await this.api.rejectFriendRequest(requestId);
    },

    remove: async (uid: string): Promise<void> => {
      await this.api.removeFriend(uid);
      this.emit(OpenChatEvent.FRIEND_REMOVED, { uid });
    },

    block: async (uid: string): Promise<void> => {
      await this.api.blockFriend(uid);
      this.emit(OpenChatEvent.FRIEND_BLOCKED, { uid });
    },

    unblock: async (uid: string): Promise<void> => {
      await this.api.unblockFriend(uid);
    },

    setRemark: async (uid: string, remark: string): Promise<void> => {
      await this.api.setFriendRemark(uid, remark);
    },
  };

  // ==================== 群组模块 ====================

  group = {
    create: async (name: string, memberUids: string[], options?: { avatar?: string; notice?: string }): Promise<Group> => {
      const group = await this.api.createGroup(name, memberUids, options);
      this.emit(OpenChatEvent.GROUP_INFO_UPDATED, group);
      return group;
    },

    getInfo: async (groupId: string): Promise<Group> => {
      return this.api.getGroup(groupId);
    },

    getMyList: async (): Promise<Group[]> => {
      return this.api.getMyGroups();
    },

    updateInfo: async (groupId: string, data: Partial<Group>): Promise<Group> => {
      const group = await this.api.updateGroup(groupId, data);
      this.emit(OpenChatEvent.GROUP_INFO_UPDATED, group);
      return group;
    },

    dissolve: async (groupId: string): Promise<void> => {
      await this.api.dissolveGroup(groupId);
    },

    getMembers: async (groupId: string): Promise<GroupMember[]> => {
      return this.api.getGroupMembers(groupId);
    },

    addMember: async (groupId: string, uid: string): Promise<void> => {
      await this.api.addGroupMember(groupId, uid);
      this.emit(OpenChatEvent.GROUP_MEMBER_ADDED, { groupId, uid });
    },

    removeMember: async (groupId: string, uid: string): Promise<void> => {
      await this.api.removeGroupMember(groupId, uid);
      this.emit(OpenChatEvent.GROUP_MEMBER_REMOVED, { groupId, uid });
    },

    quit: async (groupId: string): Promise<void> => {
      await this.api.quitGroup(groupId);
    },
  };

  // ==================== 私有方法 ====================

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
}

// 导出工厂函数
export function createOpenChatClient(config: OpenChatSDKConfig): OpenChatClient {
  return new OpenChatClient(config);
}
