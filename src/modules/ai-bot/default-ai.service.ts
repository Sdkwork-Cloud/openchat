import { AIService } from './ai-bot.interface';

export class DefaultAIService implements AIService {
  generateResponse(prompt: string, context?: any): Promise<string> {
    // 模拟AI响应，实际项目中应集成真实的AI服务
    return Promise.resolve(`这是默认AI服务对您问题的回应: ${prompt}`);
  }

  getServiceInfo(): { name: string; version: string; capabilities: string[] } {
    return {
      name: 'Default AI Service',
      version: '1.0.0',
      capabilities: ['basic_response'],
    };
  }
}
