import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import {
  ErrorCode,
  ErrorModule,
  ErrorSeverity,
  getErrorSolution,
  mapSystemErrorToErrorCode,
  determineErrorModule,
  determineErrorSeverity,
} from '../constants/error-codes';

interface ErrorDetail {
  module: string;
  errorCode: ErrorCode;
  errorType: string;
  severity: ErrorSeverity;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  stack?: string;
  details?: Record<string, any>;
  solution?: {
    description: string;
    actions: string[];
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    type: string;
    message: string;
    module: string;
    severity: string;
    solution?: {
      description: string;
      actions: string[];
    };
  };
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorDetail = this.buildErrorDetail(exception, request);

    this.logError(errorDetail, exception);

    const errorResponse = this.buildErrorResponse(errorDetail);

    const httpStatus = this.determineHttpStatus(exception, errorDetail);

    response.status(httpStatus).json(errorResponse);
  }

  private buildErrorDetail(exception: unknown, request: Request): ErrorDetail {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = (request as any).requestId;

    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, timestamp, path, method, requestId);
    }

    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception, timestamp, path, method, requestId);
    }

    if (exception instanceof Error) {
      return this.handleGenericError(exception, timestamp, path, method, requestId);
    }

    return {
      module: ErrorModule.SYSTEM,
      errorCode: ErrorCode.UNKNOWN_ERROR,
      errorType: 'UnknownError',
      severity: ErrorSeverity.HIGH,
      message: 'An unknown error occurred',
      timestamp,
      path,
      method,
      requestId,
    };
  }

  private handleHttpException(
    exception: HttpException,
    timestamp: string,
    path: string,
    method: string,
    requestId?: string,
  ): ErrorDetail {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message = this.extractMessage(exceptionResponse);

    let errorCode: ErrorCode;
    let errorType: string;
    let module: ErrorModule;
    let severity: ErrorSeverity;

    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        errorCode = ErrorCode.AUTH_UNAUTHORIZED;
        errorType = 'UnauthorizedError';
        module = ErrorModule.AUTH;
        severity = ErrorSeverity.MEDIUM;
        break;
      case HttpStatus.FORBIDDEN:
        errorCode = ErrorCode.AUTH_FORBIDDEN;
        errorType = 'ForbiddenError';
        module = ErrorModule.AUTH;
        severity = ErrorSeverity.MEDIUM;
        break;
      case HttpStatus.NOT_FOUND:
        errorCode = ErrorCode.INTERNAL_ERROR;
        errorType = 'NotFoundError';
        module = determineErrorModule(exception, path);
        severity = ErrorSeverity.LOW;
        break;
      case HttpStatus.BAD_REQUEST:
        errorCode = ErrorCode.VALIDATION_ERROR;
        errorType = 'BadRequestError';
        module = ErrorModule.VALIDATION;
        severity = ErrorSeverity.LOW;
        break;
      case HttpStatus.TOO_MANY_REQUESTS:
        errorCode = ErrorCode.RATE_LIMIT_EXCEEDED;
        errorType = 'RateLimitError';
        module = ErrorModule.RATE_LIMIT;
        severity = ErrorSeverity.HIGH;
        break;
      case HttpStatus.SERVICE_UNAVAILABLE:
        errorCode = ErrorCode.SERVICE_UNAVAILABLE;
        errorType = 'ServiceUnavailableError';
        module = ErrorModule.SYSTEM;
        severity = ErrorSeverity.CRITICAL;
        break;
      default:
        errorCode = ErrorCode.INTERNAL_ERROR;
        errorType = exception.constructor.name;
        module = determineErrorModule(exception, path);
        severity = ErrorSeverity.MEDIUM;
    }

    const solution = getErrorSolution(errorCode);

    return {
      module,
      errorCode,
      errorType,
      severity,
      message,
      timestamp,
      path,
      method,
      requestId,
      stack: exception.stack,
      details: typeof exceptionResponse === 'object' ? exceptionResponse as Record<string, any> : undefined,
      solution: {
        description: solution.description,
        actions: solution.actions,
      },
    };
  }

  private handleDatabaseError(
    exception: QueryFailedError,
    timestamp: string,
    path: string,
    method: string,
    requestId?: string,
  ): ErrorDetail {
    const errorCode = mapSystemErrorToErrorCode(exception);
    const severity = determineErrorSeverity(errorCode);
    const solution = getErrorSolution(errorCode);

    const pgError = exception as any;
    const details: Record<string, any> = {};

    if (pgError.code) {
      details.pgCode = pgError.code;
    }
    if (pgError.detail) {
      details.pgDetail = pgError.detail;
    }
    if (pgError.constraint) {
      details.constraint = pgError.constraint;
    }
    if (pgError.table) {
      details.table = pgError.table;
    }

    return {
      module: ErrorModule.DATABASE,
      errorCode,
      errorType: 'DatabaseError',
      severity,
      message: this.getDatabaseErrorMessage(exception),
      timestamp,
      path,
      method,
      requestId,
      stack: exception.stack,
      details: Object.keys(details).length > 0 ? details : undefined,
      solution: {
        description: solution.description,
        actions: solution.actions,
      },
    };
  }

  private handleGenericError(
    exception: Error,
    timestamp: string,
    path: string,
    method: string,
    requestId?: string,
  ): ErrorDetail {
    const errorCode = mapSystemErrorToErrorCode(exception);
    const module = determineErrorModule(exception, path);
    const severity = determineErrorSeverity(errorCode);
    const solution = getErrorSolution(errorCode);

    return {
      module,
      errorCode,
      errorType: exception.constructor.name,
      severity,
      message: exception.message || 'An unexpected error occurred',
      timestamp,
      path,
      method,
      requestId,
      stack: exception.stack,
      solution: {
        description: solution.description,
        actions: solution.actions,
      },
    };
  }

  private getDatabaseErrorMessage(exception: QueryFailedError): string {
    const pgError = exception as any;
    
    if (pgError.code === '23505') {
      return 'Duplicate entry detected. The record already exists.';
    }
    if (pgError.code === '23503') {
      return 'Referenced record not found. Foreign key constraint violation.';
    }
    if (pgError.code === '23502') {
      return 'Required field is missing. Not null constraint violation.';
    }
    if (pgError.code === '08006' || pgError.code === '08001') {
      return 'Database connection failed. Please check database configuration.';
    }
    
    return exception.message || 'Database operation failed';
  }

  private extractMessage(response: any): string {
    if (typeof response === 'string') {
      return response;
    }
    if (response?.message) {
      if (Array.isArray(response.message)) {
        return response.message.join('; ');
      }
      return response.message;
    }
    return 'An error occurred';
  }

  private logError(errorDetail: ErrorDetail, exception: unknown): void {
    const { severity, module, errorCode, errorType, message, path, method, solution } = errorDetail;

    if (severity === ErrorSeverity.CRITICAL) {
      this.printCriticalError(errorDetail);
    } else if (severity === ErrorSeverity.HIGH) {
      this.printHighError(errorDetail);
    } else {
      this.printStandardError(errorDetail);
    }
  }

  private printCriticalError(detail: ErrorDetail): void {
    const red = '\x1b[31m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const yellow = '\x1b[33m';
    const bgRed = '\x1b[41m';

    let output = `\n${bgRed}${' '.repeat(67)}${reset}\n`;
    output += `${bgRed}${red}  ${bold}!!! CRITICAL ERROR !!!${reset}${bgRed}                                      ${reset}\n`;
    output += `${bgRed}${' '.repeat(67)}${reset}\n`;
    output += `${red}╔═════════════════════════════════════════════════════════════════════╗${reset}\n`;
    output += `${red}║${reset} ${bold}CRITICAL${reset} - ${detail.timestamp}\n`;
    output += `${red}╠═════════════════════════════════════════════════════════════════════╣${reset}\n`;
    output += `${red}║${reset} ${yellow}Module:${reset}     ${detail.module}\n`;
    output += `${red}║${reset} ${yellow}Error Type:${reset} ${detail.errorType}\n`;
    output += `${red}║${reset} ${yellow}Error Code:${reset} ${detail.errorCode}\n`;
    output += `${red}║${reset} ${yellow}Message:${reset}    ${detail.message}\n`;
    output += `${red}║${reset} ${yellow}Path:${reset}       ${detail.method} ${detail.path}\n`;

    if (detail.details) {
      output += `${red}║${reset} ${yellow}Details:${reset}\n`;
      for (const [key, value] of Object.entries(detail.details)) {
        output += `${red}║${reset}   ${key}: ${value}\n`;
      }
    }

    if (detail.solution) {
      output += `${red}║${reset} ${yellow}Solution:${reset}    ${detail.solution.description}\n`;
      output += `${red}║${reset} ${yellow}Actions:${reset}\n`;
      for (const action of detail.solution.actions.slice(0, 3)) {
        output += `${red}║${reset}   - ${action}\n`;
      }
    }

    if (detail.stack) {
      const stackLines = detail.stack.split('\n').slice(0, 3);
      output += `${red}║${reset} ${yellow}Stack:${reset}\n`;
      for (const line of stackLines) {
        output += `${red}║${reset}   ${line.trim()}\n`;
      }
    }

    output += `${red}╚═════════════════════════════════════════════════════════════════════╝${reset}\n`;

    process.stderr.write(output);
  }

  private printHighError(detail: ErrorDetail): void {
    const red = '\x1b[31m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const yellow = '\x1b[33m';

    let output = `\n${red}╔═════════════════════════════════════════════════════════════════════╗${reset}\n`;
    output += `${red}║${reset} ${bold}HIGH ERROR${reset} - ${detail.timestamp}\n`;
    output += `${red}╠═════════════════════════════════════════════════════════════════════╣${reset}\n`;
    output += `${red}║${reset} ${yellow}Module:${reset}     ${detail.module}\n`;
    output += `${red}║${reset} ${yellow}Error Type:${reset} ${detail.errorType}\n`;
    output += `${red}║${reset} ${yellow}Error Code:${reset} ${detail.errorCode}\n`;
    output += `${red}║${reset} ${yellow}Message:${reset}    ${detail.message}\n`;
    output += `${red}║${reset} ${yellow}Path:${reset}       ${detail.method} ${detail.path}\n`;

    if (detail.solution) {
      output += `${red}║${reset} ${yellow}Solution:${reset}    ${detail.solution.description}\n`;
    }

    output += `${red}╚═════════════════════════════════════════════════════════════════════╝${reset}\n`;

    process.stderr.write(output);
  }

  private printStandardError(detail: ErrorDetail): void {
    const yellow = '\x1b[33m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const cyan = '\x1b[36m';

    let output = `\n${yellow}┌─────────────────────────────────────────────────────────────────────┐${reset}\n`;
    output += `${yellow}│${reset} ${bold}ERROR${reset} [${detail.severity}] - ${detail.timestamp}\n`;
    output += `${yellow}├─────────────────────────────────────────────────────────────────────┤${reset}\n`;
    output += `${yellow}│${reset} ${cyan}Module:${reset}     ${detail.module}\n`;
    output += `${yellow}│${reset} ${cyan}Error Code:${reset} ${detail.errorCode}\n`;
    output += `${yellow}│${reset} ${cyan}Message:${reset}    ${detail.message}\n`;
    output += `${yellow}│${reset} ${cyan}Path:${reset}       ${detail.method} ${detail.path}\n`;
    output += `${yellow}└─────────────────────────────────────────────────────────────────────┘${reset}\n`;

    process.stdout.write(output);
  }

  private buildErrorResponse(detail: ErrorDetail): ErrorResponse {
    return {
      success: false,
      error: {
        code: detail.errorCode,
        type: detail.errorType,
        message: detail.message,
        module: detail.module,
        severity: detail.severity,
        solution: detail.solution,
      },
      timestamp: detail.timestamp,
      path: detail.path,
      requestId: detail.requestId,
    };
  }

  private determineHttpStatus(exception: unknown, detail: ErrorDetail): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    switch (detail.errorCode) {
      case ErrorCode.AUTH_UNAUTHORIZED:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCode.AUTH_FORBIDDEN:
        return HttpStatus.FORBIDDEN;
      case ErrorCode.AUTH_INVALID_CREDENTIALS:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCode.AUTH_TOKEN_EXPIRED:
      case ErrorCode.AUTH_INVALID_TOKEN:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCode.RATE_LIMIT_EXCEEDED:
      case ErrorCode.TOO_MANY_REQUESTS:
        return HttpStatus.TOO_MANY_REQUESTS;
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
      case ErrorCode.MISSING_REQUIRED_FIELD:
        return HttpStatus.BAD_REQUEST;
      case ErrorCode.USER_NOT_FOUND:
      case ErrorCode.GROUP_NOT_FOUND:
      case ErrorCode.MESSAGE_NOT_FOUND:
      case ErrorCode.FRIEND_REQUEST_NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case ErrorCode.DATABASE_CONNECTION_FAILED:
      case ErrorCode.REDIS_CONNECTION_FAILED:
      case ErrorCode.SERVICE_UNAVAILABLE:
        return HttpStatus.SERVICE_UNAVAILABLE;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
