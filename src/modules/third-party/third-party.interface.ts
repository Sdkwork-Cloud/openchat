export interface ThirdPartyMessage {
  id: string;
  uuid: string;
  platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal';
  fromUserId: string;
  toUserId: string;
  content: any;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  platformMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThirdPartyContact {
  id: string;
  uuid: string;
  platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal';
  userId: string;
  platformUserId: string;
  name: string;
  avatar?: string | any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThirdPartyAdapter {
  sendMessage(message: Omit<ThirdPartyMessage, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<ThirdPartyMessage>;
  getMessageStatus(messageId: string): Promise<string>;
  syncContacts(userId: string): Promise<ThirdPartyContact[]>;
  getContact(userId: string, platformUserId: string): Promise<ThirdPartyContact | null>;
}

export interface ThirdPartyManager {
  sendMessage(platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal', message: Omit<ThirdPartyMessage, 'id' | 'uuid' | 'platform' | 'createdAt' | 'updatedAt'>): Promise<ThirdPartyMessage>;
  getMessageStatus(platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal', messageId: string): Promise<string>;
  syncContacts(platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal', userId: string): Promise<ThirdPartyContact[]>;
  getContact(platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal', userId: string, platformUserId: string): Promise<ThirdPartyContact | null>;
}