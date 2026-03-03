import { API_BASE_URL } from '../config/env';

const AUTH_STORAGE_KEY = 'openchat_auth_data';

type QueryValue = string | number | boolean;

interface RequestConfig extends RequestInit {
  params?: Record<string, QueryValue>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ClientTokens {
  authToken: string | null;
  accessToken: string | null;
}

function normalizeStoredToken(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readAuthToken(): string | null {
  const rawAuthData = localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawAuthData) {
    try {
      const parsed = JSON.parse(rawAuthData) as
        | { token?: unknown; authToken?: unknown }
        | null;
      if (parsed) {
        const cachedAuthToken =
          typeof parsed.authToken === 'string'
            ? parsed.authToken
            : typeof parsed.token === 'string'
              ? parsed.token
              : null;
        const normalized = normalizeStoredToken(cachedAuthToken);
        if (normalized) {
          return normalized;
        }
      }
    } catch {
      // Ignore invalid auth cache payload.
    }
  }

  return normalizeStoredToken(localStorage.getItem('auth_token'));
}

function readAccessToken(): string | null {
  const rawAuthData = localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawAuthData) {
    try {
      const parsed = JSON.parse(rawAuthData) as
        | { accessToken?: unknown; token?: unknown; authToken?: unknown }
        | null;
      if (parsed) {
        const cachedAccessToken =
          typeof parsed.accessToken === 'string'
            ? parsed.accessToken
            : typeof parsed.token === 'string'
              ? parsed.token
              : typeof parsed.authToken === 'string'
                ? parsed.authToken
                : null;
        const normalized = normalizeStoredToken(cachedAccessToken);
        if (normalized) {
          return normalized;
        }
      }
    } catch {
      // Ignore invalid auth cache payload.
    }
  }

  const preferred = normalizeStoredToken(localStorage.getItem('access_token'));
  if (preferred) {
    return preferred;
  }

  // Compatibility fallback for older app storage.
  return normalizeStoredToken(localStorage.getItem('token'));
}

function resolveClientTokens(): ClientTokens {
  return {
    authToken: readAuthToken(),
    accessToken: readAccessToken(),
  };
}

function buildUrl(endpoint: string, params?: Record<string, QueryValue>): string {
  const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}/api${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request<T = unknown>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, ...init } = config;
  const url = buildUrl(endpoint, params);

  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const tokens = resolveClientTokens();
  const bearerToken = tokens.authToken || tokens.accessToken;
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`);
  }
  if (tokens.accessToken) {
    headers.set('Access-Token', tokens.accessToken);
  }

  const finalConfig: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(url, finalConfig);

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new ApiError(`Non-JSON response (HTTP ${response.status})`, response.status, {
        rawResponse: text.substring(0, 500),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(
        (data && (data.message || data.error)) || `HTTP ${response.status}`,
        response.status,
        data,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error instanceof Error ? error.message : 'Request failed', 0);
  }
}

export const apiClient = {
  get<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'GET' });
  },

  post<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  put<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  patch<T = unknown>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  delete<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'DELETE' });
  },
};

export default apiClient;
