/**
 * 会话实体
 * 
 * 职责：定义会话领域模型
 */

export type ConversationType = 'ai' | 'group' | 'customer' | 'single' | 'user';

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
  isTyping?: boolean;
  isPinned?: boolean;
  type: ConversationType;
}

export interface ConversationFilter {
  type?: ConversationType;
  keyword?: string;
}
