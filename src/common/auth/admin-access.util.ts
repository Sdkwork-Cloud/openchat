import { ForbiddenException } from '@nestjs/common';

type RoleCarrier = {
  username?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
};

function extractRoles(input?: RoleCarrier | null): string[] {
  if (!input) {
    return [];
  }

  if (Array.isArray(input.roles)) {
    return input.roles.filter((role): role is string => typeof role === 'string');
  }

  const metadataRoles = input.metadata?.roles;
  if (Array.isArray(metadataRoles)) {
    return metadataRoles.filter(
      (role): role is string => typeof role === 'string',
    );
  }

  return [];
}

export function hasAdminAccess(input?: RoleCarrier | null): boolean {
  const roles = extractRoles(input);
  return roles.includes('admin') || input?.username === 'admin';
}

export function assertAdminAccess(
  input?: RoleCarrier | null,
  message: string = 'Admin permission required',
): void {
  if (hasAdminAccess(input)) {
    return;
  }

  throw new ForbiddenException(message);
}
