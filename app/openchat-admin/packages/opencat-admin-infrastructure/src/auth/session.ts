import type { AuthUser, StoredSession } from '@openchat/opencat-admin-types';

const AUTH_TOKEN_KEY = 'openchat.admin.token';
const AUTH_REFRESH_TOKEN_KEY = 'openchat.admin.refresh-token';
const AUTH_USER_KEY = 'openchat.admin.user';

type AuthUserInput = Partial<AuthUser> & {
  id?: string | number;
  username?: string;
  nickname?: string;
  roles?: string[];
};

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
}

function removeStorage(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
}

export function normalizeAuthUser(input: AuthUserInput | null | undefined): AuthUser {
  const username = input?.username?.trim() || '';
  const nickname = input?.nickname?.trim() || undefined;
  const roles = Array.isArray(input?.roles)
    ? Array.from(
      new Set(
        input.roles.filter(
          (role): role is string => typeof role === 'string' && role.trim().length > 0,
        ),
      ),
    )
    : [];

  return {
    id: input?.id !== undefined && input?.id !== null ? String(input.id) : '',
    username,
    nickname,
    displayName: nickname || username || 'Unknown operator',
    email: input?.email,
    phone: input?.phone,
    status: input?.status,
    roles,
    avatar: input?.avatar,
    createdAt: input?.createdAt,
    updatedAt: input?.updatedAt,
    lastLoginAt: input?.lastLoginAt,
  };
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return Array.isArray(user?.roles) && user.roles.includes('admin');
}

export function getAuthToken(): string | null {
  return readStorage(AUTH_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readStorage(AUTH_REFRESH_TOKEN_KEY);
}

export function getUserInfo(): AuthUser | null {
  const raw = readStorage(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeAuthUser(JSON.parse(raw));
  } catch {
    clearStoredSession();
    return null;
  }
}

export function setStoredSession(session: StoredSession): void {
  writeStorage(AUTH_TOKEN_KEY, session.token);
  if (session.refreshToken) {
    writeStorage(AUTH_REFRESH_TOKEN_KEY, session.refreshToken);
  } else {
    removeStorage(AUTH_REFRESH_TOKEN_KEY);
  }
  writeStorage(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function updateStoredUser(user: AuthUser): void {
  writeStorage(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  removeStorage(AUTH_TOKEN_KEY);
  removeStorage(AUTH_REFRESH_TOKEN_KEY);
  removeStorage(AUTH_USER_KEY);
}

export function getStoredSession(): StoredSession | null {
  const token = getAuthToken();
  const user = getUserInfo();

  if (!token || !user) {
    return null;
  }

  return {
    token,
    refreshToken: getRefreshToken() || undefined,
    user,
  };
}
