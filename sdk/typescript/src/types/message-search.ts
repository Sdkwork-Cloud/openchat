import { Message } from './index';

export interface SearchMessagesQuery {
  keyword: string;
  targetId?: string;
  type?: 'single' | 'group';
  messageType?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface MessageSearchResult {
  messages: Message[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuickSearchQuery {
  keyword: string;
  limit?: number;
}

export interface QuickSearchResult {
  messages: Message[];
  nextCursor?: string;
}

export interface SearchInConversationQuery {
  targetId: string;
  type: 'single' | 'group';
  keyword: string;
  page?: number;
  pageSize?: number;
}

export interface MessageStats {
  totalSent: number;
  totalReceived: number;
  textMessages: number;
  imageMessages: number;
  fileMessages: number;
}

export interface MessageStatsQuery {
  startTime?: string;
  endTime?: string;
}
