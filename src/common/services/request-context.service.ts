import { Injectable, Logger, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  user?: {
    id: string;
    username?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
  };
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  params?: Record<string, any>;
  body?: any;
  startTime: number;
  metadata?: Record<string, any>;
  locale?: string;
  timezone?: string;
  deviceId?: string;
  platform?: string;
  version?: string;
}

@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly logger = new Logger(RequestContextService.name);
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  async runAsync<T>(context: RequestContext, callback: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, callback);
  }

  get(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getRequestId(): string {
    return this.get()?.requestId || 'unknown';
  }

  getUserId(): string | undefined {
    return this.get()?.userId || this.get()?.user?.id;
  }

  getUser(): RequestContext['user'] {
    return this.get()?.user;
  }

  getIp(): string | undefined {
    return this.get()?.ip;
  }

  getUserAgent(): string | undefined {
    return this.get()?.userAgent;
  }

  getLocale(): string {
    return this.get()?.locale || 'zh-CN';
  }

  getTimezone(): string {
    return this.get()?.timezone || 'Asia/Shanghai';
  }

  getDeviceId(): string | undefined {
    return this.get()?.deviceId;
  }

  getPlatform(): string | undefined {
    return this.get()?.platform;
  }

  setUserId(userId: string): void {
    const context = this.get();
    if (context) {
      context.userId = userId;
      if (context.user) {
        context.user.id = userId;
      } else {
        context.user = { id: userId };
      }
    }
  }

  setUser(user: RequestContext['user']): void {
    const context = this.get();
    if (context) {
      context.user = user;
      context.userId = user?.id;
    }
  }

  setLocale(locale: string): void {
    const context = this.get();
    if (context) {
      context.locale = locale;
    }
  }

  setMetadata(key: string, value: any): void {
    const context = this.get();
    if (context) {
      if (!context.metadata) {
        context.metadata = {};
      }
      context.metadata[key] = value;
    }
  }

  getMetadata(key: string): any {
    return this.get()?.metadata?.[key];
  }

  getElapsedTime(): number {
    const context = this.get();
    if (context) {
      return Date.now() - context.startTime;
    }
    return 0;
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    if (!user?.permissions) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    if (!user?.roles) return false;
    return user.roles.includes(role);
  }

  isAuthenticated(): boolean {
    return !!this.getUserId();
  }

  toLogContext(): Record<string, any> {
    const context = this.get();
    if (!context) return {};

    return {
      requestId: context.requestId,
      userId: context.userId,
      ip: context.ip,
      method: context.method,
      url: context.url,
      elapsed: Date.now() - context.startTime,
    };
  }

  createChildContext(overrides?: Partial<RequestContext>): RequestContext {
    const parent = this.get();
    const child: RequestContext = {
      requestId: overrides?.requestId || this.generateRequestId(),
      startTime: Date.now(),
      ...parent,
      ...overrides,
      metadata: {
        ...parent?.metadata,
        ...overrides?.metadata,
      },
    };

    return child;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function WithContext<T extends (...args: any[]) => any>(
  fn: T,
  contextExtractor?: (...args: Parameters<T>) => Partial<RequestContext>,
): T {
  return (function (this: any, ...args: Parameters<T>) {
    const contextService = new RequestContextService();
    const context: RequestContext = {
      requestId: `req_${Date.now()}`,
      startTime: Date.now(),
      ...(contextExtractor ? contextExtractor(...args) : {}),
    };

    return contextService.run(context, () => fn.apply(this, args));
  }) as T;
}

export const CONTEXT_KEYS = {
  REQUEST_ID: 'requestId',
  USER_ID: 'userId',
  USER: 'user',
  IP: 'ip',
  USER_AGENT: 'userAgent',
  LOCALE: 'locale',
  TIMEZONE: 'timezone',
  DEVICE_ID: 'deviceId',
  PLATFORM: 'platform',
} as const;
