import { describe, expect, it } from 'vitest';
import { isAdminUser, normalizeAuthUser } from './session';

describe('auth normalization', () => {
  it('normalizes backend auth users with roles', () => {
    const user = normalizeAuthUser({
      id: 'u-1',
      username: 'admin',
      nickname: 'OpenChat Root',
      roles: ['admin', 'user'],
      status: 'online',
    });

    expect(user).toEqual({
      id: 'u-1',
      username: 'admin',
      nickname: 'OpenChat Root',
      displayName: 'OpenChat Root',
      email: undefined,
      phone: undefined,
      status: 'online',
      roles: ['admin', 'user'],
      avatar: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      lastLoginAt: undefined,
    });
  });

  it('falls back to username when nickname is missing', () => {
    const user = normalizeAuthUser({
      id: 'u-2',
      username: 'operator',
      roles: ['user'],
    });

    expect(user.displayName).toBe('operator');
    expect(isAdminUser(user)).toBe(false);
  });

  it('detects admin access from roles', () => {
    const user = normalizeAuthUser({
      id: 'u-3',
      username: 'supervisor',
      roles: ['admin'],
    });

    expect(isAdminUser(user)).toBe(true);
  });
});
