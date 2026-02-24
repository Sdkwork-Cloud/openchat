import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSION_KEY = 'permissions';
export const ROLE_KEY = 'roles';
export const OWNER_ONLY_KEY = 'ownerOnly';

export type Permission = string | string[];

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = user.permissions || [];
    const hasPermission = requiredPermissions.some((permission) => {
      if (Array.isArray(permission)) {
        return permission.every((p) => userPermissions.includes(p));
      }
      return userPermissions.includes(permission);
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles = user.roles || [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isOwnerOnly = this.reflector.getAllAndOverride<boolean>(
      OWNER_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isOwnerOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceOwnerId = request.params?.ownerId || request.body?.ownerId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.id !== resourceOwnerId && !user.roles?.includes('admin')) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}

export function RequirePermissions(...permissions: Permission[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(PERMISSION_KEY, permissions),
    UseGuards(PermissionGuard),
  );
}

export function RequireRoles(...roles: string[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(ROLE_KEY, roles),
    UseGuards(RoleGuard),
  );
}

export function OwnerOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(OWNER_ONLY_KEY, true),
    UseGuards(OwnerGuard),
  );
}

export function AdminOnly(): MethodDecorator & ClassDecorator {
  return RequireRoles('admin');
}

export function Authenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata('requiresAuth', true),
  );
}
