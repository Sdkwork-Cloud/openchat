import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 认证守卫
 * 用于保护需要认证的路由
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('未授权访问');
    }

    const request = context.switchToHttp().getRequest();
    const deviceId = this.normalizeDeviceIdCandidate(user.deviceId);
    request.auth = {
      userId: user.userId,
      deviceId,
      roles: user.roles || [],
      scopes: user.permissions || [],
      metadata: {
        roles: user.roles || [],
        permissions: user.permissions || [],
      },
    };

    return user;
  }

  private normalizeDeviceIdCandidate(candidate: unknown): string | undefined {
    if (typeof candidate !== 'string') {
      return undefined;
    }

    const normalized = candidate.trim();
    if (!normalized) {
      return undefined;
    }

    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
      return undefined;
    }

    return normalized;
  }
}
