import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { buildCacheKey, CacheTTL } from '../decorators/cache.decorator';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  inherits?: string[];
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  missingPermissions?: string[];
}

export interface ResourcePermission {
  resourceType: string;
  resourceId: string;
  userId: string;
  permissions: string[];
}

export interface PermissionPolicy {
  resource: string;
  actions: string[];
  roles: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'owner' | 'member' | 'custom';
  check: (context: PermissionContext) => boolean | Promise<boolean>;
}

export interface PermissionContext {
  userId: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);
  private readonly permissions = new Map<string, Permission>();
  private readonly roles = new Map<string, Role>();
  private readonly policies = new Map<string, PermissionPolicy[]>();
  private readonly userRoles = new Map<string, Set<string>>();
  private readonly resourcePermissions = new Map<string, ResourcePermission>();

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit() {
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
    this.logger.log('PermissionService initialized');
  }

  registerPermission(permission: Permission): void {
    this.permissions.set(permission.id, permission);
    this.logger.debug(`Permission registered: ${permission.id}`);
  }

  registerRole(role: Role): void {
    this.roles.set(role.name, role);
    this.logger.debug(`Role registered: ${role.name}`);
  }

  registerPolicy(policy: PermissionPolicy): void {
    const key = `${policy.resource}`;
    const policies = this.policies.get(key) || [];
    policies.push(policy);
    this.policies.set(key, policies);
    this.logger.debug(`Policy registered for resource: ${policy.resource}`);
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    if (!this.roles.has(roleName)) {
      throw new Error(`Role not found: ${roleName}`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    this.userRoles.get(userId)!.add(roleName);
    await this.invalidateUserPermissionCache(userId);
    this.logger.debug(`Role ${roleName} assigned to user ${userId}`);
  }

  async revokeRole(userId: string, roleName: string): Promise<void> {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(roleName);
      await this.invalidateUserPermissionCache(userId);
    }
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const roles = this.userRoles.get(userId);
    return roles ? Array.from(roles) : [];
  }

  async check(context: PermissionContext): Promise<PermissionCheck> {
    const cacheKey = buildCacheKey('permission', context.userId, context.resourceType, context.action);

    const cached = await this.cacheService.get<PermissionCheck>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.performCheck(context);

    await this.cacheService.set(cacheKey, result, { ttl: CacheTTL.SHORT });

    return result;
  }

  async checkMany(contexts: PermissionContext[]): Promise<Map<string, PermissionCheck>> {
    const results = new Map<string, PermissionCheck>();

    await Promise.all(
      contexts.map(async (ctx) => {
        const key = `${ctx.resourceType}:${ctx.action}`;
        results.set(key, await this.check(ctx));
      }),
    );

    return results;
  }

  async grantResourcePermission(
    resourceType: string,
    resourceId: string,
    userId: string,
    permissions: string[],
  ): Promise<void> {
    const key = `${resourceType}:${resourceId}:${userId}`;
    this.resourcePermissions.set(key, {
      resourceType,
      resourceId,
      userId,
      permissions,
    });
    await this.invalidateUserPermissionCache(userId);
  }

  async revokeResourcePermission(
    resourceType: string,
    resourceId: string,
    userId: string,
  ): Promise<void> {
    const key = `${resourceType}:${resourceId}:${userId}`;
    this.resourcePermissions.delete(key);
    await this.invalidateUserPermissionCache(userId);
  }

  async getResourcePermissions(
    resourceType: string,
    resourceId: string,
    userId: string,
  ): Promise<string[]> {
    const key = `${resourceType}:${resourceId}:${userId}`;
    const rp = this.resourcePermissions.get(key);
    return rp?.permissions || [];
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId);
    const permissions = new Set<string>();

    for (const roleName of roles) {
      const role = this.roles.get(roleName);
      if (role) {
        role.permissions.forEach((p) => permissions.add(p));
        if (role.inherits) {
          for (const inheritedRole of role.inherits) {
            const inherited = this.roles.get(inheritedRole);
            if (inherited) {
              inherited.permissions.forEach((p) => permissions.add(p));
            }
          }
        }
      }
    }

    return Array.from(permissions);
  }

  private async performCheck(context: PermissionContext): Promise<PermissionCheck> {
    const userPermissions = await this.getUserPermissions(context.userId);
    const requiredPermission = `${context.resourceType}:${context.action}`;

    if (userPermissions.includes('*') || userPermissions.includes(requiredPermission)) {
      return { allowed: true };
    }

    const policies = this.policies.get(context.resourceType) || [];
    for (const policy of policies) {
      if (policy.actions.includes(context.action) || policy.actions.includes('*')) {
        const userRoles = await this.getUserRoles(context.userId);
        const hasRole = policy.roles.some((r) => userRoles.includes(r));

        if (hasRole) {
          if (policy.conditions && policy.conditions.length > 0) {
            for (const condition of policy.conditions) {
              const passed = await condition.check(context);
              if (!passed) {
                return {
                  allowed: false,
                  reason: `Condition not met: ${condition.type}`,
                };
              }
            }
          }
          return { allowed: true };
        }
      }
    }

    const resourcePermissions = await this.getResourcePermissions(
      context.resourceType,
      context.resourceId || '',
      context.userId,
    );

    if (resourcePermissions.includes(context.action) || resourcePermissions.includes('*')) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Missing permission: ${requiredPermission}`,
      missingPermissions: [requiredPermission],
    };
  }

  private async invalidateUserPermissionCache(userId: string): Promise<void> {
    const pattern = buildCacheKey('permission', userId);
    await this.cacheService.deletePattern(pattern);
  }

  private initializeDefaultPermissions(): void {
    this.registerPermission({
      id: 'message:send',
      name: 'Send Message',
      resource: 'message',
      action: 'send',
    });

    this.registerPermission({
      id: 'message:read',
      name: 'Read Message',
      resource: 'message',
      action: 'read',
    });

    this.registerPermission({
      id: 'group:create',
      name: 'Create Group',
      resource: 'group',
      action: 'create',
    });

    this.registerPermission({
      id: 'group:manage',
      name: 'Manage Group',
      resource: 'group',
      action: 'manage',
    });

    this.registerPermission({
      id: 'friend:add',
      name: 'Add Friend',
      resource: 'friend',
      action: 'add',
    });

    this.registerPermission({
      id: 'friend:remove',
      name: 'Remove Friend',
      resource: 'friend',
      action: 'remove',
    });

    this.registerPermission({
      id: '*',
      name: 'All Permissions',
      resource: '*',
      action: '*',
    });
  }

  private initializeDefaultRoles(): void {
    this.registerRole({
      id: 'user',
      name: 'user',
      permissions: ['message:send', 'message:read', 'group:create', 'friend:add', 'friend:remove'],
    });

    this.registerRole({
      id: 'group_admin',
      name: 'group_admin',
      permissions: ['group:manage'],
      inherits: ['user'],
    });

    this.registerRole({
      id: 'admin',
      name: 'admin',
      permissions: ['*'],
      inherits: ['user', 'group_admin'],
    });
  }
}

export function definePermission(resource: string, action: string): string {
  return `${resource}:${action}`;
}

export const Permissions = {
  MESSAGE_SEND: 'message:send',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELETE: 'message:delete',
  GROUP_CREATE: 'group:create',
  GROUP_MANAGE: 'group:manage',
  GROUP_DELETE: 'group:delete',
  FRIEND_ADD: 'friend:add',
  FRIEND_REMOVE: 'friend:remove',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  ALL: '*',
};

export const Roles = {
  USER: 'user',
  GROUP_ADMIN: 'group_admin',
  ADMIN: 'admin',
};
