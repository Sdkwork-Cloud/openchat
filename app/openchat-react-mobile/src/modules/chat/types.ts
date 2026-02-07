
export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
}

export interface ChatConfig {
  showUserAvatar: boolean;
  showModelAvatar: boolean;
}
