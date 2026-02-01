import { IMMessageContent } from '../im-provider/im-provider.interface';

export class Message {
  id: string;
  uuid: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom' | 'system';
  content: IMMessageContent; // 消息内容，结构化对象
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  error?: string;
  isDuplicate?: boolean;
}

export interface MessageManager {
  sendMessage(message: Omit<Message, 'id' | 'uuid' | 'status' | 'createdAt' | 'updatedAt'> & { clientSeq?: number }): Promise<SendMessageResult>;
  getMessageById(id: string): Promise<Message | null>;
  getMessagesByUserId(userId: string, limit?: number, offset?: number): Promise<Message[]>;
  getMessagesByGroupId(groupId: string, limit?: number, offset?: number): Promise<Message[]>;
  updateMessageStatus(id: string, status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'): Promise<boolean>;
  deleteMessage(id: string): Promise<boolean>;
  markMessagesAsRead(userId: string, messageIds: string[]): Promise<boolean>;
}