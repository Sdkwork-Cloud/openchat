/**
 * HTTP 错误处理过滤器
 * 统一处理 HTTP 请求中的异常
 *
 * @framework
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';
import { ValidationError } from 'class-validator';

/**
 * HTTP 错误响应
 */
export interface HttpErrorResponse {
  /** 时间戳 */
  timestamp: string;
  /** 请求 ID */
  requestId: string;
  /** 路径 */
  path: string;
  /** 方法 */
  method: string;
  /** 状态码 */
  statusCode: number;
  /** 错误码 */
  code: number;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 错误堆栈（仅开发环境） */
  stack?: string;
  /** 验证错误（仅验证错误） */
  validationErrors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * HTTP 错误过滤器选项
 */
export interface HttpErrorFilterOptions {
  /** 是否记录错误日志 */
  enableLogging?: boolean;
  /** 是否在响应中包含堆栈信息 */
  includeStack?: boolean;
  /** 是否在响应中包含详细信息 */
  includeDetails?: boolean;
  /** 是否隐藏内部错误详情 */
  hideInternalDetails?: boolean;
}

/**
 * HTTP 错误过滤器
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  protected readonly logger = new Logger(HttpErrorFilter.name);
  protected readonly options: Required<HttpErrorFilterOptions>;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    options?: HttpErrorFilterOptions,
  ) {
    this.options = {
      enableLogging: options?.enableLogging ?? true,
      includeStack: options?.includeStack ?? false,
      includeDetails: options?.includeDetails ?? true,
      hideInternalDetails: options?.hideInternalDetails ?? true,
    };

    // 开发环境自动包含堆栈和详情
    const isDev = this.configService?.get('NODE_ENV') === 'development';
    if (isDev) {
      this.options.includeStack = true;
      this.options.hideInternalDetails = false;
    }
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 生成请求 ID
    const requestId = this.generateRequestId(request);

    // 构建错误响应
    const errorResponse = this.buildErrorResponse(exception, request, requestId);

    // 记录错误日志
    if (this.options.enableLogging) {
      this.logError(exception, request, errorResponse);
    }

    // 发送响应
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * 构建错误响应
   */
  protected buildErrorResponse(
    exception: unknown,
    request: Request,
    requestId: string,
  ): HttpErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // 业务异常
    if (exception instanceof BusinessException) {
      return this.buildBusinessExceptionResponse(exception, request, requestId, timestamp, path, method);
    }

    // NestJS HTTP 异常
    if (exception instanceof HttpException) {
      return this.buildHttpExceptionResponse(exception, request, requestId, timestamp, path, method);
    }

    // 验证错误
    if (exception instanceof ValidationError || this.isValidationError(exception)) {
      return this.buildValidationErrorResponse(exception, request, requestId, timestamp, path, method);
    }

    // 其他未知错误
    return this.buildUnknownErrorResponse(exception, request, requestId, timestamp, path, method);
  }

  /**
   * 构建业务异常响应
   */
  protected buildBusinessExceptionResponse(
    exception: BusinessException,
    request: Request,
    requestId: string,
    timestamp: string,
    path: string,
    method: string,
  ): HttpErrorResponse {
    const statusCode = this.getHttpStatusForBusinessCode(exception.code);
    const errorDetails = this.getErrorDetails(exception.code);

    const errorResponse: HttpErrorResponse = {
      timestamp,
      requestId,
      path,
      method,
      statusCode,
      code: exception.code,
      message: exception.message,
      details: this.options.includeDetails ? exception.details : undefined,
    };

    // 添加验证错误
    if (exception.errorDetails && exception.errorDetails.length > 0) {
      errorResponse.validationErrors = exception.errorDetails.map(detail => ({
        field: detail.field || 'unknown',
        message: detail.message,
        value: detail.value,
      }));
    }

    // 添加堆栈（开发环境）
    if (this.options.includeStack && exception.stack) {
      errorResponse.stack = exception.stack;
    }

    return errorResponse;
  }

  /**
   * 构建 HTTP 异常响应
   */
  protected buildHttpExceptionResponse(
    exception: HttpException,
    request: Request,
    requestId: string,
    timestamp: string,
    path: string,
    method: string,
  ): HttpErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'HTTP Error';
    let details: any;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || message;
      details = (exceptionResponse as any).details;
    }

    const errorResponse: HttpErrorResponse = {
      timestamp,
      requestId,
      path,
      method,
      statusCode: status,
      code: this.mapHttpStatusToErrorCode(status),
      message,
      details: this.options.includeDetails ? details : undefined,
    };

    // 添加堆栈（开发环境）
    if (this.options.includeStack && exception.stack) {
      errorResponse.stack = exception.stack;
    }

    return errorResponse;
  }

  /**
   * 构建验证错误响应
   */
  protected buildValidationErrorResponse(
    exception: unknown,
    request: Request,
    requestId: string,
    timestamp: string,
    path: string,
    method: string,
  ): HttpErrorResponse {
    const validationErrors: Array<{ field: string; message: string; value?: any }> = [];

    if (exception instanceof ValidationError) {
      this.flattenValidationErrors(exception, validationErrors);
    } else if (this.isValidationError(exception)) {
      // 处理 class-validator 的验证错误数组
      const errors = exception as ValidationError[];
      for (const error of errors) {
        this.flattenValidationErrors(error, validationErrors);
      }
    }

    return {
      timestamp,
      requestId,
      path,
      method,
      statusCode: HttpStatus.BAD_REQUEST,
      code: BusinessErrorCode.VALIDATION_ERROR,
      message: '验证失败',
      validationErrors,
    };
  }

  /**
   * 构建未知错误响应
   */
  protected buildUnknownErrorResponse(
    exception: unknown,
    request: Request,
    requestId: string,
    timestamp: string,
    path: string,
    method: string,
  ): HttpErrorResponse {
    const isProduction = this.configService?.get('NODE_ENV') === 'production';
    const hideDetails = this.options.hideInternalDetails && isProduction;

    const errorMessage = exception instanceof Error ? exception.message : 'Unknown error';
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    return {
      timestamp,
      requestId,
      path,
      method,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: BusinessErrorCode.UNKNOWN_ERROR,
      message: hideDetails ? '服务器内部错误' : errorMessage,
      details: hideDetails ? undefined : {
        type: exception?.constructor?.name || 'Unknown',
      },
      stack: this.options.includeStack ? errorStack : undefined,
    };
  }

  /**
   * 记录错误日志
   */
  protected logError(
    exception: unknown,
    request: Request,
    errorResponse: HttpErrorResponse,
  ): void {
    const logData = {
      timestamp: errorResponse.timestamp,
      requestId: errorResponse.requestId,
      code: errorResponse.code,
      statusCode: errorResponse.statusCode,
      message: errorResponse.message,
      path: errorResponse.path,
      method: errorResponse.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.userId,
    };

    // 根据错误级别选择日志级别
    if (errorResponse.statusCode >= 500) {
      // 服务器错误
      this.logger.error(`HTTP ${errorResponse.statusCode}: ${errorResponse.message}`, JSON.stringify(logData));
    } else if (errorResponse.statusCode >= 400) {
      // 客户端错误
      this.logger.warn(`HTTP ${errorResponse.statusCode}: ${errorResponse.message}`, JSON.stringify(logData));
    } else {
      // 其他错误
      this.logger.error(`Unexpected error: ${errorResponse.message}`, JSON.stringify(logData));
    }
  }

  /**
   * 生成请求 ID
   */
  protected generateRequestId(request: Request): string {
    return (request.headers['x-request-id'] as string) ||
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取 HTTP 状态码
   */
  protected getHttpStatusForBusinessCode(code: number): number {
    if (code >= 5000) return HttpStatus.INTERNAL_SERVER_ERROR;
    if (code >= 4500) return HttpStatus.TOO_MANY_REQUESTS;
    if (code >= 4400) return HttpStatus.BAD_REQUEST;
    if (code >= 4300) return HttpStatus.NOT_FOUND;
    if (code >= 4200) return HttpStatus.FORBIDDEN;
    if (code >= 4100) return HttpStatus.UNAUTHORIZED;
    if (code >= 4000) return HttpStatus.BAD_REQUEST;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 映射 HTTP 状态码到错误码
   */
  protected mapHttpStatusToErrorCode(status: number): number {
    const statusMap: Record<number, number> = {
      [HttpStatus.BAD_REQUEST]: BusinessErrorCode.INVALID_PARAMETER,
      [HttpStatus.UNAUTHORIZED]: BusinessErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: BusinessErrorCode.PERMISSION_DENIED,
      [HttpStatus.NOT_FOUND]: BusinessErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: BusinessErrorCode.RESOURCE_CONFLICT,
      [HttpStatus.TOO_MANY_REQUESTS]: BusinessErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: BusinessErrorCode.UNKNOWN_ERROR,
      [HttpStatus.BAD_GATEWAY]: BusinessErrorCode.SERVICE_UNAVAILABLE,
      [HttpStatus.SERVICE_UNAVAILABLE]: BusinessErrorCode.SERVICE_UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: BusinessErrorCode.SERVICE_UNAVAILABLE,
    };

    return statusMap[status] || BusinessErrorCode.UNKNOWN_ERROR;
  }

  /**
   * 获取错误详情
   */
  protected getErrorDetails(code: number): any {
    // 简化版本，返回基本错误信息
    return undefined;
  }

  /**
   * 扁平化验证错误
   */
  protected flattenValidationErrors(
    error: ValidationError,
    errors: Array<{ field: string; message: string; value?: any }>,
    parentField?: string,
  ): void {
    const field = parentField ? `${parentField}.${error.property}` : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        errors.push({
          field,
          message,
          value: error.value,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      for (const child of error.children) {
        this.flattenValidationErrors(child, errors, field);
      }
    }
  }

  /**
   * 检查是否是验证错误
   */
  protected isValidationError(exception: unknown): boolean {
    if (!Array.isArray(exception)) {
      return false;
    }

    return exception.every(item =>
      item &&
      typeof item === 'object' &&
      'property' in item &&
      ('constraints' in item || 'children' in item),
    );
  }
}

/**
 * 业务异常专用过滤器
 */
@Catch(BusinessException)
export class BusinessExceptionFilter extends HttpErrorFilter {
  catch(exception: BusinessException, host: ArgumentsHost): void {
    super.catch(exception, host);
  }
}

/**
 * 验证错误专用过滤器
 */
@Catch(ValidationError)
export class ValidationErrorFilter extends HttpErrorFilter {
  catch(exception: ValidationError, host: ArgumentsHost): void {
    super.catch(exception, host);
  }
}
