import type { SdkworkBackendConfig } from '../types/common';
import type { RequestOptions, QueryParams } from '@sdkwork/sdk-common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';
import { BaseHttpClient, withRetry } from '@sdkwork/sdk-common';

export class HttpClient extends BaseHttpClient {
  private static readonly API_KEY_HEADER = 'X-API-Key';
  private static readonly API_KEY_USE_BEARER = false;

  constructor(config: SdkworkBackendConfig) {
    super(config as any);
  }

  private getInternalAuthConfig(): any {
    const self = this as any;
    self.authConfig = self.authConfig || {};
    return self.authConfig;
  }

  private getInternalHeaders(): Record<string, string> {
    const self = this as any;
    self.config = self.config || {};
    self.config.headers = self.config.headers || {};
    return self.config.headers;
  }

  setApiKey(apiKey: string): void {
    const authConfig = this.getInternalAuthConfig();
    const headers = this.getInternalHeaders();
    const apiKeyHeader: string = HttpClient.API_KEY_HEADER;
    const apiKeyUseBearer: boolean = HttpClient.API_KEY_USE_BEARER;

    authConfig.apiKey = apiKey;
    authConfig.tokenManager?.clearTokens?.();

    if (apiKeyHeader === 'Authorization' && apiKeyUseBearer) {
      authConfig.authMode = 'apikey';
      delete headers['Access-Token'];
      return;
    }

    authConfig.authMode = 'dual-token';
    headers[apiKeyHeader] = apiKeyUseBearer
      ? `Bearer ${apiKey}`
      : apiKey;

    if (apiKeyHeader.toLowerCase() !== 'authorization') {
      delete headers['Authorization'];
    }
    if (apiKeyHeader.toLowerCase() !== 'access-token') {
      delete headers['Access-Token'];
    }
  }

  setAuthToken(token: string): void {
    const headers = this.getInternalHeaders();
    const apiKeyHeader: string = HttpClient.API_KEY_HEADER;

    if (apiKeyHeader.toLowerCase() !== 'authorization') {
      delete headers[apiKeyHeader];
    }
    super.setAuthToken(token);
  }

  setAccessToken(token: string): void {
    const headers = this.getInternalHeaders();
    const apiKeyHeader: string = HttpClient.API_KEY_HEADER;

    if (apiKeyHeader.toLowerCase() !== 'access-token') {
      delete headers[apiKeyHeader];
    }
    super.setAccessToken(token);
  }

  setTokenManager(manager: AuthTokenManager): void {
    const baseProto = Object.getPrototypeOf(HttpClient.prototype) as { setTokenManager?: (this: HttpClient, m: AuthTokenManager) => void };
    if (typeof baseProto.setTokenManager === 'function') {
      baseProto.setTokenManager.call(this, manager);
      return;
    }
    this.getInternalAuthConfig().tokenManager = manager;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const execute = (this as any).execute;
    if (typeof execute !== 'function') {
      throw new Error('BaseHttpClient execute method is not available');
    }
    return withRetry(
      () => execute.call(this, { 
        url: path, 
        method: options.method ?? 'GET', 
        ...options 
      }),
      { maxRetries: 3 }
    );
  }

  async get<T>(path: string, params?: QueryParams, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params, headers });
  }

  async post<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, params, headers });
  }

  async put<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, params, headers });
  }

  async delete<T>(path: string, params?: QueryParams, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', params, headers });
  }

  async patch<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, params, headers });
  }
}

export function createHttpClient(config: SdkworkBackendConfig): HttpClient {
  return new HttpClient(config);
}
