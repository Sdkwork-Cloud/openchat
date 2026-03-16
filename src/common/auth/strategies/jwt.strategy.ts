import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthStrategy, AuthResult, JWTPayload } from '../auth-strategy.interface';

/**
 * JWT 认证策略
 * 仅支持 Authorization Bearer Token
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
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (this.looksLikeJWT(token)) {
        return true;
      }
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

      if (!payload.userId) {
        return {
          success: false,
          error: 'Invalid token payload'
        };
      }

      return {
        success: true,
        userId: payload.userId,
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
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (this.looksLikeJWT(token)) {
        return token;
      }
    }

    return undefined;
  }

  private looksLikeJWT(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }
}
