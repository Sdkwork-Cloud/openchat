import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

/**
 * 业务异常过滤器
 * 专门处理 BusinessException 类型的异常
 */
@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BusinessExceptionFilter.name);

  catch(exception: BusinessException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = {
      success: false,
      code: exception.code,
      message: exception.message,
      details: exception.details,
      errorDetails: exception.errorDetails,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(
      `${request.method} ${request.url} - Business Error: ${exception.message}`,
    );

    const status = this.getHttpStatus(exception.code);
    response.status(status).json(errorResponse);
  }

  private getHttpStatus(code: number): number {
    if (code >= 5000) return 500;
    if (code >= 4000) return 400;
    return 500;
  }
}
