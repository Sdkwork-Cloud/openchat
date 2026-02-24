/**
 * 权限和授权装饰器
 * 提供细粒度的访问控制
 *
 * @framework
 */

import { SetMetadata, applyDecorators, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

/**
 * 权限检查接口
 */
export interface PermissionCheck {
  /** 权限标识 */
  permission: string;
  /** 资源类型 */
  resourceType?: string;
  /** 操作类型 */
  action?: string;
  /** 条件 */
  condition?: (context: any) => boolean;
}

/**
 * 角色选项
 */
export interface RoleOptions {
  /** 角色列表 */
  roles?: string[];
  /** 是否匹配任意角色 */
  any?: boolean;
}

/**
 * 权限选项
 */
export interface PermissionOptions {
  /** 权限列表 */
  permissions?: string[];
  /** 是否匹配任意权限 */
  any?: boolean;
}

/**
 * 资源选项
 */
export interface ResourceOptions {
  /** 资源类型 */
  resourceType: string;
  /** 操作 */
  action: string;
  /** 所有者检查 */
  checkOwnership?: boolean;
  /** 自定义检查 */
  customCheck?: (context: any) => boolean;
}

/**
 * 角色元数据
 */
export const ROLES_METADATA = 'roles:required';
/**
 * 权限元数据
 */
export const PERMISSIONS_METADATA = 'permissions:required';
/**
 * 资源元数据
 */
export const RESOURCE_METADATA = 'resource:access';
/**
 * 公开元数据
 */
export const PUBLIC_METADATA = 'route:public';

/**
 * 角色装饰器
 * 限制访问角色
 *
 * @example
 * // 需要 admin 角色
 * @Roles('admin')
 * @Get('admin/stats')
 * getAdminStats() {
 *   return this.adminService.getStats();
 * }
 *
 * @example
 * // 需要 admin 或 moderator 角色
 * @Roles(['admin', 'moderator'], { any: true })
 * @Get('moderate')
 * moderate() {
 *   return this.moderationService.moderate();
 * }
 */
export function Roles(roles: string | string[], options: RoleOptions = {}): MethodDecorator {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return SetMetadata(ROLES_METADATA, {
    roles: roleList,
    any: options.any ?? true,
  });
}

/**
 * 管理员角色装饰器
 */
export function RequireAdmin(): MethodDecorator {
  return Roles('admin');
}

/**
 * 权限装饰器
 * 限制访问权限
 *
 * @example
 * // 需要单个权限
 * @Permissions('user:create')
 * @Post('users')
 * async createUser(@Body() data: CreateUserDto) {
 *   return this.userService.create(data);
 * }
 *
 * @example
 * // 需要多个权限中的任意一个
 * @Permissions(['user:create', 'user:edit'], { any: true })
 * @Post('users')
 * async createOrEditUser(@Body() data: CreateUserDto) {
 *   return this.userService.createOrEdit(data);
 * }
 */
export function Permissions(permissions: string | string[], options: PermissionOptions = {}): MethodDecorator {
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];
  return SetMetadata(PERMISSIONS_METADATA, {
    permissions: permissionList,
    any: options.any ?? false,
  });
}

/**
 * 资源访问装饰器
 *
 * @example
 * @ResourceAccess({ resourceType: 'User', action: 'edit', checkOwnership: true })
 * @Put('users/:id')
 * async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
 *   return this.userService.update(id, data);
 * }
 */
export function ResourceAccess(options: ResourceOptions): MethodDecorator {
  return SetMetadata(RESOURCE_METADATA, options);
}

/**
 * 公开路由装饰器
 * 无需认证即可访问
 *
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 */
export function Public(): MethodDecorator {
  return SetMetadata(PUBLIC_METADATA, true);
}

/**
 * 需要认证装饰器
 * 明确要求认证（默认行为，但可用于文档）
 *
 * @example
 * @RequireAuth()
 * @Get('profile')
 * getProfile() {
 *   return this.userService.getProfile();
 * }
 */
export function RequireAuth(): MethodDecorator {
  return SetMetadata(PUBLIC_METADATA, false);
}

/**
 * 权限守卫
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // 检查是否是公开路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 检查角色
    const roleRequirement = this.reflector.getAllAndOverride<{ roles: string[]; any: boolean }>(ROLES_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roleRequirement) {
      const user = this.getUser(context);
      if (!user || !user.roles) {
        return false;
      }

      const hasRole = roleRequirement.any
        ? roleRequirement.roles.some(role => user.roles.includes(role))
        : roleRequirement.roles.every(role => user.roles.includes(role));

      if (!hasRole) {
        return false;
      }
    }

    // 检查权限
    const permissionRequirement = this.reflector.getAllAndOverride<{ permissions: string[]; any: boolean }>(
      PERMISSIONS_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (permissionRequirement) {
      const user = this.getUser(context);
      if (!user || !user.permissions) {
        return false;
      }

      const hasPermission = permissionRequirement.any
        ? permissionRequirement.permissions.some(permission => user.permissions.includes(permission))
        : permissionRequirement.permissions.every(permission => user.permissions.includes(permission));

      if (!hasPermission) {
        return false;
      }
    }

    // 检查资源访问
    const resourceRequirement = this.reflector.getAllAndOverride<ResourceOptions>(RESOURCE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (resourceRequirement) {
      const user = this.getUser(context);
      if (!user) {
        return false;
      }

      // 所有者检查
      if (resourceRequirement.checkOwnership) {
        const resourceId = this.getResourceId(context);
        if (resourceId && user.resourceOwnerIds && !user.resourceOwnerIds.includes(resourceId)) {
          return false;
        }
      }

      // 自定义检查
      if (resourceRequirement.customCheck) {
        const request = context.switchToHttp().getRequest();
        if (!resourceRequirement.customCheck(request)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 获取用户信息
   */
  private getUser(context: ExecutionContext): any {
    const request = context.switchToHttp().getRequest();
    return request.user;
  }

  /**
   * 获取资源 ID
   */
  private getResourceId(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    return request.params?.id || request.body?.id;
  }
}

/**
 * 条件访问装饰器
 *
 * @example
 * @AccessCondition((user, context) => user.department === context.params.departmentId)
 * @Get('departments/:departmentId/data')
 * getDepartmentData(@Param('departmentId') departmentId: string) {
 *   return this.departmentService.getData(departmentId);
 * }
 */
export function AccessCondition(condition: (user: any, context: ExecutionContext) => boolean): MethodDecorator {
  return SetMetadata('access:condition', condition);
}

/**
 * 资源所有者装饰器
 *
 * @example
 * @ResourceOwner('userId')
 * @Delete('resources/:id')
 * async deleteResource(@Param('id') id: string) {
 *   return this.resourceService.delete(id);
 * }
 */
export function ResourceOwner(idField: string = 'id'): MethodDecorator {
  return SetMetadata('resource:owner-field', idField);
}

/**
 * 权限组合装饰器
 * 创建自定义权限组合
 *
 * @example
 * const CanManageUsers = () =>
 *   AccessControl({
 *     roles: ['admin', 'hr'],
 *     permissions: ['user:read', 'user:write'],
 *   });
 *
 * @CanManageUsers()
 * @Put('users/:id')
 * async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
 *   return this.userService.update(id, data);
 * }
 */
export function AccessControl(options: {
  roles?: string[];
  permissions?: string[];
  anyRole?: boolean;
  anyPermission?: boolean;
}): MethodDecorator {
  const decorators: MethodDecorator[] = [];

  if (options.roles?.length) {
    decorators.push(Roles(options.roles, { any: options.anyRole ?? true }));
  }

  if (options.permissions?.length) {
    decorators.push(Permissions(options.permissions, { any: options.anyPermission ?? false }));
  }

  return applyDecorators(...decorators);
}
