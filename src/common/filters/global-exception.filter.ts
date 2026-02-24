import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WsException } from '@nestjs/websockets';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { Socket } from 'socket.io';

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
  requestId: string;
}

/**
 * 全局异常过滤器
 * 统一处理所有异常并返回标准错误响应
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // 检查是否是启动期间的数据库连接错误
    if (exception instanceof Error) {
      const errorMsg = exception.message || '';
      const errorCode = (exception as any).code || '';
      
      if (errorCode === 'ECONNRESET' || errorCode === 'ETIMEDOUT' || errorCode === 'ECONNREFUSED' ||
          errorMsg.includes('ECONNRESET') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNREFUSED')) {
        this.logger.error('');
        this.logger.error('═══════════════════════════════════════════════════════════');
        this.logger.error('✗ 数据库连接失败');
        this.logger.error(`  错误码: ${errorCode || 'N/A'}`);
        this.logger.error(`  错误信息: ${errorMsg}`);
        this.logger.error('  请检查:');
        this.logger.error('  1. 数据库服务是否已启动');
        this.logger.error('  2. 网络连接是否正常');
        this.logger.error('  3. 数据库配置是否正确 (.env 文件)');
        this.logger.error('═══════════════════════════════════════════════════════════');
        this.logger.error('');
        
        // 如果是启动期间，直接退出
        if (!host || host.getType() !== 'http') {
          process.exit(1);
        }
      }
    }

    // 检查上下文类型
    if (host.getType() === 'http') {
      // HTTP 上下文
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
      const requestId = this.generateRequestId();

      // 构建错误响应
      const errorResponse = this.buildErrorResponse(
        exception,
        request,
        requestId,
      );

      // 记录错误日志
      this.logError(exception, request, requestId, errorResponse);

      // 发送响应
      const statusCode = this.getHttpStatus(exception);
      response.status(statusCode).json(errorResponse);
    } else if (host.getType() === 'ws') {
      // WebSocket 上下文
      const ctx = host.switchToWs();
      const client = ctx.getClient<Socket>();
      const data = ctx.getData();
      const requestId = this.generateRequestId();

      // 构建错误响应
      const errorResponse = this.buildWSErrorResponse(
        exception,
        client,
        data,
        requestId,
      );

      // 记录错误日志
      this.logWSError(exception, client, data, requestId, errorResponse);

      // 发送错误消息给客户端
      client.emit('error', errorResponse);
    }
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
    requestId: string,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // 业务异常
    if (exception instanceof BusinessException) {
      return {
        code: exception.code,
        message: exception.message,
        details: exception.details,
        timestamp,
        path,
        requestId,
      };
    }

    // NestJS HTTP 异常
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message = typeof response === 'string' 
        ? response 
        : (response as any).message || '请求错误';

      return {
        code: this.mapHttpStatusToErrorCode(exception.getStatus()),
        message,
        timestamp,
        path,
        requestId,
      };
    }

    // TypeORM 查询错误
    if (exception instanceof QueryFailedError) {
      return {
        code: BusinessErrorCode.OPERATION_FAILED,
        message: '数据库操作失败',
        details: { sql: (exception as any).sql },
        timestamp,
        path,
        requestId,
      };
    }

    // TypeORM 实体未找到
    if (exception instanceof EntityNotFoundError) {
      return {
        code: BusinessErrorCode.RESOURCE_NOT_FOUND,
        message: '资源不存在',
        timestamp,
        path,
        requestId,
      };
    }

    // 其他未知错误
    const errorMessage = exception instanceof Error 
      ? exception.message 
      : '未知错误';

    return {
      code: BusinessErrorCode.UNKNOWN_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : errorMessage,
      timestamp,
      path,
      requestId,
    };
  }

  /**
   * 记录错误日志
   */
  private logError(
    exception: unknown,
    request: Request,
    requestId: string,
    errorResponse: ErrorResponse,
  ): void {
    const logData = {
      requestId,
      code: errorResponse.code,
      message: errorResponse.message,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.id,
      timestamp: errorResponse.timestamp,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    // 根据错误级别选择日志级别
    if (errorResponse.code >= 5000) {
      // 服务错误
      this.logger.error(logData, 'Service error occurred');
    } else if (errorResponse.code >= 4000) {
      // 客户端错误
      this.logger.warn(logData, 'Client error occurred');
    } else {
      // 其他错误
      this.logger.error(logData, 'Unexpected error occurred');
    }
  }

  /**
   * 获取 HTTP 状态码
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (exception instanceof QueryFailedError) {
      return HttpStatus.BAD_REQUEST;
    }

    if (exception instanceof EntityNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 映射 HTTP 状态码到业务错误码
   */
  private mapHttpStatusToErrorCode(status: number): BusinessErrorCode {
    const statusMap: Record<number, BusinessErrorCode> = {
      [HttpStatus.BAD_REQUEST]: BusinessErrorCode.INVALID_PARAMETER,
      [HttpStatus.UNAUTHORIZED]: BusinessErrorCode.INVALID_TOKEN,
      [HttpStatus.FORBIDDEN]: BusinessErrorCode.PERMISSION_DENIED,
      [HttpStatus.NOT_FOUND]: BusinessErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: BusinessErrorCode.RESOURCE_EXISTS,
      [HttpStatus.TOO_MANY_REQUESTS]: BusinessErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: BusinessErrorCode.UNKNOWN_ERROR,
      [HttpStatus.BAD_GATEWAY]: BusinessErrorCode.SERVICE_UNAVAILABLE,
      [HttpStatus.SERVICE_UNAVAILABLE]: BusinessErrorCode.SERVICE_UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: BusinessErrorCode.SERVICE_UNAVAILABLE,
    };

    return statusMap[status] || BusinessErrorCode.UNKNOWN_ERROR;
  }

  /**
   * 构建WebSocket错误响应
   */
  private buildWSErrorResponse(
    exception: unknown,
    client: Socket,
    data: any,
    requestId: string,
  ): any {
    const timestamp = new Date().toISOString();
    const socketId = client.id;
    const ip = client.handshake.address;

    // WebSocket异常
    if (exception instanceof WsException) {
      const errorData = exception.getError();
      return {
        code: 4000,
        message: typeof errorData === 'string' ? errorData : 'WebSocket error',
        socketId,
        timestamp,
        requestId,
        ip,
      };
    }

    // 业务异常
    if (exception instanceof BusinessException) {
      return {
        code: exception.code,
        message: exception.message,
        details: exception.details,
        socketId,
        timestamp,
        requestId,
        ip,
      };
    }

    // 其他未知错误
    const errorMessage = exception instanceof Error 
      ? exception.message 
      : 'Unknown WebSocket error';

    return {
      code: 5000,
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : errorMessage,
      socketId,
      timestamp,
      requestId,
      ip,
      data: process.env.NODE_ENV === 'development' ? data : undefined,
    };
  }

  /**
   * 记录WebSocket错误日志
   */
  private logWSError(
    exception: unknown,
    client: Socket,
    data: any,
    requestId: string,
    errorResponse: any,
  ): void {
    const logData = {
      requestId,
      code: errorResponse.code,
      message: errorResponse.message,
      socketId: client.id,
      ip: client.handshake.address,
      userAgent: client.handshake.headers['user-agent'],
      userId: (client as any).user?.id,
      timestamp: errorResponse.timestamp,
      data: process.env.NODE_ENV === 'development' ? data : undefined,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    // 根据错误级别选择日志级别
    if (errorResponse.code >= 5000) {
      // 服务错误
      this.logger.error(logData, 'WebSocket service error occurred');
    } else if (errorResponse.code >= 4000) {
      // 客户端错误
      this.logger.warn(logData, 'WebSocket client error occurred');
    } else {
      // 其他错误
      this.logger.error(logData, 'Unexpected WebSocket error occurred');
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
