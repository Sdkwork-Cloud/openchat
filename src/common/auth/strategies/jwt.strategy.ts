import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthStrategy, AuthResult, JWTPayload } from '../auth-strategy.interface';

/**
 * JWT 认证策略
 * 支持 Bearer Token 和 Query Token 两种方式
 */
@Injectable()
export class JWTAuthStrategy implements AuthStrategy {
  readonly name = 'jwt';
  readonly priority = 10;
  private readonly logger = new Logger(JWTAuthStrategy.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * 检查是否支持该请求
   */
  canHandle(request: Request): boolean {
    // 检查 Authorization 头
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return true;
    }

    // 检查 Query 参数
    if (request.query.token) {
      return true;
    }

    // 检查 Cookie
    if (request.cookies?.token) {
      return true;
    }

    return false;
  }

  /**
   * 执行 JWT 认证
   */
  async authenticate(request: Request): Promise<AuthResult> {
    try {
      const token = this.extractToken(request);

      if (!token) {
        return {
          success: false,
          error: 'No token provided'
        };
      }

      const payload = await this.jwtService.verifyAsync<JWTPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      return {
        success: true,
        userId: payload.sub || payload.userId,
        scopes: payload.permissions || ['user:basic'],
        metadata: {
          username: payload.username,
          roles: payload.roles,
          permissions: payload.permissions,
          tenantId: payload.tenantId,
          organizationId: payload.organizationId,
          issuedAt: payload.iat,
          expiresAt: payload.exp,
        }
      };

    } catch (error) {
      this.logger.debug('JWT authentication failed:', error);
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }
  }

  /**
   * 提取 Token
   */
  private extractToken(request: Request): string | undefined {
    // 1. 从 Authorization 头提取
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. 从 Query 参数提取（WebSocket 场景）
    if (typeof request.query.token === 'string') {
      return request.query.token;
    }

    // 3. 从 Cookie 提取
    if (request.cookies?.token) {
      return request.cookies.token;
    }

    return undefined;
  }
}
