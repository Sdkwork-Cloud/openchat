/**
 * HTTP请求客户端
 * 统一的请求处理、错误处理、拦截器
 */

import { Result, Page } from './types';

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
}

export interface Response<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiClientOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retry?: number;
  retryDelay?: number;
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onResponse?: <T>(response: Response<T>) => Response<T> | Promise<Response<T>>;
  onError?: (error: ApiError) => void;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(message: string, code: string = 'API_ERROR', status: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static fromResponse(response: Response): ApiError {
    const data = response.data as any;
    return new ApiError(
      data?.message || data?.error || 'Request failed',
      data?.code || 'API_ERROR',
      response.status,
      data?.details
    );
  }

  static networkError(error: Error): ApiError {
    return new ApiError(
      error.message,
      'NETWORK_ERROR',
      0,
      error
    );
  }

  static timeout(): ApiError {
    return new ApiError(
      'Request timeout',
      'TIMEOUT',
      408
    );
  }
}

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retry: number;
  private retryDelay: number;
  private onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  private onResponse?: <T>(response: Response<T>) => Response<T> | Promise<Response<T>>;
  private onError?: (error: ApiError) => void;

  constructor(options: ApiClientOptions) {
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    this.retry = options.retry ?? 0;
    this.retryDelay = options.retryDelay ?? 1000;
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
    this.onError = options.onError;
  }

  setToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  clearToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  async request<T = any>(config: RequestConfig): Promise<T> {
    let finalConfig = { ...config };

    finalConfig.url = this.buildURL(finalConfig.url, finalConfig.params);
    finalConfig.headers = {
      ...this.defaultHeaders,
      ...finalConfig.headers,
    };
    finalConfig.method = finalConfig.method || 'GET';
    finalConfig.timeout = finalConfig.timeout ?? this.timeout;

    if (this.onRequest) {
      finalConfig = await this.onRequest(finalConfig);
    }

    return this.executeWithRetry<T>(finalConfig);
  }

  private buildURL(url: string, params?: Record<string, any>): string {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    if (!params) return fullURL;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullURL}?${queryString}` : fullURL;
  }

  private async executeWithRetry<T>(config: RequestConfig, attempt: number = 0): Promise<T> {
    try {
      const response = await this.execute<T>(config);
      
      if (this.onResponse) {
        return await this.onResponse(response);
      }
      
      return response.data;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : ApiError.networkError(error as Error);

      if (this.onError) {
        this.onError(apiError);
      }

      if (attempt < (config.retry ?? this.retry) && this.shouldRetry(apiError)) {
        await this.delay(this.retryDelay * Math.pow(2, attempt));
        return this.executeWithRetry<T>(config, attempt + 1);
      }

      throw apiError;
    }
  }

  private async execute<T>(config: RequestConfig): Promise<Response<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(
          data?.message || `HTTP ${response.status}`,
          data?.code || `HTTP_${response.status}`,
          response.status,
          data
        );
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: {},
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw ApiError.timeout();
      }

      throw ApiError.networkError(error);
    }
  }

  private shouldRetry(error: ApiError): boolean {
    return (
      error.status === 0 ||
      error.status === 408 ||
      error.status >= 500
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T = any>(url: string, params?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: 'GET', params, ...config });
  }

  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: 'POST', data, ...config });
  }

  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: 'PUT', data, ...config });
  }

  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: 'DELETE', ...config });
  }

  async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: 'PATCH', data, ...config });
  }

  async getPage<T = any>(url: string, page: number = 0, size: number = 20): Promise<Page<T>> {
    const result = await this.request<Result<Page<T>>>({
      url,
      method: 'GET',
      params: { page, size },
    });
    return result.data as any;
  }
}

let defaultClient: ApiClient | null = null;

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

export function getDefaultClient(): ApiClient | null {
  return defaultClient;
}

export function setDefaultClient(client: ApiClient): void {
  defaultClient = client;
}
