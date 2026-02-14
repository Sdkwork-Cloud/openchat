import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  startTime: number;
  method: string;
  url: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

@Injectable()
export class RequestTracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestTracingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const startTime = Date.now();

    const context: RequestContext = {
      requestId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      startTime,
      method: req.method,
      url: req.originalUrl,
    };

    res.setHeader('X-Request-Id', requestId);

    asyncLocalStorage.run(context, () => {
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        const logData = {
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: context.ip,
          userId: (req as any).user?.userId || 'anonymous',
        };

        if (res.statusCode >= 400) {
          this.logger.warn(JSON.stringify(logData));
        }
      });

      next();
    });
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  static getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  }

  static getRequestId(): string | undefined {
    return asyncLocalStorage.getStore()?.requestId;
  }

  static setUserId(userId: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.userId = userId;
    }
  }
}

export const getRequestId = RequestTracingMiddleware.getRequestId;
export const getContext = RequestTracingMiddleware.getContext;
export const setUserId = RequestTracingMiddleware.setUserId;
