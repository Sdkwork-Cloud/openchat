import { Injectable } from '@nestjs/common';
import { IMProvider, IMProviderConfig, IMMessage, IMUser, IMGroup, IMConnectionStatus } from './im-provider.interface';
import { WukongIMProvider } from './providers/wukongim/wukongim.provider';

@Injectable()
export class IMProviderService {
  private currentProvider: IMProvider | null = null;

  constructor(private readonly wukongIMProvider: WukongIMProvider) {
    this.currentProvider = wukongIMProvider;
  }

  async initializeProvider(providerName: string, config: IMProviderConfig): Promise<void> {
    if (this.currentProvider) {
      await this.currentProvider.initialize(config);
    }
  }

  async sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateProviderInitialized();
    return this.currentProvider!.sendMessage(message);
  }

  async sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage> {
    this.validateProviderInitialized();
    return this.currentProvider!.sendGroupMessage(message);
  }

  async getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateProviderInitialized();
    return this.currentProvider!.getMessageHistory(conversationId, limit, before);
  }

  async getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]> {
    this.validateProviderInitialized();
    return this.currentProvider!.getGroupMessageHistory(groupId, limit, before);
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.markMessageAsRead(messageId);
  }

  async markAllMessagesAsRead(conversationId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.markAllMessagesAsRead(conversationId);
  }

  async createUser(user: Omit<IMUser, 'id'>): Promise<IMUser> {
    this.validateProviderInitialized();
    return this.currentProvider!.createUser(user);
  }

  async getUserInfo(userId: string): Promise<IMUser | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.getUserInfo(userId);
  }

  async updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.updateUserInfo(userId, user);
  }

  async createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup> {
    this.validateProviderInitialized();
    return this.currentProvider!.createGroup(group);
  }

  async getGroupInfo(groupId: string): Promise<IMGroup | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.getGroupInfo(groupId);
  }

  async updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null> {
    this.validateProviderInitialized();
    return this.currentProvider!.updateGroupInfo(groupId, group);
  }

  async addGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.addGroupMember(groupId, userId);
  }

  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.removeGroupMember(groupId, userId);
  }

  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.joinGroup(groupId, userId);
  }

  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.leaveGroup(groupId, userId);
  }

  async connect(userId: string, token?: string): Promise<IMConnectionStatus> {
    this.validateProviderInitialized();
    return this.currentProvider!.connect(userId, token);
  }

  async disconnect(): Promise<boolean> {
    this.validateProviderInitialized();
    return this.currentProvider!.disconnect();
  }

  subscribeToMessages(callback: (message: IMMessage) => void): void {
    this.validateProviderInitialized();
    this.currentProvider!.subscribeToMessages(callback);
  }

  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void {
    this.validateProviderInitialized();
    this.currentProvider!.subscribeToConnectionStatus(callback);
  }

  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline') => void): void {
    this.validateProviderInitialized();
    this.currentProvider!.subscribeToUserStatus(callback);
  }

  async generateToken(userId: string, expiresIn?: number): Promise<string> {
    this.validateProviderInitialized();
    return this.currentProvider!.generateToken(userId, expiresIn);
  }

  async validateToken(token: string): Promise<{ userId: string; valid: boolean }> {
    this.validateProviderInitialized();
    return this.currentProvider!.validateToken(token);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.currentProvider) {
      return false;
    }
    return this.currentProvider!.healthCheck();
  }

  isInitialized(): boolean {
    return this.currentProvider !== null;
  }

  getCurrentProviderName(): string {
    this.validateProviderInitialized();
    return this.currentProvider!.getProviderName();
  }

  private validateProviderInitialized(): void {
    if (!this.currentProvider) {
      throw new Error('IM Provider not initialized');
    }
  }
}
