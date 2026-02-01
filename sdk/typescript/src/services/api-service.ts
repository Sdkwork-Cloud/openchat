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
} from '../types';
import { createHttpClient, HttpClient, HttpRequestConfig } from '../utils/http-client';

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
}

export class ApiService {
  private config: OpenChatSDKConfig;
  private token: string | null = null;
  private httpClient: HttpClient;

  constructor(config: OpenChatSDKConfig) {
    this.config = config;
    this.token = config.token;
    this.httpClient = createHttpClient();
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
  async register(username: string, password: string, nickname?: string): Promise<UserInfo> {
    const response = await this.request<UserInfo>({
      method: 'POST',
      url: '/auth/register',
      data: { username, password, nickname },
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
  async logout(): Promise<void> {
    await this.request({
      method: 'POST',
      url: '/auth/logout',
    });
    this.setToken(null);
  }

  // 刷新Token
  async refreshToken(): Promise<string> {
    const response = await this.request<{ token: string }>({
      method: 'POST',
      url: '/auth/refresh',
    });
    
    const data = this.unwrapResponse(response);
    this.setToken(data.token);
    return data.token;
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
      url: '/users/search',
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

  // ==================== 会话相关 ====================

  // 获取会话列表
  async getConversations(options?: QueryConversationsOptions): Promise<Conversation[]> {
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

  // 删除会话
  async deleteConversation(conversationId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/conversations/${conversationId}`,
    });
  }

  // 置顶会话
  async pinConversation(conversationId: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/conversations/${conversationId}/pin`,
      data: { isPinned: true },
    });
  }

  // 取消置顶
  async unpinConversation(conversationId: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/conversations/${conversationId}/pin`,
      data: { isPinned: false },
    });
  }

  // 免打扰
  async muteConversation(conversationId: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/conversations/${conversationId}/mute`,
      data: { isMuted: true },
    });
  }

  // 取消免打扰
  async unmuteConversation(conversationId: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/conversations/${conversationId}/mute`,
      data: { isMuted: false },
    });
  }

  // 清空会话未读数
  async clearConversationUnread(conversationId: string): Promise<void> {
    await this.request({
      method: 'PUT',
      url: `/conversations/${conversationId}/read`,
    });
  }

  // ==================== 消息相关 ====================

  // 获取历史消息
  async getMessages(channelId: string, channelType: ChannelType, options?: QueryMessagesOptions): Promise<any[]> {
    const response = await this.request<any[]>({
      method: 'GET',
      url: '/messages',
      params: { channelId, channelType, ...options },
    });
    return this.unwrapResponse(response);
  }

  // 撤回消息
  async recallMessage(messageId: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/messages/${messageId}/recall`,
    });
  }

  // 删除消息
  async deleteMessage(messageId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/messages/${messageId}`,
    });
  }

  // ==================== 联系人相关 ====================

  // 获取联系人列表
  async getContacts(): Promise<Contact[]> {
    const response = await this.request<Contact[]>({
      method: 'GET',
      url: '/contacts',
    });
    return this.unwrapResponse(response);
  }

  // 搜索联系人
  async searchContacts(keyword: string): Promise<Contact[]> {
    const response = await this.request<Contact[]>({
      method: 'GET',
      url: '/contacts/search',
      params: { keyword },
    });
    return this.unwrapResponse(response);
  }

  // ==================== 私有方法 ====================

  // 发送HTTP请求
  private async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const { method, url, data, params, headers: customHeaders } = options;

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // 添加认证Token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // 添加API Key
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const requestConfig: HttpRequestConfig = {
      url: `${this.config.apiBaseUrl}${url}`,
      method,
      headers,
      data,
      params,
    };

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

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'OpenChatError') {
        throw error;
      }

      throw this.createError(
        ErrorCode.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network error',
        error
      );
    }
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
