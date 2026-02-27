import { ReactNode } from 'react';

export type SearchResultType = 
  | 'agent' 
  | 'chat' 
  | 'contact' 
  | 'file' 
  | 'article' 
  | 'creation' 
  | 'command' 
  | 'setting';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string | ReactNode;
  type: SearchResultType;
  score: number;
  timestamp?: number;
  meta?: {
    sessionId?: string;
    messageId?: string;
    folderId?: string;
    command?: string;
    shortcut?: string;
    tags?: string[];
  };
}

export interface SearchCategory {
  id: SearchResultType | 'all';
  label: string;
  icon: ReactNode;
  count: number;
}

export interface SearchFilters {
  type?: SearchResultType | 'all';
  dateRange?: 'today' | 'week' | 'month' | 'all';
  sortBy?: 'relevance' | 'date';
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'history' | 'trending' | 'related';
}
