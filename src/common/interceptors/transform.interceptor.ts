import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiResponseDto, PagedResponseDto } from '../dto/response.dto';

export interface ResponseMetadata {
  timestamp: number;
  requestId?: string;
  duration?: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const requestId = request.headers['x-request-id'] || this.generateRequestId();

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data && 'code' in data) {
          return data;
        }

        return {
          success: true,
          code: 200,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.debug(
            `Request ${requestId} completed in ${duration}ms - ${request.method} ${request.url}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `Request ${requestId} failed after ${duration}ms - ${request.method} ${request.url}: ${error.message}`,
          );
        },
      }),
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { method, url } = request;
        
        if (duration > 1000) {
          this.logger.warn(`Slow request: ${method} ${url} took ${duration}ms`);
        } else {
          this.logger.debug(`${method} ${url} - ${duration}ms`);
        }
      }),
    );
  }
}

@Injectable()
export class MetadataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || this.generateRequestId();
    
    request.requestId = requestId;
    request.startTime = Date.now();

    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
