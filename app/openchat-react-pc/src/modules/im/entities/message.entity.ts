/**
 * 消息实体
 *
 * 职责：定义消息领域模型
 */

import type { MessageContent } from '../services/message.service';

export type MessageType = 'user' | 'ai' | 'system' | 'text' | 'image' | 'video' | 'file' | 'audio';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'audio';
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: MessageContent;
  type?: 'user' | 'ai' | 'system' | 'text' | 'image' | 'video' | 'file' | 'audio';
  time: string;
  status: MessageStatus;
  attachments?: MessageAttachment[];
  isTyping?: boolean;
  replyToMessageId?: string;
  replyToMessage?: Message;
  mentions?: string[];
  isRecalled?: boolean;
  recallTime?: string;
  readTime?: string;
  readBy?: string[];
  isEdited?: boolean;
  editTime?: string;
  originalContent?: MessageContent;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface SendMessageRequest {
  conversationId: string;
  content: MessageContent;
  replyToMessageId?: string;
  mentions?: string[];
}

export interface MessageSearchResult {
  message: Message;
  conversationId: string;
  conversationName: string;
  matchCount: number;
}
