/**
 * 消息实体
 *
 * 职责：定义消息领域模型
 */

import type { MessageContent } from '../services/message.service';

export type MessageType = 'user' | 'ai' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: MessageContent;
  time: string;
  status: MessageStatus;
  // 回复相关
  replyToMessageId?: string;
  replyToMessage?: Message;
  // 提及相关
  mentions?: string[];
  // 撤回相关
  isRecalled?: boolean;
  recallTime?: string;
  // 已读相关
  readTime?: string;
  readBy?: string[];
  // 编辑相关
  isEdited?: boolean;
  editTime?: string;
  originalContent?: MessageContent;
  // 反应表情
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
