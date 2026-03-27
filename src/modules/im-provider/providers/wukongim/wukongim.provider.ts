import { randomBytes } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { IMProviderBase } from '../../im-provider.base';
import {
  IMMessage,
  IMUser,
  IMGroup,
  IMConnectionStatus,
  IMProviderConfig,
} from '../../im-provider.interface';
import { WukongIMChannelType } from '../../../wukongim/wukongim.constants';
import { WukongIMUtils } from '../../../wukongim/wukongim.utils';
import { WukongIMClient } from '../../../wukongim/wukongim.client';

@Injectable()
export class WukongIMProvider extends IMProviderBase {
  private isConnected: boolean = false;

  constructor(private readonly wukongIMClient: WukongIMClient) {
    super();
  }

  getProviderName(): string {
    return 'wukongim';
  }

  async initialize(config: IMProviderConfig): Promise<void> {
    await super.initialize(config);
    this.isConnected = true;
    this.logger.log('WukongIM Provider initialized');
  }

  async sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateInitialized();

    try {
      if (message.roomId) {
        return this.sendGroupMessage(message);
      }

      const channelId = message.to;
      const payload = WukongIMUtils.createMessagePayload(
        channelId,
        WukongIMChannelType.PERSON,
        message.from,
        { type: message.type, content: message.content },
        (message as { clientMsgNo?: string }).clientMsgNo,
      );

      const response = await this.wukongIMClient.sendMessage(payload);

      return {
        id: response.message_id || response.client_msg_no,
        type: message.type,
        content: message.content,
        from: message.from,
        to: message.to,
        timestamp: Date.now(),
        status: 'sent',
        clientMsgNo: response.client_msg_no || (message as { clientMsgNo?: string }).clientMsgNo,
      };
    } catch (error: any) {
      this.logger.error('Error sending message:', error.message);
      throw error;
    }
  }

  async sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateInitialized();

    try {
      const channelId = message.roomId || message.to;
      const payload = WukongIMUtils.createMessagePayload(
        channelId,
        WukongIMChannelType.GROUP,
        message.from,
        { type: message.type, content: message.content },
        (message as { clientMsgNo?: string }).clientMsgNo,
      );

      const response = await this.wukongIMClient.sendMessage(payload);

      return {
        id: response.message_id || response.client_msg_no,
        type: message.type,
        content: message.content,
        from: message.from,
        to: message.to,
        roomId: message.roomId,
        timestamp: Date.now(),
        status: 'sent',
        clientMsgNo: response.client_msg_no || (message as { clientMsgNo?: string }).clientMsgNo,
      };
    } catch (error: any) {
      this.logger.error('Error sending group message:', error.message);
      throw error;
    }
  }

  async sendBatchMessages(messages: Omit<IMMessage, 'id' | 'timestamp' | 'status'>[]): Promise<IMMessage[]> {
    this.validateInitialized();

    try {
      const payloads = messages.map((msg) => {
        const isGroup = !!msg.roomId;
        const channelId = isGroup
          ? msg.roomId!
          : msg.to;

        return WukongIMUtils.createMessagePayload(
          channelId,
          isGroup ? WukongIMChannelType.GROUP : WukongIMChannelType.PERSON,
          msg.from,
          { type: msg.type, content: msg.content },
          (msg as { clientMsgNo?: string }).clientMsgNo,
        );
      });

      const response = await this.wukongIMClient.sendBatchMessages(payloads);
      const normalizedResponse = Array.isArray(response)
        ? response
        : Array.isArray(response?.messages)
          ? response.messages
          : [];

      return messages.map((msg, index) => ({
        id: normalizedResponse[index]?.message_id ||
          normalizedResponse[index]?.client_msg_no ||
          `${msg.from}_${Date.now()}_${index}`,
        type: msg.type,
        content: msg.content,
        from: msg.from,
        to: msg.to,
        roomId: msg.roomId,
        timestamp: Date.now(),
        status: 'sent',
        clientMsgNo: normalizedResponse[index]?.client_msg_no || (msg as { clientMsgNo?: string }).clientMsgNo,
      }));
    } catch (error: any) {
      this.logger.error('Error sending batch messages:', error.message);
      throw error;
    }
  }

  async getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateInitialized();

    try {
      const userIds = conversationId.split('_');
      if (userIds.length !== 2) {
        throw new Error('Invalid conversation ID format');
      }

      const response = await this.wukongIMClient.getMessages({
        channelId: conversationId,
        channelType: WukongIMChannelType.PERSON,
        limit,
        endMessageSeq: before,
      });

      return (response.messages || []).map((msg: any) => {
        const payload = typeof msg.payload === 'string'
          ? WukongIMUtils.decodePayload(msg.payload)
          : msg.payload || {};

        return {
          id: msg.message_id || msg.client_msg_no,
          type: payload?.type || 'text',
          content: payload?.content || '',
          from: msg.from_uid,
          to: userIds[0] === msg.from_uid ? userIds[1] : userIds[0],
          timestamp: msg.timestamp,
          status: 'sent',
        };
      });
    } catch (error: any) {
      this.logger.error('Error getting message history:', error.message);
      return [];
    }
  }

  async getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateInitialized();

    try {
      const response = await this.wukongIMClient.getMessages({
        channelId: groupId,
        channelType: WukongIMChannelType.GROUP,
        limit,
        endMessageSeq: before,
      });

      return (response.messages || []).map((msg: any) => {
        const payload = typeof msg.payload === 'string'
          ? WukongIMUtils.decodePayload(msg.payload)
          : msg.payload || {};

        return {
          id: msg.message_id || msg.client_msg_no,
          type: payload?.type || 'text',
          content: payload?.content || '',
          from: msg.from_uid,
          to: groupId,
          roomId: groupId,
          timestamp: msg.timestamp,
          status: 'sent',
        };
      });
    } catch (error: any) {
      this.logger.error('Error getting group message history:', error.message);
      return [];
    }
  }

  async createUser(user: Omit<IMUser, 'id'>): Promise<IMUser> {
    this.validateInitialized();

    try {
      const userId = (user as { id?: string; uid?: string }).id || (user as { uid?: string }).uid;
      if (!userId) {
        throw new Error('User id is required to create WukongIM user');
      }
      const avatarStr = typeof user.avatar === 'string' ? user.avatar : user.avatar?.url;

      const response = await this.wukongIMClient.createUser({
        uid: userId,
        name: user.name,
        avatar: avatarStr,
      });

      return {
        id: response.uid || userId,
        name: response.name,
        avatar: response.avatar,
        online: false,
      };
    } catch (error: any) {
      this.logger.error('Error creating user:', error.message);
      throw error;
    }
  }

  async getUserInfo(userId: string): Promise<IMUser | null> {
    this.validateInitialized();

    try {
      const response = await this.wukongIMClient.getUserInfo(userId);

      return {
        id: response.uid,
        name: response.name,
        avatar: response.avatar,
        online: response.online || false,
        lastSeen: response.last_seen,
      };
    } catch (error: any) {
      this.logger.error('Error getting user info:', error.message);
      return null;
    }
  }

  async updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null> {
    this.validateInitialized();

    try {
      const avatarStr = typeof user.avatar === 'string' ? user.avatar : user.avatar?.url;
      const response = await this.wukongIMClient.updateUser({
        uid: userId,
        name: user.name,
        avatar: avatarStr,
      });

      return {
        id: response.uid,
        name: response.name,
        avatar: response.avatar,
        online: response.online || false,
      };
    } catch (error: any) {
      this.logger.error('Error updating user info:', error.message);
      return null;
    }
  }

  async createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup> {
    this.validateInitialized();

    try {
      const groupId = (group as { id?: string; groupId?: string }).id || (group as { groupId?: string }).groupId;
      if (!groupId) {
        throw new Error('Group id is required to create WukongIM channel');
      }
      const avatarStr = typeof group.avatar === 'string' ? group.avatar : group.avatar?.url;

      const response = await this.wukongIMClient.createChannel({
        channel_id: groupId,
        channel_type: WukongIMChannelType.GROUP,
        name: group.name,
        avatar: avatarStr,
      });

      if (group.members && group.members.length > 0) {
        await this.wukongIMClient.addSubscribers({
          channel_id: response.channel_id || groupId,
          channel_type: WukongIMChannelType.GROUP,
          subscribers: group.members.map((uid: string) => ({ uid })),
        });
      }

      return {
        id: response.channel_id || groupId,
        name: response.name,
        avatar: response.avatar,
        members: group.members || [],
        owner: group.owner,
        createdAt: Date.now(),
      };
    } catch (error: any) {
      this.logger.error('Error creating group:', error.message);
      throw error;
    }
  }

  async getGroupInfo(groupId: string): Promise<IMGroup | null> {
    this.validateInitialized();

    try {
      const response = await this.wukongIMClient.getChannelInfo(groupId, WukongIMChannelType.GROUP);

      return {
        id: response.channel_id,
        name: response.name,
        avatar: response.avatar,
        members: response.subscribers || [],
        owner: response.owner,
        createdAt: response.created_at,
      };
    } catch (error: any) {
      this.logger.error('Error getting group info:', error.message);
      return null;
    }
  }

  async updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null> {
    this.validateInitialized();

    try {
      const avatarStr = typeof group.avatar === 'string' ? group.avatar : group.avatar?.url;
      const response = await this.wukongIMClient.createChannel({
        channel_id: groupId,
        channel_type: WukongIMChannelType.GROUP,
        name: group.name,
        avatar: avatarStr,
      });

      return {
        id: response.channel_id,
        name: response.name,
        avatar: response.avatar,
        members: group.members || [],
        owner: group.owner,
        createdAt: Date.now(),
      };
    } catch (error: any) {
      this.logger.error('Error updating group info:', error.message);
      return null;
    }
  }

  async addGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    try {
      await this.wukongIMClient.addSubscribers({
        channel_id: groupId,
        channel_type: WukongIMChannelType.GROUP,
        subscribers: [{ uid: userId }],
      });
      return true;
    } catch (error: any) {
      this.logger.error('Error adding group member:', error.message);
      return false;
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    try {
      await this.wukongIMClient.removeSubscribers(groupId, WukongIMChannelType.GROUP, [userId]);
      return true;
    } catch (error: any) {
      this.logger.error('Error removing group member:', error.message);
      return false;
    }
  }

  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    return this.addGroupMember(groupId, userId);
  }

  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    return this.removeGroupMember(groupId, userId);
  }

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
    this.logger.warn('subscribeToMessages is not implemented. Use WebSocket gateway for real-time messages.');
  }

  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void {
    this.logger.warn('subscribeToConnectionStatus is not implemented. Use WebSocket gateway for connection status.');
  }

  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline') => void): void {
    this.logger.warn('subscribeToUserStatus is not implemented. Use WebSocket gateway for user status.');
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      await this.wukongIMClient.post('/message/read', { message_id: messageId });
      return true;
    } catch (error: any) {
      this.logger.warn(`markMessageAsRead failed: ${error.message}`);
      return false;
    }
  }

  async markAllMessagesAsRead(conversationId: string): Promise<boolean> {
    try {
      await this.wukongIMClient.post('/message/readall', { channel_id: conversationId });
      return true;
    } catch (error: any) {
      this.logger.warn(`markAllMessagesAsRead failed: ${error.message}`);
      return false;
    }
  }

  async generateToken(userId: string, expiresIn?: number): Promise<string> {
    this.validateInitialized();

    try {
      const token = randomBytes(24).toString('hex');
      await this.wukongIMClient.upsertUserToken({
        uid: userId,
        token,
        device_flag: 1,
        device_level: 1,
      });
      return token;
    } catch (error: any) {
      this.logger.error('Error generating token:', error.message);
      throw error;
    }
  }

  async validateToken(token: string): Promise<{ userId: string; valid: boolean }> {
    this.logger.warn('validateToken is not supported by current WukongIM provider implementation');
    return { userId: '', valid: false };
  }

  async healthCheck(): Promise<boolean> {
    return this.wukongIMClient.healthCheck();
  }

  protected validateInitialized(): void {
    if (!this.isConnected) {
      throw new Error('WukongIM Provider not initialized');
    }
  }
}
