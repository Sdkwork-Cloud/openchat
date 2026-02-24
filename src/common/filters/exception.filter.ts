import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/response.dto';
import { BusinessException, BusinessErrorCode, ErrorCodeToHttpStatus } from '../exceptions/business.exception';

interface ErrorDetail {
  code: string | number;
  message: string;
  details?: any;
  stack?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorDetail = this.parseException(exception);
    const status = this.getStatus(exception);

    this.logError(exception, request, status, errorDetail);

    const apiResponse = {
      success: false,
      code: errorDetail.code as number,
      message: errorDetail.message,
      details: errorDetail.details,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(apiResponse);
  }

  private parseException(exception: unknown): ErrorDetail {
    if (exception instanceof BusinessException) {
      return {
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      
      if (typeof response === 'string') {
        return {
          code: exception.getStatus(),
          message: response,
        };
      }

      if (typeof response === 'object') {
        const responseObj = response as any;
        return {
          code: exception.getStatus(),
          message: responseObj.message || exception.message,
          details: responseObj.details || responseObj.errors,
        };
      }

      return {
        code: exception.getStatus(),
        message: exception.message,
      };
    }

    if (exception instanceof Error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        stack: exception.stack,
      };
    }

    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof BusinessException) {
      return ErrorCodeToHttpStatus[exception.code] || HttpStatus.INTERNAL_SERVER_ERROR;
    }
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private logError(
    exception: unknown,
    request: Request,
    status: number,
    errorDetail: ErrorDetail,
  ): void {
    const { method, url } = request;
    const logContext = {
      method,
      url,
      status,
      errorCode: errorDetail.code,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        `Server Error: ${method} ${url} - ${status} - ${errorDetail.message}`,
        exception instanceof Error ? exception.stack : undefined,
        JSON.stringify(logContext),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `Client Error: ${method} ${url} - ${status} - ${errorDetail.message}`,
        JSON.stringify(logContext),
      );
    }
  }
}

@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BusinessExceptionFilter.name);

  catch(exception: BusinessException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = ErrorCodeToHttpStatus[exception.code] || HttpStatus.BAD_REQUEST;

    this.logger.warn(
      `Business Exception: ${request.method} ${request.url} - ${exception.code} - ${exception.message}`,
    );

    const apiResponse = {
      success: false,
      code: exception.code,
      message: exception.message,
      details: exception.details,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(apiResponse);
  }
}
