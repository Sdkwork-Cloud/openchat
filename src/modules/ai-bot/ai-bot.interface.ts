import { User } from '../user/user.interface';

// AI Bot接口
export interface AIBot {
  id: string;
  uuid: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Bot消息接口
export interface BotMessage {
  id: string;
  uuid: string;
  botId: string;
  userId: string;
  message: string;
  response: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// AI服务接口
export interface AIService {
  generateResponse(prompt: string, context?: any): Promise<string>;
  getServiceInfo(): { name: string; version: string; capabilities: string[] };
}

// Bot管理器接口
export interface BotManager {
  createBot(bot: Omit<AIBot, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<AIBot>;
  updateBot(id: string, bot: Partial<AIBot>): Promise<AIBot>;
  deleteBot(id: string): Promise<boolean>;
  getBot(id: string): Promise<AIBot | null>;
  getBots(): Promise<AIBot[]>;
  activateBot(id: string): Promise<boolean>;
  deactivateBot(id: string): Promise<boolean>;
  processMessage(botId: string, userId: string, message: string): Promise<BotMessage>;
  registerAIService(name: string, service: AIService): void;
  getAIService(name: string): AIService | null;
}
