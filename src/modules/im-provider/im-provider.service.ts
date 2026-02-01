import { Inject, Injectable } from '@nestjs/common';
import { IMProvider, IMProviderConfig, IMMessage, IMUser, IMGroup, IMConnectionStatus } from './im-provider.interface';

@Injectable()
export class IMProviderService {
  private currentProvider: IMProvider | null = null;

  constructor(
    @Inject('IMProviderFactory')
    private providerFactory: any
  ) {}

  /**
   * 初始化IM Provider
   * @param providerName Provider名称
   * @param config Provider配置
   */
  async initializeProvider(providerName: string, config: IMProviderConfig): Promise<void> {
    // 创建Provider实例
    this.currentProvider = this.providerFactory.createProvider(providerName);
    // 初始化Provider
    if (this.currentProvider) {
      await this.currentProvider.initialize(config);
    }
  }

  /**
   * 发送消息
   * @param message 消息内容
   */
  async sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateProviderInitialized();
    return this.currentProvider!.sendMessage(message);
  }

  /**
   * 发送群消息
   * @param message 消息内容
   */
  async sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateProviderInitialized();
    return this.currentProvider!.sendGroupMessage(message);
  }

  /**
   * 获取消息历史
   * @param conversationId 会话ID
   * @param limit 消息数量限制
   * @param before 时间戳
   */
  async getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateProviderInitialized();
    return this.currentProvider!.getMessageHistory(conversationId, limit, before);
  }

  /**
   * 获取群消息历史
   * @param groupId 群组ID
   * @param limit 消息数量限制
   * @param before 时间戳
   */
  async getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateProviderInitialized();
    return this.currentProvider!.getGroupMessageHistory(groupId, limit, before);
  }

  /**
   * 标记消息已读
   * @param messageId 消息ID
   */
  async markMessageAsRead(messageId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.markMessageAsRead(messageId);
  }

  /**
   * 标记所有消息已读
   * @param conversationId 会话ID
   */
  async markAllMessagesAsRead(conversationId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.markAllMessagesAsRead(conversationId);
  }

  /**
   * 创建用户
   * @param user 用户信息
   */
  async createUser(user: Omit<IMUser, 'id'>): Promise<IMUser> {
    this.validateProviderInitialized();
    return this.currentProvider!.createUser(user);
  }

  /**
   * 获取用户信息
   * @param userId 用户ID
   */
  async getUserInfo(userId: string): Promise<IMUser | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.getUserInfo(userId);
  }

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param user 用户信息
   */
  async updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.updateUserInfo(userId, user);
  }

  /**
   * 创建群组
   * @param group 群组信息
   */
  async createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup> {
    this.validateProviderInitialized();
    return this.currentProvider!.createGroup(group);
  }

  /**
   * 获取群组信息
   * @param groupId 群组ID
   */
  async getGroupInfo(groupId: string): Promise<IMGroup | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.getGroupInfo(groupId);
  }

  /**
   * 更新群组信息
   * @param groupId 群组ID
   * @param group 群组信息
   */
  async updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.updateGroupInfo(groupId, group);
  }

  /**
   * 添加群成员
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async addGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.addGroupMember(groupId, userId);
  }

  /**
   * 移除群成员
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.removeGroupMember(groupId, userId);
  }

  /**
   * 加入群组
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.joinGroup(groupId, userId);
  }

  /**
   * 离开群组
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.leaveGroup(groupId, userId);
  }

  /**
   * 建立连接
   * @param userId 用户ID
   * @param token 认证令牌
   */
  async connect(userId: string, token?: string): Promise<IMConnectionStatus> {
    this.validateProviderInitialized();
    return this.currentProvider!.connect(userId, token);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.disconnect();
  }

  /**
   * 订阅消息
   * @param callback 回调函数
   */
  subscribeToMessages(callback: (message: IMMessage) => void): void {
    this.validateProviderInitialized();
    this.currentProvider!.subscribeToMessages(callback);
  }

  /**
   * 订阅连接状态
   * @param callback 回调函数
   */
  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void {
    this.validateProviderInitialized();
    this.currentProvider!.subscribeToConnectionStatus(callback);
  }

  /**
   * 订阅用户状态
   * @param callback 回调函数
   */
  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline') => void): void {
    this.validateProviderInitialized();
    this.currentProvider!.subscribeToUserStatus(callback);
  }

  /**
   * 生成认证令牌
   * @param userId 用户ID
   * @param expiresIn 过期时间
   */
  async generateToken(userId: string, expiresIn?: number): Promise<string> {
    this.validateProviderInitialized();
    return this.currentProvider!.generateToken(userId, expiresIn);
  }

  /**
   * 验证令牌
   * @param token 认证令牌
   */
  async validateToken(token: string): Promise<{ userId: string; valid: boolean }> {
    this.validateProviderInitialized();
    return this.currentProvider!.validateToken(token);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.healthCheck();
  }

  /**
   * 获取当前Provider名称
   */
  getCurrentProviderName(): string {
    this.validateProviderInitialized();
    return this.currentProvider!.getProviderName();
  }

  /**
   * 获取支持的Provider列表
   */
  getSupportedProviders(): string[] {
    return this.providerFactory.getSupportedProviders();
  }

  /**
   * 验证Provider是否已初始化
   */
  private validateProviderInitialized(): void {
    if (!this.currentProvider) {
      throw new Error('IM Provider not initialized');
    }
  }
}
