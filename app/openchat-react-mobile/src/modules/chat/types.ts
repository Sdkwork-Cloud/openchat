
import { BaseEntity } from '../../core/types';

export interface Message extends BaseEntity {
  id: string;
  createTime: number;
  updateTime: number;
  sessionId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  isStreaming?: boolean;
  status?: 'sending' | 'sent' | 'error'; // Added status
  replyTo?: {
      id: string;
      name: string;
      content: string;
  };
}

export type SessionType = 'agent' | 'group' | 'dm';

export interface ChatSession extends BaseEntity {
  id: string;
  createTime: number;
  updateTime: number;
  type: SessionType;
  agentId: string;
  
  // Group Metadata
  groupName?: string;
  groupAnnouncement?: string;
  memberIds?: string[];
  
  lastMessageContent: string;
  lastMessageTime: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted?: boolean; // New: Persistence for mute status
  messages: Message[]; 
  
  // Session Specific Configuration
  sessionConfig?: {
      showAvatar: boolean;
      backgroundImage?: string; // New: Per-chat background override
  };
}

export interface ChatConfig {
  showUserAvatar: boolean;
  showModelAvatar: boolean;
}
