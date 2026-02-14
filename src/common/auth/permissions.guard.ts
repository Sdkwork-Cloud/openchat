import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY, RolePermissions, Role } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles = user.roles || [Role.USER];
    
    if (requiredRoles) {
      const hasRole = requiredRoles.some(role => userRoles.includes(role));
      if (!hasRole) {
        throw new ForbiddenException('Insufficient role');
      }
    }

    if (requiredPermissions) {
      const userPermissions = this.getUserPermissions(userRoles);
      const hasPermission = requiredPermissions.every(permission =>
        userPermissions.includes(permission),
      );
      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }

  private getUserPermissions(roles: string[]): string[] {
    const permissions = new Set<string>();
    
    for (const role of roles) {
      const rolePermissions = RolePermissions[role as Role];
      if (rolePermissions) {
        rolePermissions.forEach(p => permissions.add(p));
      }
    }
    
    return Array.from(permissions);
  }
}
