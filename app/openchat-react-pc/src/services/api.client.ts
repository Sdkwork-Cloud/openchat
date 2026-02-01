/**
 * API 客户端
 * 封装 HTTP 请求，处理认证、错误处理等
 */

import { API_BASE_URL } from '@/app/env';

// 请求配置接口
interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 错误类
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 获取认证令牌
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * 构建 URL
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
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

/**
 * 发送 HTTP 请求
 */
async function request<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, ...init } = config;

  const url = buildUrl(endpoint, params);

  // 默认配置
  const defaultConfig: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 添加认证头
  const token = getAuthToken();
  if (token) {
    defaultConfig.headers = {
      ...defaultConfig.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // 合并配置
  const finalConfig: RequestInit = {
    ...defaultConfig,
    ...init,
    headers: {
      ...defaultConfig.headers,
      ...init.headers,
    },
  };

  try {
    const response = await fetch(url, finalConfig);

    // 处理 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || `HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // 网络错误或其他错误
    throw new ApiError(
      error instanceof Error ? error.message : '网络请求失败',
      0
    );
  }
}

/**
 * HTTP 方法封装
 */
export const apiClient = {
  /**
   * GET 请求
   */
  get<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'GET' });
  },

  /**
   * POST 请求
   */
  post<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT 请求
   */
  put<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH 请求
   */
  patch<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE 请求
   */
  delete<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'DELETE' });
  },
};

export default apiClient;
