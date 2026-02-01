import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIBotEntity, BotMessageEntity } from './ai-bot.entity';
import { AIBot, BotMessage, BotManager, AIService } from './ai-bot.interface';
import { DefaultAIService } from './default-ai.service';

@Injectable()
export class AIBotService implements BotManager {
  private aiServices: Map<string, AIService> = new Map();

  constructor(
    @InjectRepository(AIBotEntity)
    private readonly aiBotRepository: Repository<AIBotEntity>,
    @InjectRepository(BotMessageEntity)
    private readonly botMessageRepository: Repository<BotMessageEntity>,
  ) {
    // 注册默认AI服务
    this.registerAIService('default', new DefaultAIService());
  }

  // 创建Bot
  async createBot(bot: Omit<AIBot, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<AIBot> {
    const botEntity = this.aiBotRepository.create(bot);
    const savedBot = await this.aiBotRepository.save(botEntity);
    return this.mapToAIBot(savedBot);
  }

  // 更新Bot
  async updateBot(id: string, bot: Partial<AIBot>): Promise<AIBot> {
    const existingBot = await this.aiBotRepository.findOne({ where: { id } });
    if (!existingBot) {
      throw new NotFoundException(`Bot with id ${id} not found`);
    }
    Object.assign(existingBot, bot);
    const updatedBot = await this.aiBotRepository.save(existingBot);
    return this.mapToAIBot(updatedBot);
  }

  // 删除Bot
  async deleteBot(id: string): Promise<boolean> {
    const result = await this.aiBotRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  // 获取单个Bot
  async getBot(id: string): Promise<AIBot | null> {
    const bot = await this.aiBotRepository.findOne({ where: { id } });
    return bot ? this.mapToAIBot(bot) : null;
  }

  // 获取所有Bot
  async getBots(): Promise<AIBot[]> {
    const bots = await this.aiBotRepository.find();
    return bots.map(this.mapToAIBot);
  }

  // 激活Bot
  async activateBot(id: string): Promise<boolean> {
    const result = await this.aiBotRepository.update(id, { isActive: true });
    return (result.affected || 0) > 0;
  }

  // 停用Bot
  async deactivateBot(id: string): Promise<boolean> {
    const result = await this.aiBotRepository.update(id, { isActive: false });
    return (result.affected || 0) > 0;
  }

  // 处理消息
  async processMessage(botId: string, userId: string, message: string): Promise<BotMessage> {
    // 创建消息记录
    const messageEntity = this.botMessageRepository.create({
      botId,
      userId,
      message,
      status: 'pending',
    });
    
    let savedMessage = await this.botMessageRepository.save(messageEntity);
    
    try {
      // 更新状态为处理中
      savedMessage.status = 'processing';
      savedMessage = await this.botMessageRepository.save(savedMessage);
      
      // 获取Bot配置
      const bot = await this.aiBotRepository.findOne({ where: { id: botId } });
      if (!bot) {
        throw new NotFoundException(`Bot with id ${botId} not found`);
      }
      
      // 获取AI服务
      const aiServiceName = bot.config.aiService || 'default';
      const aiService = this.getAIService(aiServiceName);
      
      if (!aiService) {
        throw new Error(`AI service ${aiServiceName} not found`);
      }
      
      // 生成响应
      const response = await aiService.generateResponse(message, {
        botId,
        userId,
        botType: bot.type,
      });
      
      // 更新消息状态和响应
      savedMessage.response = response;
      savedMessage.status = 'completed';
      savedMessage = await this.botMessageRepository.save(savedMessage);
      
    } catch (error) {
      // 更新状态为失败
      savedMessage.status = 'failed';
      savedMessage.response = `Error processing message: ${error.message}`;
      savedMessage = await this.botMessageRepository.save(savedMessage);
    }
    
    return this.mapToBotMessage(savedMessage);
  }

  // 注册AI服务
  registerAIService(name: string, service: AIService): void {
    this.aiServices.set(name, service);
  }

  // 获取AI服务
  getAIService(name: string): AIService | null {
    return this.aiServices.get(name) || null;
  }

  // 映射到AIBot接口
  private mapToAIBot(entity: AIBotEntity): AIBot {
    return {
      id: entity.id,
      uuid: entity.uuid,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      config: entity.config,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isActive: entity.isActive,
    };
  }

  // 映射到BotMessage接口
  private mapToBotMessage(entity: BotMessageEntity): BotMessage {
    return {
      id: entity.id,
      uuid: entity.uuid,
      botId: entity.botId,
      userId: entity.userId,
      message: entity.message,
      response: entity.response || '',
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
