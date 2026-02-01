import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

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
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 将用户信息附加到 socket 对象
      (client as any).user = payload;

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
    // 1. 从 auth 对象中获取
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. 从查询参数中获取
    if (client.handshake.query?.token) {
      const token = client.handshake.query.token;
      return Array.isArray(token) ? token[0] : token;
    }

    // 3. 从 headers 中获取
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
      return authHeader;
    }

    // 4. 从 cookies 中获取
    if (client.handshake.headers.cookie) {
      const cookies = client.handshake.headers.cookie.split(';');
      const tokenCookie = cookies.find((c) => c.trim().startsWith('token='));
      if (tokenCookie) {
        return tokenCookie.split('=')[1];
      }
    }

    return null;
  }
}
