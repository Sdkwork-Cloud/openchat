import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

interface WsJwtPayload {
  userId?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

/**
 * WebSocket JWT 认证 Guard
 * 验证 WebSocket 连接的 JWT Token
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn('No token provided in WebSocket connection');
        client.disconnect(true);
        return false;
      }

      // 验证 JWT Token
      const payload = await this.jwtService.verifyAsync<WsJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.userId;
      if (!userId) {
        this.logger.warn('WebSocket JWT payload missing userId');
        client.disconnect(true);
        return false;
      }

      // 将用户信息附加到 socket 对象
      (client as any).user = {
        ...payload,
        userId,
      };

      return true;
    } catch (error) {
      this.logger.warn(`WebSocket JWT validation failed: ${error.message}`);
      const client: Socket = context.switchToWs().getClient<Socket>();
      client.disconnect(true);
      return false;
    }
  }

  /**
   * 从 WebSocket 连接中提取 JWT Token
   */
  private extractToken(client: Socket): string | null {
    // 1. 从 auth 对象中获取（推荐）
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. 从 Authorization 头中获取
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
      return authHeader;
    }

    return null;
  }
}
