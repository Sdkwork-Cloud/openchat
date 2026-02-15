export enum ThirdPartyPlatform {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  WECHAT = 'wechat',
  SIGNAL = 'signal',
}

export interface ThirdPartyMessage {
  id: string;
  platform: ThirdPartyPlatform;
  to?: string;
  from?: string;
  content: string;
  type: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface SendThirdPartyMessageParams {
  to?: string;
  from?: string;
  content: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface SyncContactsParams {
  userId: string;
}

export interface GetContactParams {
  userId: string;
  platformUserId: string;
}
