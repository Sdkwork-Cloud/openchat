import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { AuthStrategy, AuthResult, APIKeyPayload } from '../auth-strategy.interface';

/**
 * API Key 认证策略
 * 支持 oc_api_<keyId>_<random> 格式的 API Key
 * 适用于服务器间通信和第三方集成
 */
@Injectable()
export class APIKeyAuthStrategy implements AuthStrategy {
  readonly name = 'api-key';
  readonly priority = 30;
  private readonly logger = new Logger(APIKeyAuthStrategy.name);

  // API Key 存储（生产环境应使用 Redis 或数据库）
  private apiKeys: Map<string, APIKeyPayload> = new Map();

  constructor(private configService: ConfigService) {}

  /**
   * 检查是否支持该请求
   */
  canHandle(request: Request): boolean {
    // 检查 X-API-Key 头
    if (request.headers['x-api-key']) {
      return true;
    }

    // 检查 Query 参数
    if (request.query.api_key) {
      return true;
    }

    return false;
  }

  /**
   * 执行 API Key 认证
   */
  async authenticate(request: Request): Promise<AuthResult> {
    try {
      const apiKey = this.extractAPIKey(request);

      if (!apiKey) {
        return {
          success: false,
          error: 'No API key provided'
        };
      }

      // 验证 API Key 格式
      if (!this.isValidAPIKeyFormat(apiKey)) {
        return {
          success: false,
          error: 'Invalid API key format'
        };
      }

      // 解析 API Key
      const keyId = this.extractKeyId(apiKey);

      // 验证 API Key（生产环境应从数据库/Redis查询）
      const payload = await this.verifyAPIKey(keyId, apiKey);

      if (!payload) {
        return {
          success: false,
          error: 'Invalid API key'
        };
      }

      return {
        success: true,
        userId: payload.appId,      // API Key 关联到应用
        scopes: payload.scopes,
        metadata: {
          type: 'api-key',
          keyId: payload.keyId,
          appId: payload.appId,
          permissions: payload.permissions,
        }
      };

    } catch (error) {
      this.logger.debug('API key authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * 注册 API Key（用于管理接口）
   */
  registerAPIKey(keyId: string, apiKey: string, payload: APIKeyPayload): void {
    // 存储 API Key 哈希而非明文
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    this.apiKeys.set(keyId, { ...payload, keyHash } as any);
  }

  /**
   * 撤销 API Key
   */
  revokeAPIKey(keyId: string): boolean {
    return this.apiKeys.delete(keyId);
  }

  /**
   * 生成新的 API Key
   */
  generateAPIKey(appId: string, scopes: string[]): { keyId: string; apiKey: string; payload: APIKeyPayload } {
    const keyId = crypto.randomBytes(16).toString('hex');
    const randomPart = crypto.randomBytes(32).toString('hex');
    const apiKey = `oc_api_${keyId}_${randomPart}`;

    const payload: APIKeyPayload = {
      keyId,
      appId,
      scopes,
      permissions: scopes, // 简化处理，实际应映射权限
    };

    this.registerAPIKey(keyId, apiKey, payload);

    return { keyId, apiKey, payload };
  }

  // ========== 私有方法 ==========

  /**
   * 提取 API Key
   */
  private extractAPIKey(request: Request): string | undefined {
    // 1. 从 X-API-Key 头提取
    const apiKeyHeader = request.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string') {
      return apiKeyHeader;
    }

    // 2. 从 Query 参数提取
    if (typeof request.query.api_key === 'string') {
      return request.query.api_key;
    }

    return undefined;
  }

  /**
   * 验证 API Key 格式
   */
  private isValidAPIKeyFormat(apiKey: string): boolean {
    // 格式: oc_api_<keyId>_<random64>
    const parts = apiKey.split('_');
    return parts.length === 4 &&
           parts[0] === 'oc' &&
           parts[1] === 'api' &&
           parts[2].length === 32 &&
           parts[3].length === 64;
  }

  /**
   * 提取 Key ID
   */
  private extractKeyId(apiKey: string): string {
    const parts = apiKey.split('_');
    return parts[2];
  }

  /**
   * 验证 API Key
   * 生产环境应从数据库查询
   */
  private async verifyAPIKey(keyId: string, apiKey: string): Promise<APIKeyPayload | null> {
    // 计算哈希
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // 从存储中查询
    const stored = this.apiKeys.get(keyId);

    if (!stored) {
      return null;
    }

    // 验证哈希
    if ((stored as any).keyHash !== keyHash) {
      return null;
    }

    return stored;
  }
}
