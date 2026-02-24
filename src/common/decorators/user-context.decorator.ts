/**
 * 用户上下文装饰器
 * 获取当前登录用户信息
 *
 * @framework
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * 用户信息接口
 */
export interface UserInfo {
  /** 用户 ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 角色 */
  roles?: string[];
  /** 权限 */
  permissions?: string[];
  /** 其他元数据 */
  [key: string]: any;
}

/**
 * 扩展 Request 接口以包含用户信息
 */
export interface RequestWithUser extends Request {
  user?: UserInfo;
  requestId?: string;
}

/**
 * 用户上下文装饰器
 * 从请求中提取用户信息
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: UserInfo) {
 *   return this.userService.getProfile(user.userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserInfo | undefined, ctx: ExecutionContext): UserInfo | any => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user as UserInfo;

    if (!user) {
      return null;
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);

/**
 * 获取当前用户 ID
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUserId() userId: string) {
 *   return this.userService.getProfile(userId);
 * }
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.userId;
  },
);

/**
 * 获取当前用户角色
 *
 * @example
 * @Get('admin/stats')
 * getStats(@CurrentUserRoles() roles: string[]) {
 *   return this.adminService.getStats(roles);
 * }
 */
export const CurrentUserRoles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | string[] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.roles || [];
  },
);

/**
 * 获取当前用户权限
 *
 * @example
 * @Get('permissions')
 * getPermissions(@CurrentUserPermissions() permissions: string[]) {
 *   return permissions;
 * }
 */
export const CurrentUserPermissions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.permissions || [];
  },
);

/**
 * 获取请求 ID
 *
 * @example
 * @Get('data')
 * getData(@RequestId() requestId: string) {
 *   return this.dataService.getData(requestId);
 * }
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.headers['x-request-id'] as string | undefined || request.requestId;
  },
);

/**
 * 获取客户端 IP
 *
 * @example
 * @Post('login')
 * login(@ClientIp() ip: string) {
 *   return this.authService.login(ip);
 * }
 */
export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || '';
  },
);

/**
 * 获取用户代理
 *
 * @example
 * @Post('device')
 * registerDevice(@UserAgent() userAgent: string) {
 *   return this.deviceService.register(userAgent);
 * }
 */
export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['user-agent'] || '';
  },
);

/**
 * 获取分页参数
 *
 * @example
 * @Get('list')
 * getList(@PaginationParams() { page, pageSize }: PaginationParams) {
 *   return this.service.getList({ page, pageSize });
 * }
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

export const PaginationParams = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const query = request.query;

    const page = Math.max(1, parseInt(query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 20));

    return {
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    };
  },
);

/**
 * 获取排序参数
 *
 * @example
 * @Get('list')
 * getList(@SortParams() { sortBy, sortOrder }: SortParams) {
 *   return this.service.getList({ sortBy, sortOrder });
 * }
 */
export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const SortParams = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SortParams => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const query = request.query;

    const sortBy = (query.sortBy as string) || 'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';

    return {
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };
  },
);

/**
 * 获取搜索参数
 *
 * @example
 * @Get('search')
 * search(@SearchParams() { keyword, page, pageSize, sortBy, sortOrder }: SearchParams) {
 *   return this.service.search({ keyword, page, pageSize, sortBy, sortOrder });
 * }
 */
export interface SearchParams extends PaginationParams, SortParams {
  keyword?: string;
  filters?: Record<string, any>;
}

export const SearchParams = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SearchParams => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const query = request.query;

    const page = Math.max(1, parseInt(query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 20));
    const sortBy = (query.sortBy as string) || 'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';
    const keyword = query.keyword as string | undefined;
    const filters = query.filters as Record<string, any> | undefined;

    return {
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc',
      keyword,
      filters,
    };
  },
);
