import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RetryService } from './retry.service';
import { MetricsService } from './metrics.service';
import { RequestTracingService } from './request-tracing.service';

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ApiClientResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  duration: number;
}

export interface ApiClientStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageDuration: number;
}

@Injectable()
export class ApiClientService implements OnModuleInit {
  private readonly logger = new Logger(ApiClientService.name);
  private readonly clients = new Map<string, ApiClientConfig>();
  private readonly stats = new Map<string, ApiClientStats>();

  constructor(
    private readonly configService: ConfigService,
    private readonly retryService: RetryService,
    private readonly metricsService: MetricsService,
    private readonly tracingService: RequestTracingService,
  ) {}

  onModuleInit() {
    this.logger.log('ApiClientService initialized');
  }

  registerClient(name: string, config: Partial<ApiClientConfig> & { baseUrl: string }): void {
    const fullConfig: ApiClientConfig = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    };

    this.clients.set(name, fullConfig);
    this.stats.set(name, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageDuration: 0,
    });

    this.logger.debug(`API client registered: ${name}`);
  }

  async request<T = any>(
    clientName: string,
    options: ApiRequestOptions,
  ): Promise<ApiClientResponse<T>> {
    const config = this.clients.get(clientName);
    if (!config) {
      throw new Error(`API client not found: ${clientName}`);
    }

    const startTime = Date.now();
    const url = this.buildUrl(config.baseUrl, options.path, options.params);
    const headers = this.buildHeaders(config, options.headers);

    const context = this.tracingService.startSpan(`api.${clientName}.${options.method}`);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal || AbortSignal.timeout(options.timeout || config.timeout),
      });

      const data = await this.parseResponse<T>(response);
      const duration = Date.now() - startTime;

      this.tracingService.endSpan(context.spanId, response.ok ? 'ok' : 'error');
      this.updateStats(clientName, response.ok, duration);
      this.metricsService.timing(`api.${clientName}.duration`, duration);

      return {
        data,
        status: response.status,
        headers: this.extractHeaders(response.headers),
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.tracingService.endSpan(context.spanId, 'error');
      this.updateStats(clientName, false, duration);
      this.metricsService.increment(`api.${clientName}.errors`);

      throw error;
    }
  }

  async requestWithRetry<T = any>(
    clientName: string,
    options: ApiRequestOptions,
  ): Promise<ApiClientResponse<T>> {
    const config = this.clients.get(clientName);
    if (!config) {
      throw new Error(`API client not found: ${clientName}`);
    }

    const result = await this.retryService.executeWithRetry(
      () => this.request<T>(clientName, options),
      `api.${clientName}.${options.path}`,
      {
        maxRetries: config.retries,
        initialDelay: config.retryDelay,
      },
    );

    if (!result.success) {
      throw result.error;
    }

    return result.result!;
  }

  async get<T = any>(
    clientName: string,
    path: string,
    params?: Record<string, any>,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>(clientName, {
      method: 'GET',
      path,
      params,
      ...options,
    });
  }

  async post<T = any>(
    clientName: string,
    path: string,
    body?: any,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>(clientName, {
      method: 'POST',
      path,
      body,
      ...options,
    });
  }

  async put<T = any>(
    clientName: string,
    path: string,
    body?: any,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>(clientName, {
      method: 'PUT',
      path,
      body,
      ...options,
    });
  }

  async patch<T = any>(
    clientName: string,
    path: string,
    body?: any,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>(clientName, {
      method: 'PATCH',
      path,
      body,
      ...options,
    });
  }

  async delete<T = any>(
    clientName: string,
    path: string,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>(clientName, {
      method: 'DELETE',
      path,
      ...options,
    });
  }

  getClientStats(clientName: string): ApiClientStats | undefined {
    return this.stats.get(clientName);
  }

  getAllStats(): Record<string, ApiClientStats> {
    return Object.fromEntries(this.stats);
  }

  private buildUrl(baseUrl: string, path: string, params?: Record<string, any>): string {
    const url = new URL(path, baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private buildHeaders(
    config: ApiClientConfig,
    additionalHeaders?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = { ...config.headers, ...additionalHeaders };

    if (config.auth) {
      switch (config.auth.type) {
        case 'bearer':
          if (config.auth.token) {
            headers['Authorization'] = `Bearer ${config.auth.token}`;
          }
          break;
        case 'basic':
          if (config.auth.username && config.auth.password) {
            const credentials = Buffer.from(
              `${config.auth.username}:${config.auth.password}`,
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
        case 'api_key':
          if (config.auth.apiKey) {
            headers[config.auth.apiKeyHeader || 'X-API-Key'] = config.auth.apiKey;
          }
          break;
      }
    }

    return headers;
  }

  private async parseResponse<T>(response: globalThis.Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    if (contentType.includes('text/')) {
      return response.text() as any;
    }

    return response.arrayBuffer() as any;
  }

  private extractHeaders(headers: globalThis.Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private updateStats(clientName: string, success: boolean, duration: number): void {
    const stats = this.stats.get(clientName);
    if (!stats) return;

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    stats.averageDuration =
      (stats.averageDuration * (stats.totalRequests - 1) + duration) / stats.totalRequests;
  }
}

export function createApiClient(config: ApiClientConfig) {
  return {
    async request<T = any>(options: ApiRequestOptions): Promise<ApiClientResponse<T>> {
      const url = `${config.baseUrl}${options.path}`;
      const headers = { ...config.headers, ...options.headers };

      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json();
      return {
        data,
        status: response.status,
        headers: {},
        duration: 0,
      };
    },
  };
}
