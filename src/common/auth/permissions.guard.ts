import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';
export const PUBLIC_KEY = 'isPublic';

export function RequirePermissions(...permissions: string[]): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
    return descriptor;
  };
}

export function RequireRoles(...roles: string[]): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    return descriptor;
  };
}

export function Public(): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(PUBLIC_KEY, true, descriptor.value);
    return descriptor;
  };
}

export interface UserPermissions {
  id: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions && !requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPermissions;

    if (!user) {
      throw new BusinessException(
        BusinessErrorCode.UNAUTHORIZED,
        'User not authenticated',
      );
    }

    if (requiredRoles && !this.hasAnyRole(user, requiredRoles)) {
      throw new BusinessException(
        BusinessErrorCode.PERMISSION_DENIED,
        'Insufficient role privileges',
      );
    }

    if (requiredPermissions && !this.hasAllPermissions(user, requiredPermissions)) {
      throw new BusinessException(
        BusinessErrorCode.PERMISSION_DENIED,
        'Insufficient permissions',
      );
    }

    return true;
  }

  private hasAnyRole(user: UserPermissions, requiredRoles: string[]): boolean {
    return requiredRoles.some((role) => user.roles?.includes(role));
  }

  private hasAllPermissions(
    user: UserPermissions,
    requiredPermissions: string[],
  ): boolean {
    if (!user.permissions) {
      return false;
    }
    return requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
  }
}

export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  MESSAGE_READ: 'message:read',
  MESSAGE_WRITE: 'message:write',
  MESSAGE_DELETE: 'message:delete',
  GROUP_CREATE: 'group:create',
  GROUP_MANAGE: 'group:manage',
  GROUP_DELETE: 'group:delete',
  FRIEND_ADD: 'friend:add',
  FRIEND_REMOVE: 'friend:remove',
  ADMIN_ACCESS: 'admin:access',
  ADMIN_CONFIG: 'admin:config',
} as const;

export const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;
