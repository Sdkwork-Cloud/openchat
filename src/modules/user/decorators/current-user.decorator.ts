import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前用户装饰器
 * 用于从请求中获取当前登录用户信息
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@CurrentUser() user: UserEntity) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof any | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{
      user?: Record<string, unknown>;
      auth?: Record<string, unknown>;
    }>();
    const requestUser = request.user || {};
    const auth = request.auth || {};

    const normalizedUser: Record<string, unknown> = {
      ...requestUser,
      ...auth,
    };

    const authUserId = typeof auth.userId === 'string' ? auth.userId : undefined;
    const userUserId = typeof requestUser.userId === 'string' ? requestUser.userId : undefined;
    const userId = authUserId || userUserId;

    if (userId) {
      normalizedUser.userId = userId;
      normalizedUser.id = userId;
    } else if (typeof requestUser.id === 'string') {
      normalizedUser.userId = requestUser.id;
      normalizedUser.id = requestUser.id;
    }

    if (!normalizedUser.userId) {
      return null;
    }

    const key = typeof data === 'string' ? data : undefined;
    return key ? normalizedUser[key] : normalizedUser;
  },
);
