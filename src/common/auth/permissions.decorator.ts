import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';

export const Permissions = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

export const Roles = (...roles: string[]) => 
  SetMetadata(ROLES_KEY, roles);

export enum Permission {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  
  MESSAGE_READ = 'message:read',
  MESSAGE_WRITE = 'message:write',
  MESSAGE_DELETE = 'message:delete',
  
  GROUP_CREATE = 'group:create',
  GROUP_READ = 'group:read',
  GROUP_WRITE = 'group:write',
  GROUP_DELETE = 'group:delete',
  
  FRIEND_READ = 'friend:read',
  FRIEND_WRITE = 'friend:write',
  
  ADMIN_ACCESS = 'admin:access',
  ADMIN_MANAGE_USERS = 'admin:manage_users',
  ADMIN_MANAGE_GROUPS = 'admin:manage_groups',
  ADMIN_VIEW_LOGS = 'admin:view_logs',
}

export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [
    Permission.USER_READ,
    Permission.MESSAGE_READ,
    Permission.MESSAGE_WRITE,
    Permission.GROUP_CREATE,
    Permission.GROUP_READ,
    Permission.FRIEND_READ,
    Permission.FRIEND_WRITE,
  ],
  [Role.MODERATOR]: [
    ...Object.values(Permission).filter(p => 
      p.startsWith('user:') || 
      p.startsWith('message:') ||
      p.startsWith('group:')
    ),
    Permission.ADMIN_ACCESS,
  ],
  [Role.ADMIN]: [
    ...Object.values(Permission).filter(p => 
      !p.startsWith('admin:') || 
      p === Permission.ADMIN_ACCESS
    ),
    Permission.ADMIN_MANAGE_USERS,
    Permission.ADMIN_MANAGE_GROUPS,
  ],
  [Role.SUPER_ADMIN]: Object.values(Permission),
};
