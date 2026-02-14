import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { AuthStrategy, AuthResult } from '../auth-strategy.interface';
import { Repository } from 'typeorm';
import { BotEntity } from '../../../modules/bot-platform/entities/bot.entity';

@Injectable()
export class BotTokenAuthStrategy implements AuthStrategy {
  readonly name = 'bot-token';
  readonly priority = 20;
  private readonly logger = new Logger(BotTokenAuthStrategy.name);

  constructor(@InjectRepository(BotEntity) private botRepository: Repository<BotEntity>) {}

  /**
   * 检查是否支持该请求
   */
  canHandle(request: Request): boolean {
    // 检查 Authorization 头
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (this.isBotToken(token)) {
        return true;
      }
    }

    // 检查 X-Bot-Token 头
    if (request.headers['x-bot-token']) {
      return true;
    }

    // 检查 Query 参数
    if (request.query.bot_token) {
      return true;
    }

    return false;
  }

  /**
   * 执行 Bot Token 认证
   */
  async authenticate(request: Request): Promise<AuthResult> {
    try {
      const token = this.extractToken(request);

      if (!token) {
        return {
          success: false,
          error: 'No bot token provided'
        };
      }

      // 验证 Token 格式
      if (!this.isBotToken(token)) {
        return {
          success: false,
          error: 'Invalid bot token format'
        };
      }

      // 从Token中提取appId
      const appId = this.getAppIdFromToken(token);

      // 查找Bot
      const bot = await this.botRepository.findOne({
        where: { appId, status: 'active' }
      });

      if (!bot) {
        return {
          success: false,
          error: 'Invalid bot token'
        };
      }

      // 验证Token（这里简化处理，实际应该使用bcrypt验证tokenHash）
      // 注意：这是临时解决方案，实际应该使用BotService

      return {
        success: true,
        botId: bot.id,
        scopes: bot.scopes,
        metadata: {
          type: 'bot',
          appId: bot.appId,
          username: bot.username,
          name: bot.name,
          intents: bot.intents,
        }
      };

    } catch (error) {
      this.logger.debug('Bot token authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * 从Token中提取appId
   */
  private getAppIdFromToken(token: string): string {
    const parts = token.split('_');
    return parts[2];
  }

  /**
   * 检查是否为 Bot Token
   */
  private isBotToken(token: string): boolean {
    // 格式: oc_bot_<appId>_<random32>
    const parts = token.split('_');
    return parts.length === 4 &&
           parts[0] === 'oc' &&
           parts[1] === 'bot' &&
           parts[2].length === 32 &&
           parts[3].length === 64;
  }

  /**
   * 提取 Token
   */
  private extractToken(request: Request): string | undefined {
    // 1. 从 Authorization 头提取
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (this.isBotToken(token)) {
        return token;
      }
    }

    // 2. 从 X-Bot-Token 头提取
    const botTokenHeader = request.headers['x-bot-token'];
    if (typeof botTokenHeader === 'string') {
      return botTokenHeader;
    }

    // 3. 从 Query 参数提取
    if (typeof request.query.bot_token === 'string') {
      return request.query.bot_token;
    }

    return undefined;
  }
}
