// OpenChat SDK - API Service Layer
// 封装OpenChat Server的HTTP API调用

import {
  OpenChatSDKConfig,
  User,
  UserInfo,
  Friend,
  FriendRequest,
  Group,
  GroupMember,
  Conversation,
  Contact,
  ErrorCode,
  OpenChatError,
  QueryMessagesOptions,
  QueryConversationsOptions,
  ChannelType,
  Memory,
  MemoryQueryParams,
  MemorySearchParams,
  SemanticSearchParams,
  StoreMemoryParams,
  MemoryStats,
  SessionHistory,
  SummarizeSessionParams,
  SessionSummary,
  KnowledgeDocument,
  KnowledgeQueryParams,
  AddKnowledgeDocumentParams,
  KnowledgeSearchParams,
  KnowledgeStats,
  DocumentChunk,
  PaginatedResponse,
  SearchResult,
  Agent,
  AgentType,
  AgentStatus,
  CreateAgentParams,
  UpdateAgentParams,
  AgentSession,
  AgentMessage,
  ChatResponse,
  AgentTool,
  AddToolParams,
  AgentSkill,
  AddSkillParams,
  CreateSessionParams,
  AgentSendMessageParams,
  AIBot,
  CreateAIBotParams,
  UpdateAIBotParams,
  BotMessage,
  ProcessBotMessageParams,
  BotResponse,
  BotStatus,
  CreateBotParams,
  UpdateBotParams,
  SetWebhookParams,
  BotListQuery,
  BotListResponse,
  RTCRoom,
  RTCRoomType,
  RTCToken,
  RTCChannelEntity,
  RTCVideoRecord,
  CreateRTCRoomParams,
  GenerateRTCTokenParams,
  CreateRTCChannelParams,
  UpdateRTCChannelParams,
  CreateVideoRecordParams,
  UpdateVideoRecordStatusParams,
  Device,
  DeviceType,
  DeviceStatus,
  DeviceMessage,
  DeviceMessageType,
  RegisterDeviceParams,
  UpdateDeviceStatusParams,
  SendDeviceMessageParams,
  ControlDeviceParams,
  DeviceListQuery,
  DeviceListResponse,
  SearchMessagesQuery,
  MessageSearchResult,
  QuickSearchQuery,
  QuickSearchResult,
  SearchInConversationQuery,
  MessageStats,
  MessageStatsQuery,
  BasicHealthCheck,
  HealthStatus,
  ReadyCheck,
  LiveCheck,
  ThirdPartyPlatform,
  ThirdPartyMessage,
  SendThirdPartyMessageParams,
  SyncContactsParams,
  GetContactParams,
  Message,
  MessageStatus,
  SendMessageParams,
  BatchSendMessagesParams,
} from '../types';
import { createHttpClient, HttpClient, HttpRequestConfig } from '../utils/http-client';
import { HttpCache } from '../core/cache/http-cache';
import { sleep } from '../utils/helpers';

// API响应格式
interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

// HTTP请求选项
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export class ApiService {
  private config: OpenChatSDKConfig;
  private token: string | null = null;
  private httpClient: HttpClient;
  private cache: HttpCache;

  constructor(config: OpenChatSDKConfig) {
    this.config = config;
    this.token = config.auth.token;
    this.httpClient = createHttpClient();
    this.cache = new HttpCache({
      maxSize: config.server.cache?.maxSize || 100,
      defaultTTL: config.server.cache?.defaultTTL || 300000, // 默认5分钟
    });
  }

  // 设置Token
  setToken(token: string | null): void {
    this.token = token;
  }

  // 获取Token
  getToken(): string | null {
    return this.token;
  }

  // ==================== 认证相关 ====================

  // 用户注册
  async register(username: string, password: string, options?: {
    nickname?: string;
    email?: string;
    phone?: string;
    verificationCode?: string;
  }): Promise<UserInfo> {
    const response = await this.request<UserInfo>({
      method: 'POST',
      url: '/auth/register',
      data: { username, password, ...options },
    });
    
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return this.unwrapResponse(response);
  }

  // 用户登录
  async login(username: string, password: string): Promise<UserInfo> {
    const response = await this.request<UserInfo>({
      method: 'POST',
      url: '/auth/login',
      data: { username, password },
    });
    
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return this.unwrapResponse(response);
  }

  // 登出
  async logout(refreshToken?: string): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>({
      method: 'POST',
      url: '/auth/logout',
      data: refreshToken ? { refreshToken } : undefined,
    });
    this.setToken(null);
    return this.unwrapResponse(response);
  }

  // 刷新Token
  async refreshToken(refreshToken?: string): Promise<UserInfo> {
    const response = await this.request<UserInfo>({
      method: 'POST',
      url: '/auth/refresh',
      data: refreshToken ? { refreshToken } : undefined,
    });
    
    const data = this.unwrapResponse(response);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  // 验证令牌
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const response = await this.request<{ valid: boolean; userId?: string }>({
      method: 'POST',
      url: '/auth/validate-token',
      data: { token },
    });
    return this.unwrapResponse(response);
  }

  // 获取当前用户信息 (通过认证API)
  async getAuthMe(): Promise<User> {
    const response = await this.request<User>({
      method: 'GET',
      url: '/auth/me',
    });
    return this.unwrapResponse(response);
  }

  // 更新密码
  async updatePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>({
      method: 'PUT',
      url: '/auth/password',
      data: { oldPassword, newPassword },
    });
    return this.unwrapResponse(response);
  }

  // 忘记密码
  async forgotPassword(options: { email?: string; phone?: string }): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>({
      method: 'POST',
      url: '/auth/forgot-password',
      data: options,
    });
    return this.unwrapResponse(response);
  }

  // 发送验证码
  async sendVerificationCode(options: {
    email?: string;
    phone?: string;
    type: 'register' | 'login' | 'reset';
  }): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>({
      method: 'POST',
      url: '/auth/send-code',
      data: options,
    });
    return this.unwrapResponse(response);
  }

  // 验证验证码
  async verifyVerificationCode(options: {
    email?: string;
    phone?: string;
    code: string;
    type: 'register' | 'login' | 'reset';
  }): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>({
      method: 'POST',
      url: '/auth/verify-code',
      data: options,
    });
    return this.unwrapResponse(response);
  }

  // 获取用户在线状态
  async getUserOnlineStatus(userId: string): Promise<{
    userId: string;
    isOnline: boolean;
    lastActiveAt?: string;
  }> {
    const response = await this.request<{
      userId: string;
      isOnline: boolean;
      lastActiveAt?: string;
    }>({
      method: 'GET',
      url: `/auth/users/${userId}/online-status`,
    });
    return this.unwrapResponse(response);
  }

  // 批量获取用户在线状态
  async batchGetUserOnlineStatus(userIds: string[]): Promise<Array<{
    userId: string;
    isOnline: boolean;
  }>> {
    const response = await this.request<Array<{
      userId: string;
      isOnline: boolean;
    }>>({
      method: 'POST',
      url: '/auth/users/online-status/batch',
      data: { userIds },
    });
    return this.unwrapResponse(response);
  }

  // ==================== 用户相关 ====================

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>({
      method: 'GET',
      url: '/users/me',
    });
    return this.unwrapResponse(response);
  }

  // 获取用户信息
  async getUser(uid: string): Promise<User> {
    const response = await this.request<User>({
      method: 'GET',
      url: `/users/${uid}`,
    });
    return this.unwrapResponse(response);
  }

  // 批量获取用户
  async getUsers(uids: string[]): Promise<User[]> {
    const response = await this.request<User[]>({
      method: 'POST',
      url: '/users/batch',
      data: { uids },
    });
    return this.unwrapResponse(response);
  }

  // 更新用户信息
  async updateUser(uid: string, data: Partial<User>): Promise<User> {
    const response = await this.request<User>({
      method: 'PUT',
      url: `/users/${uid}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 搜索用户
  async searchUsers(keyword: string, limit: number = 20): Promise<User[]> {
    const response = await this.request<User[]>({
      method: 'GET',
      url: '/users',
      params: { keyword, limit },
    });
    return this.unwrapResponse(response);
  }

  // ==================== 好友相关 ====================

  // 获取好友列表
  async getFriends(): Promise<Friend[]> {
    const response = await this.request<Friend[]>({
      method: 'GET',
      url: '/friends',
    });
    return this.unwrapResponse(response);
  }

  // 发送好友请求
  async sendFriendRequest(toUid: string, message?: string): Promise<FriendRequest> {
    const response = await this.request<FriendRequest>({
      method: 'POST',
      url: '/friends/requests',
      data: { toUid, message },
    });
    return this.unwrapResponse(response);
  }

  // 接受好友请求
  async acceptFriendRequest(requestId: string): Promise<Friend> {
    const response = await this.request<Friend>({
      method: 'POST',
      url: `/friends/requests/${requestId}/accept`,
    });
    return this.unwrapResponse(response);
  }

  // 拒绝好友请求
  async rejectFriendRequest(requestId: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/friends/requests/${requestId}/reject`,
    });
  }

  // 删除好友
  async removeFriend(uid: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/friends/${uid}`,
    });
  }

  // 获取收到的好友请求
  async getReceivedFriendRequests(): Promise<FriendRequest[]> {
    const response = await this.request<FriendRequest[]>({
      method: 'GET',
      url: '/friends/requests/received',
    });
    return this.unwrapResponse(response);
  }

  // 获取发送的好友请求
  async getSentFriendRequests(): Promise<FriendRequest[]> {
    const response = await this.request<FriendRequest[]>({
      method: 'GET',
      url: '/friends/requests/sent',
    });
    return this.unwrapResponse(response);
  }

  // 设置好友备注
  async setFriendRemark(uid: string, remark: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/friends/${uid}/remark`,
      data: { remark },
    });
  }

  // 拉黑好友
  async blockFriend(uid: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/friends/${uid}/block`,
    });
  }

  // 取消拉黑
  async unblockFriend(uid: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/friends/${uid}/unblock`,
    });
  }

  // 获取好友请求列表
  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    const response = await this.request<FriendRequest[]>({
      method: 'GET',
      url: `/friends/requests/${userId}`,
    });
    return this.unwrapResponse(response);
  }

  // 检查是否为好友
  async checkIsFriend(userId: string, friendId: string): Promise<boolean> {
    const response = await this.request<{ isFriend: boolean }>({
      method: 'GET',
      url: `/friends/${userId}/${friendId}/check`,
    });
    return this.unwrapResponse(response).isFriend;
  }

  // 检查是否被拉黑
  async checkIsBlocked(userId: string, friendId: string): Promise<boolean> {
    const response = await this.request<{ blocked: boolean }>({
      method: 'GET',
      url: `/friends/${userId}/${friendId}/blocked`,
    });
    return this.unwrapResponse(response).blocked;
  }

  // ==================== 群组相关 ====================

  // 创建群组
  async createGroup(name: string, memberUids: string[], options?: { avatar?: string; notice?: string }): Promise<Group> {
    const response = await this.request<Group>({
      method: 'POST',
      url: '/groups',
      data: { name, memberUids, ...options },
    });
    return this.unwrapResponse(response);
  }

  // 获取群组信息
  async getGroup(groupId: string): Promise<Group> {
    const response = await this.request<Group>({
      method: 'GET',
      url: `/groups/${groupId}`,
    });
    return this.unwrapResponse(response);
  }

  // 获取我的群组列表
  async getMyGroups(): Promise<Group[]> {
    const response = await this.request<Group[]>({
      method: 'GET',
      url: '/groups/my',
    });
    return this.unwrapResponse(response);
  }

  // 更新群组信息
  async updateGroup(groupId: string, data: Partial<Group>): Promise<Group> {
    const response = await this.request<Group>({
      method: 'PUT',
      url: `/groups/${groupId}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 解散群组
  async dissolveGroup(groupId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/groups/${groupId}`,
    });
  }

  // 获取群成员列表
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const response = await this.request<GroupMember[]>({
      method: 'GET',
      url: `/groups/${groupId}/members`,
    });
    return this.unwrapResponse(response);
  }

  // 添加群成员
  async addGroupMember(groupId: string, uid: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/${groupId}/members`,
      data: { uid },
    });
  }

  // 移除群成员
  async removeGroupMember(groupId: string, uid: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/groups/${groupId}/members/${uid}`,
    });
  }

  // 退出群组
  async quitGroup(groupId: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/${groupId}/quit`,
    });
  }

  // 设置群成员角色
  async setGroupMemberRole(groupId: string, uid: string, role: number): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/groups/${groupId}/members/${uid}/role`,
      data: { role },
    });
  }

  // 转让群组所有权
  async transferGroupOwner(groupId: string, uid: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/${groupId}/transfer`,
      data: { uid },
    });
  }

  // 群组邀请
  async createGroupInvitation(groupId: string, uids: string[]): Promise<{ invitationId: string }> {
    const response = await this.request<{ invitationId: string }>({
      method: 'POST',
      url: '/groups/invitation',
      data: { groupId, uids },
    });
    return this.unwrapResponse(response);
  }

  // 接受群组邀请
  async acceptGroupInvitation(invitationId: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/invitation/${invitationId}/accept`,
    });
  }

  // 拒绝群组邀请
  async rejectGroupInvitation(invitationId: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/invitation/${invitationId}/reject`,
    });
  }

  // 删除群组邀请
  async deleteGroupInvitation(invitationId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/groups/invitation/${invitationId}`,
    });
  }

  // 添加群黑名单
  async addGroupBlacklist(groupId: string, uids: string[]): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/${groupId}/blacklist`,
      data: { uids },
    });
  }

  // 移除群黑名单
  async removeGroupBlacklist(groupId: string, uid: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/groups/${groupId}/blacklist/${uid}`,
    });
  }

  // 获取群黑名单
  async getGroupBlacklist(groupId: string): Promise<string[]> {
    const response = await this.request<string[]>({
      method: 'GET',
      url: `/groups/${groupId}/blacklist`,
    });
    return this.unwrapResponse(response);
  }

  // 添加群白名单
  async addGroupWhitelist(groupId: string, uids: string[]): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/${groupId}/whitelist`,
      data: { uids },
    });
  }

  // 移除群白名单
  async removeGroupWhitelist(groupId: string, uid: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/groups/${groupId}/whitelist/${uid}`,
    });
  }

  // 获取群白名单
  async getGroupWhitelist(groupId: string): Promise<string[]> {
    const response = await this.request<string[]>({
      method: 'GET',
      url: `/groups/${groupId}/whitelist`,
    });
    return this.unwrapResponse(response);
  }

  // 踢出群成员
  async kickGroupMember(groupId: string, uid: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/groups/${groupId}/kick/${uid}`,
    });
  }

  // 更新群公告
  async updateGroupAnnouncement(groupId: string, announcement: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/groups/${groupId}/announcement`,
      data: { announcement },
    });
  }

  // 开启全员禁言
  async muteGroupAll(groupId: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/groups/${groupId}/mute-all`,
    });
  }

  // 禁言群成员
  async muteGroupMember(groupId: string, uid: string, duration: number): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/groups/${groupId}/members/${uid}/mute`,
      data: { duration },
    });
  }

  // ==================== 会话相关 ====================

  // 获取会话列表
  async getConversations(options?: {
    userId: string;
    type?: 'single' | 'group';
    isPinned?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    const response = await this.request<Conversation[]>({
      method: 'GET',
      url: '/conversations',
      params: options as Record<string, any>,
    });
    return this.unwrapResponse(response);
  }

  // 获取会话详情
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await this.request<Conversation>({
      method: 'GET',
      url: `/conversations/${conversationId}`,
    });
    return this.unwrapResponse(response);
  }

  // 获取用户与特定目标的会话
  async getConversationByTarget(
    userId: string,
    targetId: string,
    type: 'single' | 'group'
  ): Promise<Conversation | null> {
    const response = await this.request<Conversation | null>({
      method: 'GET',
      url: `/conversations/target/${userId}/${targetId}`,
      params: { type },
    });
    return this.unwrapResponse(response);
  }

  // 创建会话
  async createConversation(
    type: 'single' | 'group',
    userId: string,
    targetId: string
  ): Promise<Conversation> {
    const response = await this.request<Conversation>({
      method: 'POST',
      url: '/conversations',
      data: { type, userId, targetId },
    });
    return this.unwrapResponse(response);
  }

  // 更新会话
  async updateConversation(
    conversationId: string,
    data: { isPinned?: boolean; isMuted?: boolean }
  ): Promise<Conversation | null> {
    const response = await this.request<Conversation | null>({
      method: 'PUT',
      url: `/conversations/${conversationId}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 删除会话
  async deleteConversation(conversationId: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: `/conversations/${conversationId}`,
    });
    return this.unwrapResponse(response);
  }

  // 批量删除会话
  async batchDeleteConversations(ids: string[]): Promise<{ success: boolean; count: number }> {
    const response = await this.request<{ success: boolean; count: number }>({
      method: 'DELETE',
      url: '/conversations/batch',
      data: { ids },
    });
    return this.unwrapResponse(response);
  }

  // 置顶/取消置顶会话
  async pinConversation(conversationId: string, isPinned: boolean): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'PUT',
      url: `/conversations/${conversationId}/pin`,
      data: { isPinned },
    });
    return this.unwrapResponse(response);
  }

  // 设置免打扰
  async muteConversation(conversationId: string, isMuted: boolean): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'PUT',
      url: `/conversations/${conversationId}/mute`,
      data: { isMuted },
    });
    return this.unwrapResponse(response);
  }

  // 清空会话未读数
  async clearConversationUnread(conversationId: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'PUT',
      url: `/conversations/${conversationId}/read`,
    });
    return this.unwrapResponse(response);
  }

  // 获取未读消息总数
  async getTotalUnreadCount(userId: string): Promise<{ total: number }> {
    const response = await this.request<{ total: number }>({
      method: 'GET',
      url: `/conversations/unread-total/${userId}`,
    });
    return this.unwrapResponse(response);
  }

  // ==================== 消息相关 ====================

  // 发送消息
  async sendMessage(data: SendMessageParams): Promise<Message> {
    const response = await this.request<Message>({
      method: 'POST',
      url: '/messages',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 批量发送消息
  async batchSendMessages(messages: SendMessageParams[]): Promise<Message[]> {
    const response = await this.request<Message[]>({
      method: 'POST',
      url: '/messages/batch',
      data: { messages },
    });
    return this.unwrapResponse(response);
  }

  // 获取消息详情
  async getMessage(id: string): Promise<Message> {
    const response = await this.request<Message>({
      method: 'GET',
      url: `/messages/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 获取用户消息列表
  async getUserMessages(userId: string, options?: { limit?: number; offset?: number; cursor?: string }): Promise<Message[]> {
    const response = await this.request<Message[]>({
      method: 'GET',
      url: `/messages/user/${userId}`,
      params: options,
    });
    return this.unwrapResponse(response);
  }

  // 获取群组消息列表
  async getGroupMessages(groupId: string, options?: { limit?: number; offset?: number; cursor?: string }): Promise<Message[]> {
    const response = await this.request<Message[]>({
      method: 'GET',
      url: `/messages/group/${groupId}`,
      params: options,
    });
    return this.unwrapResponse(response);
  }

  // 更新消息状态
  async updateMessageStatus(id: string, status: MessageStatus | string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'PUT',
      url: `/messages/${id}/status`,
      data: { status },
    });
    return this.unwrapResponse(response);
  }

  // 删除消息
  async deleteMessage(messageId: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: `/messages/${messageId}`,
    });
    return this.unwrapResponse(response);
  }

  // 标记消息已读
  async markMessagesAsRead(userId: string, messageIds: string[]): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'POST',
      url: `/messages/${userId}/read`,
      data: { messageIds },
    });
    return this.unwrapResponse(response);
  }

  // 撤回消息
  async recallMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
    const response = await this.request<{ success: boolean; error?: string }>({
      method: 'POST',
      url: `/messages/${messageId}/recall`,
    });
    return this.unwrapResponse(response);
  }

  // 转发消息
  async forwardMessage(
    messageId: string,
    options: { toUserIds?: string[]; toGroupIds?: string[] }
  ): Promise<Message[]> {
    const response = await this.request<Message[]>({
      method: 'POST',
      url: `/messages/${messageId}/forward`,
      data: { messageId, ...options },
    });
    return this.unwrapResponse(response);
  }

  // 重试发送失败消息
  async retrySendMessage(messageId: string): Promise<{ success: boolean; message?: Message }> {
    const response = await this.request<{ success: boolean; message?: Message }>({
      method: 'POST',
      url: `/messages/${messageId}/retry`,
    });
    return this.unwrapResponse(response);
  }

  // 获取历史消息
  async getMessages(channelId: string, channelType: ChannelType, options?: QueryMessagesOptions): Promise<Message[]> {
    const response = await this.request<Message[]>({
      method: 'GET',
      url: '/messages',
      params: { channelId, channelType, ...options },
    });
    return this.unwrapResponse(response);
  }

  // ==================== 联系人相关 ====================

  // 获取联系人列表
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
    const response = await this.request<Contact[]>({
      method: 'GET',
      url: '/contacts',
      params: options as Record<string, any>,
    });
    return this.unwrapResponse(response);
  }

  // 获取联系人详情
  async getContactById(id: string): Promise<Contact | null> {
    const response = await this.request<Contact | null>({
      method: 'GET',
      url: `/contacts/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 创建联系人
  async createContact(data: {
    userId: string;
    contactId: string;
    type: 'user' | 'group';
    name: string;
    remark?: string;
    tags?: string[];
  }): Promise<Contact> {
    const response = await this.request<Contact>({
      method: 'POST',
      url: '/contacts',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 更新联系人
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
    const response = await this.request<Contact | null>({
      method: 'PUT',
      url: `/contacts/${id}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 删除联系人
  async deleteContact(id: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: `/contacts/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 批量删除联系人
  async batchDeleteContacts(ids: string[]): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: '/contacts/batch',
      data: { ids },
    });
    return this.unwrapResponse(response);
  }

  // 设置/取消收藏
  async setContactFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'PUT',
      url: `/contacts/${id}/favorite`,
      data: { isFavorite },
    });
    return this.unwrapResponse(response);
  }

  // 设置备注
  async setContactRemark(id: string, remark: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'PUT',
      url: `/contacts/${id}/remark`,
      data: { remark },
    });
    return this.unwrapResponse(response);
  }

  // 添加标签
  async addContactTag(id: string, tag: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'POST',
      url: `/contacts/${id}/tags`,
      data: { tag },
    });
    return this.unwrapResponse(response);
  }

  // 移除标签
  async removeContactTag(id: string, tag: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: `/contacts/${id}/tags/${tag}`,
    });
    return this.unwrapResponse(response);
  }

  // 搜索联系人
  async searchContacts(userId: string, keyword: string): Promise<Contact[]> {
    const response = await this.request<Contact[]>({
      method: 'GET',
      url: `/contacts/search/${userId}`,
      params: { keyword },
    });
    return this.unwrapResponse(response);
  }

  // 获取联系人统计
  async getContactStats(userId: string): Promise<any> {
    const response = await this.request<any>({
      method: 'GET',
      url: `/contacts/stats/${userId}`,
    });
    return this.unwrapResponse(response);
  }

  // ==================== Agent相关 ====================

  // 创建Agent
  async createAgent(data: CreateAgentParams): Promise<Agent> {
    const response = await this.request<Agent>({
      method: 'POST',
      url: '/agents',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取Agent列表
  async getAgents(isPublic?: boolean): Promise<Agent[]> {
    const response = await this.request<Agent[]>({
      method: 'GET',
      url: '/agents',
      params: isPublic !== undefined ? { public: isPublic.toString() } : undefined,
    });
    return this.unwrapResponse(response);
  }

  // 获取Agent详情
  async getAgent(id: string): Promise<Agent> {
    const response = await this.request<Agent>({
      method: 'GET',
      url: `/agents/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 更新Agent
  async updateAgent(id: string, data: UpdateAgentParams): Promise<Agent> {
    const response = await this.request<Agent>({
      method: 'PUT',
      url: `/agents/${id}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 删除Agent
  async deleteAgent(id: string): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>({
      method: 'DELETE',
      url: `/agents/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 创建会话
  async createAgentSession(agentId: string, data?: CreateSessionParams): Promise<AgentSession> {
    const response = await this.request<AgentSession>({
      method: 'POST',
      url: `/agents/${agentId}/sessions`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取会话列表
  async getAgentSessions(agentId: string, limit?: number): Promise<AgentSession[]> {
    const response = await this.request<AgentSession[]>({
      method: 'GET',
      url: `/agents/${agentId}/sessions`,
      params: limit !== undefined ? { limit } : undefined,
    });
    return this.unwrapResponse(response);
  }

  // 获取会话详情
  async getAgentSession(sessionId: string): Promise<AgentSession> {
    const response = await this.request<AgentSession>({
      method: 'GET',
      url: `/agents/sessions/${sessionId}`,
    });
    return this.unwrapResponse(response);
  }

  // 删除会话
  async deleteAgentSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>({
      method: 'DELETE',
      url: `/agents/sessions/${sessionId}`,
    });
    return this.unwrapResponse(response);
  }

  // 获取会话消息
  async getAgentSessionMessages(sessionId: string, limit?: number, offset?: number): Promise<AgentMessage[]> {
    const response = await this.request<AgentMessage[]>({
      method: 'GET',
      url: `/agents/sessions/${sessionId}/messages`,
      params: { limit, offset },
    });
    return this.unwrapResponse(response);
  }

  // 发送消息到Agent
  async sendMessageToAgent(sessionId: string, data: AgentSendMessageParams): Promise<{ id: string; role: string; content: string; createdAt: Date }> {
    const response = await this.request<{ id: string; role: string; content: string; createdAt: Date }>({
      method: 'POST',
      url: `/agents/sessions/${sessionId}/messages`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取Agent工具
  async getAgentTools(agentId: string): Promise<AgentTool[]> {
    const response = await this.request<AgentTool[]>({
      method: 'GET',
      url: `/agents/${agentId}/tools`,
    });
    return this.unwrapResponse(response);
  }

  // 添加工具到Agent
  async addToolToAgent(agentId: string, data: AddToolParams): Promise<AgentTool> {
    const response = await this.request<AgentTool>({
      method: 'POST',
      url: `/agents/${agentId}/tools`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取Agent技能
  async getAgentSkills(agentId: string): Promise<AgentSkill[]> {
    const response = await this.request<AgentSkill[]>({
      method: 'GET',
      url: `/agents/${agentId}/skills`,
    });
    return this.unwrapResponse(response);
  }

  // 添加技能到Agent
  async addSkillToAgent(agentId: string, data: AddSkillParams): Promise<AgentSkill> {
    const response = await this.request<AgentSkill>({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取可用工具
  async getAvailableTools(): Promise<AgentTool[]> {
    const response = await this.request<AgentTool[]>({
      method: 'GET',
      url: '/agents/tools/available',
    });
    return this.unwrapResponse(response);
  }

  // 获取可用技能
  async getAvailableSkills(): Promise<AgentSkill[]> {
    const response = await this.request<AgentSkill[]>({
      method: 'GET',
      url: '/agents/skills/available',
    });
    return this.unwrapResponse(response);
  }

  // 启动Agent
  async startAgent(id: string): Promise<{ runtimeId: string; status: string }> {
    const response = await this.request<{ runtimeId: string; status: string }>({
      method: 'POST',
      url: `/agents/${id}/start`,
    });
    return this.unwrapResponse(response);
  }

  // 停止Agent
  async stopAgent(id: string): Promise<{ status: string }> {
    const response = await this.request<{ status: string }>({
      method: 'POST',
      url: `/agents/${id}/stop`,
    });
    return this.unwrapResponse(response);
  }

  // 重置Agent
  async resetAgent(id: string): Promise<{ status: string }> {
    const response = await this.request<{ status: string }>({
      method: 'POST',
      url: `/agents/${id}/reset`,
    });
    return this.unwrapResponse(response);
  }

  // ==================== AI Bot相关 ====================

  // 创建AI Bot
  async createAIBot(data: CreateAIBotParams): Promise<AIBot> {
    const response = await this.request<AIBot>({
      method: 'POST',
      url: '/ai-bots',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取AI Bot列表
  async getAIBots(): Promise<AIBot[]> {
    const response = await this.request<AIBot[]>({
      method: 'GET',
      url: '/ai-bots',
    });
    return this.unwrapResponse(response);
  }

  // 获取AI Bot详情
  async getAIBot(id: string): Promise<AIBot | null> {
    const response = await this.request<AIBot | null>({
      method: 'GET',
      url: `/ai-bots/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 更新AI Bot
  async updateAIBot(id: string, data: UpdateAIBotParams): Promise<AIBot> {
    const response = await this.request<AIBot>({
      method: 'PUT',
      url: `/ai-bots/${id}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 删除AI Bot
  async deleteAIBot(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/ai-bots/${id}`,
    });
  }

  // 激活AI Bot
  async activateAIBot(id: string): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>({
      method: 'POST',
      url: `/ai-bots/${id}/activate`,
    });
    return this.unwrapResponse(response);
  }

  // 停用AI Bot
  async deactivateAIBot(id: string): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>({
      method: 'POST',
      url: `/ai-bots/${id}/deactivate`,
    });
    return this.unwrapResponse(response);
  }

  // 处理Bot消息
  async processAIBotMessage(botId: string, data: ProcessBotMessageParams): Promise<BotMessage> {
    const response = await this.request<BotMessage>({
      method: 'POST',
      url: `/ai-bots/${botId}/messages`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // ==================== 机器人平台相关 ====================

  // 创建Bot
  async createPlatformBot(data: CreateBotParams): Promise<{ bot: BotResponse; token: string }> {
    const response = await this.request<{ bot: BotResponse; token: string }>({
      method: 'POST',
      url: '/bots',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取Bot列表
  async getPlatformBots(params?: BotListQuery): Promise<BotListResponse> {
    const response = await this.request<BotListResponse>({
      method: 'GET',
      url: '/bots',
      params,
    });
    return this.unwrapResponse(response);
  }

  // 获取Bot详情
  async getPlatformBot(id: string): Promise<BotResponse> {
    const response = await this.request<BotResponse>({
      method: 'GET',
      url: `/bots/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 更新Bot
  async updatePlatformBot(id: string, data: UpdateBotParams): Promise<BotResponse> {
    const response = await this.request<BotResponse>({
      method: 'PUT',
      url: `/bots/${id}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 重新生成Token
  async regeneratePlatformBotToken(id: string): Promise<{ token: string }> {
    const response = await this.request<{ token: string }>({
      method: 'POST',
      url: `/bots/${id}/regenerate-token`,
    });
    return this.unwrapResponse(response);
  }

  // 删除Bot
  async deletePlatformBot(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/bots/${id}`,
    });
  }

  // 设置Webhook
  async setPlatformBotWebhook(id: string, data: SetWebhookParams): Promise<BotResponse> {
    const response = await this.request<BotResponse>({
      method: 'POST',
      url: `/bots/${id}/webhook`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 删除Webhook
  async deletePlatformBotWebhook(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/bots/${id}/webhook`,
    });
  }

  // ==================== RTC相关 ====================

  // 创建RTC房间
  async createRTCRoom(data: CreateRTCRoomParams): Promise<RTCRoom> {
    const response = await this.request<RTCRoom>({
      method: 'POST',
      url: '/rtc/rooms',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 结束RTC房间
  async endRTCRoom(id: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'PUT',
      url: `/rtc/rooms/${id}/end`,
    });
    return this.unwrapResponse(response);
  }

  // 获取RTC房间详情
  async getRTCRoomById(id: string): Promise<RTCRoom | null> {
    const response = await this.request<RTCRoom | null>({
      method: 'GET',
      url: `/rtc/rooms/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 获取用户的RTC房间列表
  async getRTCRoomsByUserId(userId: string): Promise<RTCRoom[]> {
    const response = await this.request<RTCRoom[]>({
      method: 'GET',
      url: `/rtc/rooms/user/${userId}`,
    });
    return this.unwrapResponse(response);
  }

  // 生成RTC token
  async generateRTCToken(data: GenerateRTCTokenParams): Promise<RTCToken> {
    const response = await this.request<RTCToken>({
      method: 'POST',
      url: '/rtc/tokens',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 验证RTC token
  async validateRTCToken(token: string): Promise<RTCToken | null> {
    const response = await this.request<RTCToken | null>({
      method: 'GET',
      url: '/rtc/tokens/validate',
      params: { token },
    });
    return this.unwrapResponse(response);
  }

  // 添加RTC房间参与者
  async addRTCParticipant(roomId: string, userId: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'POST',
      url: `/rtc/rooms/${roomId}/participants`,
      data: { userId },
    });
    return this.unwrapResponse(response);
  }

  // 移除RTC房间参与者
  async removeRTCParticipant(roomId: string, userId: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: `/rtc/rooms/${roomId}/participants/${userId}`,
    });
    return this.unwrapResponse(response);
  }

  // 创建RTC Channel配置
  async createRTCChannel(data: CreateRTCChannelParams): Promise<RTCChannelEntity> {
    const response = await this.request<RTCChannelEntity>({
      method: 'POST',
      url: '/rtc/channels',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取所有RTC Channel配置
  async getRTCChannels(): Promise<RTCChannelEntity[]> {
    const response = await this.request<RTCChannelEntity[]>({
      method: 'GET',
      url: '/rtc/channels',
    });
    return this.unwrapResponse(response);
  }

  // 获取单个RTC Channel配置
  async getRTCChannel(id: string): Promise<RTCChannelEntity | null> {
    const response = await this.request<RTCChannelEntity | null>({
      method: 'GET',
      url: `/rtc/channels/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 更新RTC Channel配置
  async updateRTCChannel(id: string, data: UpdateRTCChannelParams): Promise<RTCChannelEntity | null> {
    const response = await this.request<RTCChannelEntity | null>({
      method: 'PUT',
      url: `/rtc/channels/${id}`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 删除RTC Channel配置
  async deleteRTCChannel(id: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: `/rtc/channels/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 创建视频记录
  async createVideoRecord(data: CreateVideoRecordParams): Promise<RTCVideoRecord> {
    const response = await this.request<RTCVideoRecord>({
      method: 'POST',
      url: '/rtc/video-records',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取视频记录详情
  async getVideoRecord(id: string): Promise<RTCVideoRecord | null> {
    const response = await this.request<RTCVideoRecord | null>({
      method: 'GET',
      url: `/rtc/video-records/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 获取房间的视频记录列表
  async getVideoRecordsByRoomId(roomId: string): Promise<RTCVideoRecord[]> {
    const response = await this.request<RTCVideoRecord[]>({
      method: 'GET',
      url: `/rtc/rooms/${roomId}/video-records`,
    });
    return this.unwrapResponse(response);
  }

  // 获取用户的视频记录列表
  async getVideoRecordsByUserId(userId: string): Promise<RTCVideoRecord[]> {
    const response = await this.request<RTCVideoRecord[]>({
      method: 'GET',
      url: `/rtc/users/${userId}/video-records`,
    });
    return this.unwrapResponse(response);
  }

  // 更新视频记录状态
  async updateVideoRecordStatus(id: string, data: UpdateVideoRecordStatusParams): Promise<RTCVideoRecord | null> {
    const response = await this.request<RTCVideoRecord | null>({
      method: 'PUT',
      url: `/rtc/video-records/${id}/status`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 更新视频记录元数据
  async updateVideoRecordMetadata(id: string, metadata: string): Promise<RTCVideoRecord | null> {
    const response = await this.request<RTCVideoRecord | null>({
      method: 'PUT',
      url: `/rtc/video-records/${id}/metadata`,
      data: { metadata },
    });
    return this.unwrapResponse(response);
  }

  // 删除视频记录
  async deleteVideoRecord(id: string): Promise<boolean> {
    const response = await this.request<boolean>({
      method: 'DELETE',
      url: `/rtc/video-records/${id}`,
    });
    return this.unwrapResponse(response);
  }

  // 获取所有视频记录（分页）
  async getVideoRecords(limit?: number, offset?: number): Promise<RTCVideoRecord[]> {
    const response = await this.request<RTCVideoRecord[]>({
      method: 'GET',
      url: '/rtc/video-records',
      params: { limit, offset },
    });
    return this.unwrapResponse(response);
  }

  // ==================== IoT相关 ====================

  // 注册设备
  async registerDevice(data: RegisterDeviceParams): Promise<Device> {
    const response = await this.request<Device>({
      method: 'POST',
      url: '/iot/devices',
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取设备列表
  async getDevices(params?: DeviceListQuery): Promise<DeviceListResponse> {
    const response = await this.request<DeviceListResponse>({
      method: 'GET',
      url: '/iot/devices',
      params,
    });
    return this.unwrapResponse(response);
  }

  // 获取设备详情
  async getDevice(deviceId: string): Promise<Device> {
    const response = await this.request<Device>({
      method: 'GET',
      url: `/iot/devices/${deviceId}`,
    });
    return this.unwrapResponse(response);
  }

  // 更新设备状态
  async updateDeviceStatus(deviceId: string, data: UpdateDeviceStatusParams): Promise<Device> {
    const response = await this.request<Device>({
      method: 'PUT',
      url: `/iot/devices/${deviceId}/status`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 删除设备
  async deleteDevice(deviceId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/iot/devices/${deviceId}`,
    });
  }

  // 发送消息到设备
  async sendMessageToDevice(deviceId: string, data: SendDeviceMessageParams): Promise<DeviceMessage> {
    const response = await this.request<DeviceMessage>({
      method: 'POST',
      url: `/iot/devices/${deviceId}/messages`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取设备消息历史
  async getDeviceMessages(deviceId: string, limit?: number, before?: string): Promise<DeviceMessage[]> {
    const response = await this.request<DeviceMessage[]>({
      method: 'GET',
      url: `/iot/devices/${deviceId}/messages`,
      params: { limit, before },
    });
    return this.unwrapResponse(response);
  }

  // 控制设备
  async controlDevice(deviceId: string, data: ControlDeviceParams): Promise<any> {
    const response = await this.request<any>({
      method: 'POST',
      url: `/iot/devices/${deviceId}/control`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // ==================== 消息搜索相关 ====================

  // 搜索消息
  async searchMessages(params: SearchMessagesQuery): Promise<MessageSearchResult> {
    const response = await this.request<MessageSearchResult>({
      method: 'GET',
      url: '/messages/search',
      params,
    });
    return this.unwrapResponse(response);
  }

  // 快速搜索
  async quickSearchMessages(keyword: string, limit?: number): Promise<QuickSearchResult> {
    const response = await this.request<QuickSearchResult>({
      method: 'GET',
      url: '/messages/search/quick',
      params: { keyword, limit },
    });
    return this.unwrapResponse(response);
  }

  // 搜索特定会话的消息
  async searchMessagesInConversation(params: SearchInConversationQuery): Promise<MessageSearchResult> {
    const response = await this.request<MessageSearchResult>({
      method: 'GET',
      url: '/messages/search/conversation',
      params,
    });
    return this.unwrapResponse(response);
  }

  // 获取消息统计
  async getMessageStats(params?: MessageStatsQuery): Promise<MessageStats> {
    const response = await this.request<MessageStats>({
      method: 'GET',
      url: '/messages/search/stats',
      params,
    });
    return this.unwrapResponse(response);
  }

  // ==================== 健康检查相关 ====================

  // 基础健康检查
  async checkHealth(): Promise<BasicHealthCheck> {
    const response = await this.request<BasicHealthCheck>({
      method: 'GET',
      url: '/health',
    });
    return this.unwrapResponse(response);
  }

  // 详细健康检查
  async checkDetailedHealth(): Promise<HealthStatus> {
    const response = await this.request<HealthStatus>({
      method: 'GET',
      url: '/health/detailed',
    });
    return this.unwrapResponse(response);
  }

  // 就绪检查
  async checkReady(): Promise<ReadyCheck> {
    const response = await this.request<ReadyCheck>({
      method: 'GET',
      url: '/ready',
    });
    return this.unwrapResponse(response);
  }

  // 存活检查
  async checkLive(): Promise<LiveCheck> {
    const response = await this.request<LiveCheck>({
      method: 'GET',
      url: '/live',
    });
    return this.unwrapResponse(response);
  }

  // ==================== 第三方集成相关 ====================

  // 发送第三方平台消息
  async sendThirdPartyMessage(
    platform: ThirdPartyPlatform,
    data: SendThirdPartyMessageParams
  ): Promise<ThirdPartyMessage> {
    const response = await this.request<ThirdPartyMessage>({
      method: 'POST',
      url: `/third-party/${platform}/messages`,
      data,
    });
    return this.unwrapResponse(response);
  }

  // 获取第三方平台消息状态
  async getThirdPartyMessageStatus(
    platform: ThirdPartyPlatform,
    messageId: string
  ): Promise<string> {
    const response = await this.request<string>({
      method: 'GET',
      url: `/third-party/${platform}/messages/${messageId}/status`,
    });
    return this.unwrapResponse(response);
  }

  // 同步第三方平台联系人
  async syncThirdPartyContacts(
    platform: ThirdPartyPlatform,
    userId: string
  ): Promise<any[]> {
    const response = await this.request<any[]>({
      method: 'POST',
      url: `/third-party/${platform}/contacts/sync`,
      data: { userId },
    });
    return this.unwrapResponse(response);
  }

  // 获取第三方平台联系人
  async getThirdPartyContact(
    platform: ThirdPartyPlatform,
    params: GetContactParams
  ): Promise<any | null> {
    const response = await this.request<any | null>({
      method: 'GET',
      url: `/third-party/${platform}/contacts`,
      params,
    });
    return this.unwrapResponse(response);
  }

  // ==================== 记忆管理相关 ====================

  // 获取记忆列表
  async getMemories(agentId: string, params?: MemoryQueryParams): Promise<Memory[]> {
    const response = await this.request<Memory[]>({
      method: 'GET',
      url: `/agents/${agentId}/memory`,
      params,
    });
    return this.unwrapResponse(response);
  }

  // 搜索记忆
  async searchMemories(agentId: string, params: MemorySearchParams): Promise<SearchResult<Memory>[]> {
    const response = await this.request<SearchResult<Memory>[]>({
      method: 'GET',
      url: `/agents/${agentId}/memory/search`,
      params,
    });
    return this.unwrapResponse(response);
  }

  // 语义搜索记忆
  async semanticSearchMemories(agentId: string, params: SemanticSearchParams): Promise<SearchResult<Memory>[]> {
    const response = await this.request<SearchResult<Memory>[]>({
      method: 'GET',
      url: `/agents/${agentId}/memory/semantic-search`,
      params,
    });
    return this.unwrapResponse(response);
  }

  // 获取记忆统计
  async getMemoryStats(agentId: string): Promise<MemoryStats> {
    const response = await this.request<MemoryStats>({
      method: 'GET',
      url: `/agents/${agentId}/memory/stats`,
    });
    return this.unwrapResponse(response);
  }

  // 存储记忆
  async storeMemory(agentId: string, params: StoreMemoryParams): Promise<Memory> {
    const response = await this.request<Memory>({
      method: 'POST',
      url: `/agents/${agentId}/memory`,
      data: params,
    });
    return this.unwrapResponse(response);
  }

  // 删除记忆
  async deleteMemory(agentId: string, memoryId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/agents/${agentId}/memory/${memoryId}`,
    });
  }

  // 整合记忆
  async consolidateMemories(agentId: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/agents/${agentId}/memory/consolidate`,
    });
  }

  // ==================== 会话记忆相关 ====================

  // 获取会话历史
  async getSessionHistory(agentId: string, sessionId: string): Promise<SessionHistory> {
    const response = await this.request<SessionHistory>({
      method: 'GET',
      url: `/agents/${agentId}/memory/sessions/${sessionId}/history`,
    });
    return this.unwrapResponse(response);
  }

  // 总结会话
  async summarizeSession(agentId: string, sessionId: string, params?: SummarizeSessionParams): Promise<SessionSummary> {
    const response = await this.request<SessionSummary>({
      method: 'POST',
      url: `/agents/${agentId}/memory/sessions/${sessionId}/summarize`,
      data: params,
    });
    return this.unwrapResponse(response);
  }

  // 清空会话记忆
  async clearSessionMemory(agentId: string, sessionId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/agents/${agentId}/memory/sessions/${sessionId}`,
    });
  }

  // ==================== 知识文档相关 ====================

  // 获取知识文档列表
  async getKnowledgeDocuments(agentId: string, params?: KnowledgeQueryParams): Promise<PaginatedResponse<KnowledgeDocument>> {
    const response = await this.request<PaginatedResponse<KnowledgeDocument>>({
      method: 'GET',
      url: `/agents/${agentId}/memory/knowledge`,
      params,
    });
    return this.unwrapResponse(response);
  }

  // 添加知识文档
  async addKnowledgeDocument(agentId: string, params: AddKnowledgeDocumentParams): Promise<KnowledgeDocument> {
    const response = await this.request<KnowledgeDocument>({
      method: 'POST',
      url: `/agents/${agentId}/memory/knowledge`,
      data: params,
    });
    return this.unwrapResponse(response);
  }

  // 搜索知识文档
  async searchKnowledge(agentId: string, params: KnowledgeSearchParams): Promise<SearchResult<KnowledgeDocument>[]> {
    const response = await this.request<SearchResult<KnowledgeDocument>[]>({
      method: 'GET',
      url: `/agents/${agentId}/memory/knowledge/search`,
      params,
    });
    return this.unwrapResponse(response);
  }

  // 获取知识统计
  async getKnowledgeStats(agentId: string): Promise<KnowledgeStats> {
    const response = await this.request<KnowledgeStats>({
      method: 'GET',
      url: `/agents/${agentId}/memory/knowledge/stats`,
    });
    return this.unwrapResponse(response);
  }

  // 获取知识文档详情
  async getKnowledgeDocument(agentId: string, documentId: string): Promise<KnowledgeDocument> {
    const response = await this.request<KnowledgeDocument>({
      method: 'GET',
      url: `/agents/${agentId}/memory/knowledge/${documentId}`,
    });
    return this.unwrapResponse(response);
  }

  // 删除知识文档
  async deleteKnowledgeDocument(agentId: string, documentId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/agents/${agentId}/memory/knowledge/${documentId}`,
    });
  }

  // 获取文档片段
  async getDocumentChunks(agentId: string, documentId: string): Promise<DocumentChunk[]> {
    const response = await this.request<DocumentChunk[]>({
      method: 'GET',
      url: `/agents/${agentId}/memory/knowledge/${documentId}/chunks`,
    });
    return this.unwrapResponse(response);
  }

  // ==================== 私有方法 ====================

  // 生成缓存键
  private generateCacheKey(options: RequestOptions): string {
    const { method, url, params, data } = options;
    if (method !== 'GET') return '';
    
    const queryString = params ? JSON.stringify(params) : '';
    return `${url}?${queryString}`;
  }

  // 发送HTTP请求
  private async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const { 
      method, 
      url, 
      data, 
      params, 
      headers: customHeaders,
      retry = true,
      retryCount = 3,
      retryDelay = 1000,
      cache = true,
      cacheTTL = this.config.server.cache?.defaultTTL || 300000
    } = options;

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.server.headers,
      ...customHeaders,
    };

    // 添加认证Token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // 添加API Key
    if (this.config.server.apiKey) {
      headers['X-API-Key'] = this.config.server.apiKey;
    }

    const requestConfig: HttpRequestConfig = {
      url: `${this.config.server.baseUrl}/im/api/v1${url}`,
      method,
      headers,
      data,
      params,
    };

    // 尝试从缓存获取
    if (cache && method === 'GET') {
      const cacheKey = this.generateCacheKey(options);
      if (cacheKey) {
        const cachedData = this.cache.get<ApiResponse<T>>(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
    }

    let attempts = 0;
    let lastError: any = null;

    while (attempts <= retryCount) {
      try {
        // 使用平台特定的HTTP客户端发送请求
        const response = await this.httpClient<ApiResponse<T>>(requestConfig);
        const result = response.data;

        // 处理错误
        if (response.status < 200 || response.status >= 300) {
          throw this.createError(
            this.mapHttpStatusToErrorCode(response.status),
            result.message || 'Request failed',
            result
          );
        }

        // 缓存成功的GET请求响应
        if (cache && method === 'GET') {
          const cacheKey = this.generateCacheKey(options);
          if (cacheKey) {
            this.cache.set(cacheKey, result, cacheTTL);
          }
        }

        return result;
      } catch (error) {
        lastError = error;
        attempts++;

        // 检查是否需要重试
        if (!retry || attempts > retryCount) {
          break;
        }

        // 检查是否是可以重试的错误类型
        const isRetryableError = this.isRetryableError(error);
        if (!isRetryableError) {
          break;
        }

        // 指数退避
        const delay = retryDelay * Math.pow(2, attempts - 1);
        await sleep(delay);
      }
    }

    if (lastError instanceof Error && lastError.name === 'OpenChatError') {
      throw lastError;
    }

    throw this.createError(
      ErrorCode.NETWORK_ERROR,
      lastError instanceof Error ? lastError.message : 'Network error',
      lastError
    );
  }

  // 检查是否是可重试的错误
  private isRetryableError(error: any): boolean {
    // 网络错误、超时等可以重试
    if (error instanceof Error && error.message.includes('network') || 
        error instanceof Error && error.message.includes('timeout') ||
        error instanceof Error && error.message.includes('connection')) {
      return true;
    }
    return false;
  }

  // 解包响应
  private unwrapResponse<T>(response: ApiResponse<T>): T {
    if (response.code !== 0 && response.code !== 200) {
      throw this.createError(
        ErrorCode.UNKNOWN_ERROR,
        response.message || 'Request failed',
        response
      );
    }
    
    if (response.data === undefined) {
      throw this.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Response data is undefined',
        response
      );
    }
    
    return response.data;
  }

  // 映射HTTP状态码到错误码
  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 401:
        return ErrorCode.AUTH_FAILED;
      case 403:
        return ErrorCode.AUTH_FAILED;
      case 404:
        return ErrorCode.UNKNOWN_ERROR;
      case 409:
        return ErrorCode.UNKNOWN_ERROR;
      case 500:
      case 502:
      case 503:
        return ErrorCode.NETWORK_ERROR;
      default:
        return ErrorCode.UNKNOWN_ERROR;
    }
  }

  // 创建错误
  private createError(code: ErrorCode, message: string, data?: any): OpenChatError {
    const error = new Error(message) as OpenChatError;
    error.code = code;
    error.data = data;
    return error;
  }
}
