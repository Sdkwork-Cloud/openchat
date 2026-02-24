import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthManagerService } from '../auth-manager.service';
import { AuthResult } from '../auth-strategy.interface';

/**
 * 权限要求装饰器元数据键
 */
export const REQUIRED_SCOPES_KEY = 'requiredScopes';
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const ALLOW_ANONYMOUS_KEY = 'allowAnonymous';

/**
 * 多方式认证守卫
 * 支持 JWT、Bot Token、API Key 等多种认证方式
 */
@Injectable()
export class MultiAuthGuard implements CanActivate {
  constructor(
    private authManager: AuthManagerService,
    private reflector: Reflector,
  ) {}

  /**
   * 检查是否允许访问
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 检查是否允许匿名访问
    const allowAnonymous = this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowAnonymous && this.authManager.isAnonymousAllowed()) {
      return true;
    }

    // 执行认证
    const authResult = await this.authManager.authenticate(request);

    if (!authResult.success) {
      throw new UnauthorizedException(authResult.error || 'Authentication required');
    }

    // 将认证信息附加到请求
    this.attachAuthInfo(request, authResult);

    // 检查权限范围
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredScopes && requiredScopes.length > 0) {
      const hasScope = requiredScopes.some(scope =>
        authResult.scopes?.includes(scope)
      );

      if (!hasScope) {
        throw new ForbiddenException(
          `Required scope(s): ${requiredScopes.join(', ')}`
        );
      }
    }

    return true;
  }

  /**
   * 将认证信息附加到请求对象
   */
  private attachAuthInfo(request: Request, authResult: AuthResult): void {
    (request as Request & { auth?: Record<string, unknown> }).auth = {
      userId: authResult.userId,
      botId: authResult.botId,
      scopes: authResult.scopes || [],
      metadata: authResult.metadata,
    };

    // 为了向后兼容，同时设置 user 属性
    if (authResult.userId) {
      (request as Request & { user?: Record<string, unknown> }).user = {
        userId: authResult.userId,
        ...authResult.metadata,
      };
    }

    if (authResult.botId) {
      (request as Request & { bot?: Record<string, unknown> }).bot = {
        botId: authResult.botId,
        ...authResult.metadata,
      };
    }
  }
}

/**
 * 装饰器：要求特定权限范围
 */
export function RequireScopes(...scopes: string[]) {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      // 方法装饰器
      Reflect.defineMetadata(REQUIRED_SCOPES_KEY, scopes, descriptor.value);
    } else {
      // 类装饰器
      Reflect.defineMetadata(REQUIRED_SCOPES_KEY, scopes, target);
    }
  };
}

/**
 * 装饰器：允许匿名访问
 */
export function AllowAnonymous() {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      Reflect.defineMetadata(ALLOW_ANONYMOUS_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(ALLOW_ANONYMOUS_KEY, true, target);
    }
  };
}

/**
 * 装饰器：要求 Bot 认证
 */
export function RequireBotAuth() {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    const scopes = ['bot:basic'];
    if (descriptor) {
      Reflect.defineMetadata(REQUIRED_SCOPES_KEY, scopes, descriptor.value);
    } else {
      Reflect.defineMetadata(REQUIRED_SCOPES_KEY, scopes, target);
    }
  };
}

/**
 * 装饰器：要求 API Key 认证
 */
export function RequireAPIKey() {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    const scopes = ['api:basic'];
    if (descriptor) {
      Reflect.defineMetadata(REQUIRED_SCOPES_KEY, scopes, descriptor.value);
    } else {
      Reflect.defineMetadata(REQUIRED_SCOPES_KEY, scopes, target);
    }
  };
}
