import { AnyMediaResource, ImageMediaResource, AudioMediaResource, VideoMediaResource, FileMediaResource } from './media-resource.interface';

export interface IMProviderConfig {
  provider: string;
  endpoint: string;
  apiKey?: string;
  apiSecret?: string;
  appId?: string;
  timeout?: number;
  [key: string]: any;
}

export interface CardMessageContent {
  type: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  appId?: string;
  pagePath?: string;
  parameters?: Record<string, any>;
  [key: string]: any;
}

export interface IMMessageContent {
  text?: string;
  image?: ImageMediaResource;
  audio?: AudioMediaResource;
  video?: VideoMediaResource;
  file?: FileMediaResource;
  card?: CardMessageContent;
  custom?: Record<string, any>;
  system?: any;
  [key: string]: any;
}

export interface IMMessage {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom' | 'system';
  content: IMMessageContent;
  from: string;
  to: string;
  roomId?: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  [key: string]: any;
}

export interface IMUser {
  id: string;
  name?: string;
  avatar?: string | ImageMediaResource;
  online?: boolean;
  lastSeen?: number;
  resources?: Record<string, AnyMediaResource>;
  [key: string]: any;
}

export interface IMGroup {
  id: string;
  name: string;
  avatar?: string | ImageMediaResource;
  members: string[];
  owner?: string;
  createdAt: number;
  resources?: Record<string, AnyMediaResource>;
  [key: string]: any;
}

export interface IMConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  reason?: string;
  timestamp: number;
}

export interface IMProvider {
  getProviderName(): string;
  
  initialize(config: IMProviderConfig): Promise<void>;
  
  sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;
  
  sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;
  
  getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]>;
  
  getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]>;
  
  markMessageAsRead(messageId: string): Promise<boolean>;
  
  markAllMessagesAsRead(conversationId: string): Promise<boolean>;
  
  createUser(user: Omit<IMUser, 'id'>): Promise<IMUser>;
  
  getUserInfo(userId: string): Promise<IMUser | null>;
  
  updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null>;
  
  createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup>;
  
  getGroupInfo(groupId: string): Promise<IMGroup | null>;
  
  updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null>;
  
  addGroupMember(groupId: string, userId: string): Promise<boolean>;
  
  removeGroupMember(groupId: string, userId: string): Promise<boolean>;
  
  joinGroup(groupId: string, userId: string): Promise<boolean>;
  
  leaveGroup(groupId: string, userId: string): Promise<boolean>;
  
  connect(userId: string, token?: string): Promise<IMConnectionStatus>;
  
  disconnect(): Promise<boolean>;
  
  subscribeToMessages(callback: (message: IMMessage) => void): void;
  
  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void;
  
  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline') => void): void;
  
  generateToken(userId: string, expiresIn?: number): Promise<string>;
  
  validateToken(token: string): Promise<{ userId: string; valid: boolean }>;
  
  healthCheck(): Promise<boolean>;
}
