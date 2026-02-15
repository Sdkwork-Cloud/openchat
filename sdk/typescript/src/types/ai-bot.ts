export interface AIBot {
  id: string;
  name: string;
  description: string;
  type: string;
  config?: Record<string, any>;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAIBotParams {
  name: string;
  description: string;
  type: string;
  config?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateAIBotParams {
  name?: string;
  description?: string;
  type?: string;
  config?: Record<string, any>;
  isActive?: boolean;
}

export interface BotMessage {
  id: string;
  botId: string;
  userId: string;
  message: string;
  response?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface ProcessBotMessageParams {
  userId: string;
  message: string;
}
