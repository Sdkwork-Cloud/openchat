import { IMProviderBase } from '../../im-provider.base';
import { IMMessage, IMUser, IMGroup, IMConnectionStatus } from '../../im-provider.interface';
import axios, { AxiosInstance } from 'axios';

// WukongIM Provider适配器
export class WukongIMProvider extends IMProviderBase {
  private axiosInstance: AxiosInstance | null = null;
  private isConnected: boolean = false;

  // 获取Provider名称
  getProviderName(): string {
    return 'wukongim';
  }

  // 初始化Provider
  async initialize(config: any): Promise<void> {
    await super.initialize(config);
    
    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL: this.config?.endpoint,
      timeout: this.config?.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加认证头
    if (this.config?.apiKey) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
  }

  // 发送消息
  async sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.post('/api/messages/send', {
        type: message.type,
        content: message.content,
        from: message.from,
        to: message.to,
        roomId: message.roomId,
      });

      return {
        id: response.data.id,
        type: message.type,
        content: message.content,
        from: message.from,
        to: message.to,
        roomId: message.roomId,
        timestamp: response.data.timestamp || Date.now(),
        status: 'sent',
        ...response.data,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // 发送群消息
  async sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.post('/api/messages/send/group', {
        type: message.type,
        content: message.content,
        from: message.from,
        roomId: message.roomId,
      });

      return {
        id: response.data.id,
        type: message.type,
        content: message.content,
        from: message.from,
        to: message.roomId || '',
        roomId: message.roomId,
        timestamp: response.data.timestamp || Date.now(),
        status: 'sent',
        ...response.data,
      };
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }

  // 获取消息历史
  async getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.get('/api/messages/history', {
        params: {
          conversationId,
          limit,
          before,
        },
      });

      return response.data.map((msg: any) => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        from: msg.from,
        to: msg.to,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        status: msg.status,
        ...msg,
      }));
    } catch (error) {
      console.error('Error getting message history:', error);
      return [];
    }
  }

  // 获取群消息历史
  async getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.get('/api/messages/history/group', {
        params: {
          groupId,
          limit,
          before,
        },
      });

      return response.data.map((msg: any) => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        from: msg.from,
        to: msg.to,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        status: msg.status,
        ...msg,
      }));
    } catch (error) {
      console.error('Error getting group message history:', error);
      return [];
    }
  }

  // 标记消息已读
  async markMessageAsRead(messageId: string): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.post('/api/messages/read', {
        messageId,
      });
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  // 标记所有消息已读
  async markAllMessagesAsRead(conversationId: string): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.post('/api/messages/read/all', {
        conversationId,
      });
      return true;
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      return false;
    }
  }

  // 创建用户
  async createUser(user: Omit<IMUser, 'id'>): Promise<IMUser> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.post('/api/users/create', user);
      return {
        id: response.data.id,
        name: response.data.name,
        avatar: response.data.avatar,
        online: response.data.online || false,
        lastSeen: response.data.lastSeen,
        ...response.data,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // 获取用户信息
  async getUserInfo(userId: string): Promise<IMUser | null> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.get(`/api/users/${userId}`);
      return {
        id: response.data.id,
        name: response.data.name,
        avatar: response.data.avatar,
        online: response.data.online || false,
        lastSeen: response.data.lastSeen,
        ...response.data,
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  // 更新用户信息
  async updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.put(`/api/users/${userId}`, user);
      return {
        id: response.data.id,
        name: response.data.name,
        avatar: response.data.avatar,
        online: response.data.online || false,
        lastSeen: response.data.lastSeen,
        ...response.data,
      };
    } catch (error) {
      console.error('Error updating user info:', error);
      return null;
    }
  }

  // 创建群组
  async createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.post('/api/groups/create', {
        name: group.name,
        avatar: group.avatar,
        members: group.members,
        owner: group.owner,
      });

      return {
        id: response.data.id,
        name: response.data.name,
        avatar: response.data.avatar,
        members: response.data.members,
        owner: response.data.owner,
        createdAt: response.data.createdAt || Date.now(),
        ...response.data,
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // 获取群组信息
  async getGroupInfo(groupId: string): Promise<IMGroup | null> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.get(`/api/groups/${groupId}`);
      return {
        id: response.data.id,
        name: response.data.name,
        avatar: response.data.avatar,
        members: response.data.members,
        owner: response.data.owner,
        createdAt: response.data.createdAt,
        ...response.data,
      };
    } catch (error) {
      console.error('Error getting group info:', error);
      return null;
    }
  }

  // 更新群组信息
  async updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.put(`/api/groups/${groupId}`, group);
      return {
        id: response.data.id,
        name: response.data.name,
        avatar: response.data.avatar,
        members: response.data.members,
        owner: response.data.owner,
        createdAt: response.data.createdAt,
        ...response.data,
      };
    } catch (error) {
      console.error('Error updating group info:', error);
      return null;
    }
  }

  // 添加群成员
  async addGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.post(`/api/groups/${groupId}/members/add`, {
        userId,
      });
      return true;
    } catch (error) {
      console.error('Error adding group member:', error);
      return false;
    }
  }

  // 移除群成员
  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.post(`/api/groups/${groupId}/members/remove`, {
        userId,
      });
      return true;
    } catch (error) {
      console.error('Error removing group member:', error);
      return false;
    }
  }

  // 加入群组
  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.post(`/api/groups/${groupId}/join`, {
        userId,
      });
      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      return false;
    }
  }

  // 离开群组
  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.post(`/api/groups/${groupId}/leave`, {
        userId,
      });
      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      return false;
    }
  }

  // 建立连接
  async connect(userId: string, token?: string): Promise<IMConnectionStatus> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.post('/api/connection/connect', {
        userId,
        token,
      });

      this.isConnected = true;
      const status: IMConnectionStatus = {
        status: 'connected',
        timestamp: Date.now(),
        ...response.data,
      };

      this.triggerConnectionStatusCallbacks(status);
      return status;
    } catch (error) {
      console.error('Error connecting:', error);
      const status: IMConnectionStatus = {
        status: 'disconnected',
        reason: 'Connection failed',
        timestamp: Date.now(),
      };
      this.triggerConnectionStatusCallbacks(status);
      return status;
    }
  }

  // 断开连接
  async disconnect(): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.post('/api/connection/disconnect');
      this.isConnected = false;
      
      const status: IMConnectionStatus = {
        status: 'disconnected',
        timestamp: Date.now(),
      };
      this.triggerConnectionStatusCallbacks(status);
      return true;
    } catch (error) {
      console.error('Error disconnecting:', error);
      return false;
    }
  }

  // 生成认证令牌
  async generateToken(userId: string, expiresIn?: number): Promise<string> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.post('/api/auth/token', {
        userId,
        expiresIn: expiresIn || 3600,
      });
      return response.data.token;
    } catch (error) {
      console.error('Error generating token:', error);
      throw error;
    }
  }

  // 验证令牌
  async validateToken(token: string): Promise<{ userId: string; valid: boolean }> {
    this.validateInitialized();
    
    try {
      const response = await this.axiosInstance!.post('/api/auth/validate', {
        token,
      });
      return {
        userId: response.data.userId,
        valid: response.data.valid,
      };
    } catch (error) {
      console.error('Error validating token:', error);
      return { userId: '', valid: false };
    }
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    this.validateInitialized();
    
    try {
      await this.axiosInstance!.get('/api/health');
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
