/**
 * 悟空IM Provider V2
 * 修复版 - 使用正确的API端点和消息格式
 */

import { IMProviderBase } from '../../im-provider.base';
import {
  IMMessage,
  IMUser,
  IMGroup,
  IMConnectionStatus,
  IMProviderConfig,
} from '../../im-provider.interface';
import axios, { AxiosInstance } from 'axios';
import {
  WUKONGIM_ENDPOINTS,
  WukongIMChannelType,
} from '../../../wukongim/wukongim.constants';

/**
 * 悟空IM消息格式
 */
interface WukongIMMessagePayload {
  channel_id: string;
  channel_type: number;
  from_uid: string;
  payload: string;  // Base64编码
  client_msg_no?: string;
}

/**
 * 悟空IM Provider V2实现
 */
export class WukongIMProviderV2 extends IMProviderBase {
  private axiosInstance: AxiosInstance | null = null;
  private isConnected: boolean = false;
  private baseUrl: string = '';

  getProviderName(): string {
    return 'wukongim';
  }

  async initialize(config: IMProviderConfig): Promise<void> {
    await super.initialize(config);

    this.baseUrl = config.endpoint || 'http://localhost:5001';

    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      // 优化配置
      maxRedirects: 5,
      maxContentLength: 5 * 1024 * 1024, // 5MB
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // 添加认证头
    if (config.apiKey) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // 添加请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 可以在这里添加请求ID或其他自定义逻辑
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // 可以在这里添加错误处理逻辑
        return Promise.reject(error);
      }
    );

    this.isConnected = true;
  }

  // ==================== 消息相关 ====================

  /**
   * 发送消息
   * 使用正确的悟空IM API格式
   */
  async sendMessage(
    message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>,
  ): Promise<IMMessage> {
    this.validateInitialized();

    try {
      // 生成单聊频道ID
      const channelId = this.generatePersonalChannelId(message.from, message.to);

      // 构建悟空IM消息格式
      const payload: WukongIMMessagePayload = {
        channel_id: channelId,
        channel_type: WukongIMChannelType.PERSON,
        from_uid: message.from,
        payload: this.encodePayload({
          type: message.type,
          content: message.content,
        }),
        client_msg_no: message.from + Date.now(),
      };

      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.MESSAGE_SEND,
        payload,
      );

      return {
        id: response.data.message_id || response.data.client_msg_no,
        type: message.type,
        content: message.content,
        from: message.from,
        to: message.to,
        timestamp: Date.now(),
        status: 'sent',
      };
    } catch (error: any) {
      console.error('Error sending message:', error.message);
      throw error;
    }
  }

  /**
   * 发送群消息
   */
  async sendGroupMessage(
    message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>,
  ): Promise<IMMessage> {
    this.validateInitialized();

    try {
      // 群聊直接使用groupId作为频道ID
      const channelId = message.roomId || message.to;

      const payload: WukongIMMessagePayload = {
        channel_id: channelId,
        channel_type: WukongIMChannelType.GROUP,
        from_uid: message.from,
        payload: this.encodePayload({
          type: message.type,
          content: message.content,
        }),
        client_msg_no: message.from + Date.now(),
      };

      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.MESSAGE_SEND,
        payload,
      );

      return {
        id: response.data.message_id || response.data.client_msg_no,
        type: message.type,
        content: message.content,
        from: message.from,
        to: message.to,
        roomId: message.roomId,
        timestamp: Date.now(),
        status: 'sent',
      };
    } catch (error: any) {
      console.error('Error sending group message:', error.message);
      throw error;
    }
  }

  /**
   * 批量发送消息
   */
  async sendBatchMessages(
    messages: Omit<IMMessage, 'id' | 'timestamp' | 'status'>[],
  ): Promise<IMMessage[]> {
    this.validateInitialized();

    try {
      const payloads = messages.map((msg) => {
        const isGroup = !!msg.roomId;
        const channelId = isGroup
          ? msg.roomId!
          : this.generatePersonalChannelId(msg.from, msg.to);

        return {
          channel_id: channelId,
          channel_type: isGroup ? WukongIMChannelType.GROUP : WukongIMChannelType.PERSON,
          from_uid: msg.from,
          payload: this.encodePayload({
            type: msg.type,
            content: msg.content,
          }),
          client_msg_no: msg.from + Date.now(),
        };
      });

      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.MESSAGE_SEND_BATCH,
        payloads,
      );

      return messages.map((msg, index) => ({
        id: response.data[index]?.message_id || msg.from + Date.now() + index,
        type: msg.type,
        content: msg.content,
        from: msg.from,
        to: msg.to,
        roomId: msg.roomId,
        timestamp: Date.now(),
        status: 'sent',
      }));
    } catch (error: any) {
      console.error('Error sending batch messages:', error.message);
      throw error;
    }
  }

  /**
   * 获取消息历史
   */
  async getMessageHistory(
    conversationId: string,
    limit: number,
    before?: number,
  ): Promise<IMMessage[]> {
    this.validateInitialized();

    try {
      // 解析conversationId获取两个用户ID
      const userIds = conversationId.split('_');
      if (userIds.length !== 2) {
        throw new Error('Invalid conversation ID format');
      }

      const response = await this.axiosInstance!.get(
        WUKONGIM_ENDPOINTS.MESSAGE_SYNC,
        {
          params: {
            channel_id: conversationId,
            channel_type: WukongIMChannelType.PERSON,
            limit,
            end_message_seq: before,
          },
        },
      );

      return (response.data.messages || []).map((msg: any) => ({
        id: msg.message_id || msg.client_msg_no,
        type: msg.payload?.type || 'text',
        content: msg.payload?.content || '',
        from: msg.from_uid,
        to: userIds[0] === msg.from_uid ? userIds[1] : userIds[0],
        timestamp: msg.timestamp,
        status: 'sent',
      }));
    } catch (error: any) {
      console.error('Error getting message history:', error.message);
      return [];
    }
  }

  /**
   * 获取群消息历史
   */
  async getGroupMessageHistory(
    groupId: string,
    limit: number,
    before?: number,
  ): Promise<IMMessage[]> {
    this.validateInitialized();

    try {
      const response = await this.axiosInstance!.get(
        WUKONGIM_ENDPOINTS.MESSAGE_SYNC,
        {
          params: {
            channel_id: groupId,
            channel_type: WukongIMChannelType.GROUP,
            limit,
            end_message_seq: before,
          },
        },
      );

      return (response.data.messages || []).map((msg: any) => ({
        id: msg.message_id || msg.client_msg_no,
        type: msg.payload?.type || 'text',
        content: msg.payload?.content || '',
        from: msg.from_uid,
        to: groupId,
        roomId: groupId,
        timestamp: msg.timestamp,
        status: 'sent',
      }));
    } catch (error: any) {
      console.error('Error getting group message history:', error.message);
      return [];
    }
  }

  // ==================== 用户相关 ====================

  async createUser(user: Omit<IMUser, 'id'>): Promise<IMUser> {
    this.validateInitialized();

    try {
      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.USER_CREATE,
        {
          uid: user.name, // 使用name作为uid，或者需要传入id
          name: user.name,
          avatar: user.avatar,
        },
      );

      return {
        id: response.data.uid,
        name: response.data.name,
        avatar: response.data.avatar,
        online: false,
      };
    } catch (error: any) {
      console.error('Error creating user:', error.message);
      throw error;
    }
  }

  async getUserInfo(userId: string): Promise<IMUser | null> {
    this.validateInitialized();

    try {
      const response = await this.axiosInstance!.get(
        `${WUKONGIM_ENDPOINTS.USER_INFO}?uid=${userId}`,
      );

      return {
        id: response.data.uid,
        name: response.data.name,
        avatar: response.data.avatar,
        online: response.data.online || false,
        lastSeen: response.data.last_seen,
      };
    } catch (error: any) {
      console.error('Error getting user info:', error.message);
      return null;
    }
  }

  async updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null> {
    this.validateInitialized();

    try {
      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.USER_UPDATE,
        {
          uid: userId,
          name: user.name,
          avatar: user.avatar,
        },
      );

      return {
        id: response.data.uid,
        name: response.data.name,
        avatar: response.data.avatar,
        online: response.data.online || false,
      };
    } catch (error: any) {
      console.error('Error updating user info:', error.message);
      return null;
    }
  }

  // ==================== 群组相关 ====================

  async createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup> {
    this.validateInitialized();

    try {
      // 先创建频道
      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.CHANNEL_CREATE,
        {
          channel_id: group.name, // 需要传入groupId
          channel_type: WukongIMChannelType.GROUP,
          name: group.name,
          avatar: group.avatar,
        },
      );

      // 添加成员
      if (group.members && group.members.length > 0) {
        await this.axiosInstance!.post(
          WUKONGIM_ENDPOINTS.SUBSCRIBER_ADD,
          {
            channel_id: response.data.channel_id,
            channel_type: WukongIMChannelType.GROUP,
            subscribers: group.members,
          },
        );
      }

      return {
        id: response.data.channel_id,
        name: response.data.name,
        avatar: response.data.avatar,
        members: group.members || [],
        owner: group.owner,
        createdAt: Date.now(),
      };
    } catch (error: any) {
      console.error('Error creating group:', error.message);
      throw error;
    }
  }

  async getGroupInfo(groupId: string): Promise<IMGroup | null> {
    this.validateInitialized();

    try {
      const response = await this.axiosInstance!.get(
        `${WUKONGIM_ENDPOINTS.CHANNEL_INFO}?channel_id=${groupId}&channel_type=${WukongIMChannelType.GROUP}`,
      );

      return {
        id: response.data.channel_id,
        name: response.data.name,
        avatar: response.data.avatar,
        members: response.data.subscribers || [],
        owner: response.data.owner,
        createdAt: response.data.created_at,
      };
    } catch (error: any) {
      console.error('Error getting group info:', error.message);
      return null;
    }
  }

  async updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null> {
    this.validateInitialized();

    try {
      // 悟空IM没有直接更新频道的API，需要先删除再创建
      // 或者使用其他方式
      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.CHANNEL_CREATE,
        {
          channel_id: groupId,
          channel_type: WukongIMChannelType.GROUP,
          name: group.name,
          avatar: group.avatar,
        },
      );

      return {
        id: response.data.channel_id,
        name: response.data.name,
        avatar: response.data.avatar,
        members: group.members || [],
        owner: group.owner,
        createdAt: Date.now(),
      };
    } catch (error: any) {
      console.error('Error updating group info:', error.message);
      return null;
    }
  }

  async addGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    try {
      await this.axiosInstance!.post(WUKONGIM_ENDPOINTS.SUBSCRIBER_ADD, {
        channel_id: groupId,
        channel_type: WukongIMChannelType.GROUP,
        subscribers: [userId],
      });
      return true;
    } catch (error: any) {
      console.error('Error adding group member:', error.message);
      return false;
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    try {
      await this.axiosInstance!.post(WUKONGIM_ENDPOINTS.SUBSCRIBER_REMOVE, {
        channel_id: groupId,
        channel_type: WukongIMChannelType.GROUP,
        subscribers: [userId],
      });
      return true;
    } catch (error: any) {
      console.error('Error removing group member:', error.message);
      return false;
    }
  }

  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    return this.addGroupMember(groupId, userId);
  }

  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    return this.removeGroupMember(groupId, userId);
  }

  // ==================== 连接相关 ====================

  async connect(userId: string, token?: string): Promise<IMConnectionStatus> {
    this.isConnected = true;
    return {
      status: 'connected',
      timestamp: Date.now(),
    };
  }

  async disconnect(): Promise<boolean> {
    this.isConnected = false;
    return true;
  }

  subscribeToMessages(callback: (message: IMMessage) => void): void {
    // 服务端不需要订阅消息
  }

  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void {
    // 服务端不需要订阅连接状态
  }

  subscribeToUserStatus(
    callback: (userId: string, status: 'online' | 'offline') => void,
  ): void {
    // 服务端不需要订阅用户状态
  }

  // ==================== 其他方法 ====================

  async markMessageAsRead(messageId: string): Promise<boolean> {
    // 悟空IM通过Webhook接收已读回执
    return true;
  }

  async markAllMessagesAsRead(conversationId: string): Promise<boolean> {
    return true;
  }

  async generateToken(userId: string, expiresIn?: number): Promise<string> {
    this.validateInitialized();

    try {
      const response = await this.axiosInstance!.post(
        WUKONGIM_ENDPOINTS.USER_TOKEN,
        {
          uid: userId,
          expire: expiresIn || 86400,
        },
      );
      return response.data.token;
    } catch (error: any) {
      console.error('Error generating token:', error.message);
      throw error;
    }
  }

  async validateToken(token: string): Promise<{ userId: string; valid: boolean }> {
    // 悟空IM的Token验证通常由服务端完成
    return { userId: '', valid: true };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.axiosInstance!.get(WUKONGIM_ENDPOINTS.HEALTH);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 生成单聊频道ID
   * 按字典序排序确保双向一致
   */
  private generatePersonalChannelId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * 编码消息payload为Base64
   */
  private encodePayload(content: any): string {
    return Buffer.from(JSON.stringify(content)).toString('base64');
  }

  /**
   * 验证Provider是否已初始化
   */
  protected validateInitialized(): void {
    if (!this.axiosInstance) {
      throw new Error('WukongIM Provider not initialized');
    }
  }
}
