import { Logger } from '@nestjs/common';
import { IMProvider, IMProviderConfig, IMMessage, IMUser, IMGroup, IMConnectionStatus } from './im-provider.interface';

export abstract class IMProviderBase implements IMProvider {
  protected readonly logger = new Logger(IMProviderBase.name);
  protected config: IMProviderConfig | null = null;
  protected isInitialized: boolean = false;
  protected messageCallbacks: ((message: IMMessage) => void)[] = [];
  protected connectionStatusCallbacks: ((status: IMConnectionStatus) => void)[] = [];
  protected userStatusCallbacks: ((userId: string, status: 'online' | 'offline') => void)[] = [];

  abstract getProviderName(): string;

  async initialize(config: IMProviderConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }

  abstract sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;

  abstract sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;

  abstract getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]>;

  abstract getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]>;

  abstract markMessageAsRead(messageId: string): Promise<boolean>;

  abstract markAllMessagesAsRead(conversationId: string): Promise<boolean>;

  abstract createUser(user: Omit<IMUser, 'id'>): Promise<IMUser>;

  abstract getUserInfo(userId: string): Promise<IMUser | null>;

  abstract updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null>;

  abstract createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup>;

  abstract getGroupInfo(groupId: string): Promise<IMGroup | null>;

  abstract updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null>;

  abstract addGroupMember(groupId: string, userId: string): Promise<boolean>;

  abstract removeGroupMember(groupId: string, userId: string): Promise<boolean>;

  abstract joinGroup(groupId: string, userId: string): Promise<boolean>;

  abstract leaveGroup(groupId: string, userId: string): Promise<boolean>;

  abstract connect(userId: string, token?: string): Promise<IMConnectionStatus>;

  abstract disconnect(): Promise<boolean>;

  subscribeToMessages(callback: (message: IMMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void {
    this.connectionStatusCallbacks.push(callback);
  }

  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline') => void): void {
    this.userStatusCallbacks.push(callback);
  }

  abstract generateToken(userId: string, expiresIn?: number): Promise<string>;

  abstract validateToken(token: string): Promise<{ userId: string; valid: boolean }>;

  abstract healthCheck(): Promise<boolean>;

  protected triggerMessageCallbacks(message: IMMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        this.logger.error('Error in message callback:', error);
      }
    });
  }

  protected triggerConnectionStatusCallbacks(status: IMConnectionStatus): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        this.logger.error('Error in connection status callback:', error);
      }
    });
  }

  protected triggerUserStatusCallbacks(userId: string, status: 'online' | 'offline'): void {
    this.userStatusCallbacks.forEach(callback => {
      try {
        callback(userId, status);
      } catch (error) {
        this.logger.error('Error in user status callback:', error);
      }
    });
  }

  protected validateInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error('IM Provider not initialized');
    }
  }

  protected getConfig(key: string, defaultValue?: any): any {
    if (!this.config) {
      return defaultValue;
    }
    return this.config[key] || defaultValue;
  }
}
