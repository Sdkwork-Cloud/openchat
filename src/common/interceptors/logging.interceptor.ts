import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();
    const requestId = headers['x-request-id'] || this.generateRequestId();

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          if (url.includes('/health') || url.includes('/metrics')) {
            return;
          }

          this.logger.log(
            `[${requestId}] ${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userAgent}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `[${requestId}] ${method} ${url} ${statusCode} ${duration}ms - ${ip} - Error: ${error.message}`,
          );
        },
      }),
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
