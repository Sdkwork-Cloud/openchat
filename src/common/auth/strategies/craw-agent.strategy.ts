import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { AuthResult, AuthStrategy } from '../auth-strategy.interface';
import { CrawAgent } from '../../../modules/craw/entities/craw-agent.entity';

/**
 * Craw Agent API Key 认证策略
 * 支持 Bearer craw_<random> / X-Craw-API-Key
 */
@Injectable()
export class CrawAgentAuthStrategy implements AuthStrategy {
  readonly name = 'craw-agent';
  readonly priority = 25;
  private readonly logger = new Logger(CrawAgentAuthStrategy.name);

  constructor(
    @InjectRepository(CrawAgent)
    private readonly crawAgentRepository: Repository<CrawAgent>,
  ) {}

  canHandle(request: Request): boolean {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.substring(7);
      if (token.startsWith('craw_')) {
        return true;
      }
    }

    const crawApiKeyHeader = request.headers['x-craw-api-key'];
    if (typeof crawApiKeyHeader === 'string') {
      return true;
    }

    return false;
  }

  async authenticate(request: Request): Promise<AuthResult> {
    try {
      const apiKey = this.extractAPIKey(request);

      if (!apiKey) {
        return {
          success: false,
          error: 'No Craw API key provided',
        };
      }

      if (!this.isCrawApiKey(apiKey)) {
        return {
          success: false,
          error: 'Invalid Craw API key format',
        };
      }

      const agent = await this.crawAgentRepository.findOne({
        where: { apiKey, isActive: true },
      });

      if (!agent) {
        return {
          success: false,
          error: 'Invalid Craw API key',
        };
      }

      return {
        success: true,
        userId: agent.id,
        scopes: ['craw:basic'],
        metadata: {
          type: 'craw-agent',
          crawAgentId: agent.id,
          agentName: agent.name,
          apiKey,
        },
      };
    } catch (error) {
      this.logger.debug('Craw agent authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  private extractAPIKey(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.substring(7);
    }

    const crawApiKeyHeader = request.headers['x-craw-api-key'];
    if (typeof crawApiKeyHeader === 'string') {
      return crawApiKeyHeader;
    }

    return undefined;
  }

  private isCrawApiKey(value: string): boolean {
    return /^craw_[a-f0-9]{32}$/i.test(value);
  }
}
