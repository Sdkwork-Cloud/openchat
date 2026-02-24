/**
 * 日志和审计装饰器
 * 提供声明式的日志记录和审计功能
 *
 * @framework
 */

import { SetMetadata, applyDecorators, CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * 操作类型枚举
 */
export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  EXPORT = 'export',
  IMPORT = 'import',
  LOGIN = 'login',
  LOGOUT = 'logout',
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  CUSTOM = 'custom',
}

/**
 * 审计级别枚举
 */
export enum AuditLevel {
  /** 不记录 */
  NONE = 'none',
  /** 只记录成功 */
  SUCCESS = 'success',
  /** 只记录失败 */
  FAILURE = 'failure',
  /** 全部记录 */
  ALL = 'all',
}

/**
 * 审计选项
 */
export interface AuditOptions {
  /** 操作类型 */
  operation?: OperationType | string;
  /** 操作描述 */
  description?: string;
  /** 审计级别 */
  level?: AuditLevel;
  /** 资源类型 */
  resourceType?: string;
  /** 资源 ID 提取器 */
  resourceIdExtractor?: (context: ExecutionContext) => string | undefined;
  /** 额外数据提取器 */
  extraDataExtractor?: (context: ExecutionContext, result?: any) => Record<string, any>;
  /** 是否记录请求体 */
  logRequestBody?: boolean;
  /** 是否记录响应体 */
  logResponseBody?: boolean;
  /** 敏感字段列表（会脱敏） */
  sensitiveFields?: string[];
  /** 操作模块 */
  module?: string;
  /** 操作子模块 */
  submodule?: string;
}

/**
 * 审计元数据
 */
export const AUDIT_OPTIONS_METADATA = 'audit:options';

/**
 * 审计装饰器
 *
 * @example
 * // 基本用法
 * @Audit({ operation: OperationType.CREATE, description: '创建用户' })
 * @Post()
 * async create(@Body() data: CreateUserDto) {
 *   return this.userService.create(data);
 * }
 *
 * @example
 * // 带资源类型
 * @Audit({ operation: OperationType.UPDATE, resourceType: 'User', description: '更新用户信息' })
 * @Put(':id')
 * async update(@Param('id') id: string, @Body() data: UpdateUserDto) {
 *   return this.userService.update(id, data);
 * }
 *
 * @example
 * // 带敏感字段脱敏
 * @Audit({ operation: OperationType.LOGIN, sensitiveFields: ['password', 'token'] })
 * @Post('login')
 * async login(@Body() credentials: LoginDto) {
 *   return this.authService.login(credentials);
 * }
 */
export function Audit(options: AuditOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(AUDIT_OPTIONS_METADATA, options),
  );
}

/**
 * 创建操作审计
 */
export function AuditCreate(description?: string): MethodDecorator {
  return Audit({
    operation: OperationType.CREATE,
    description: description || '创建资源',
  });
}

/**
 * 更新操作审计
 */
export function AuditUpdate(description?: string): MethodDecorator {
  return Audit({
    operation: OperationType.UPDATE,
    description: description || '更新资源',
  });
}

/**
 * 删除操作审计
 */
export function AuditDelete(description?: string): MethodDecorator {
  return Audit({
    operation: OperationType.DELETE,
    description: description || '删除资源',
  });
}

/**
 * 查询操作审计
 */
export function AuditRead(description?: string): MethodDecorator {
  return Audit({
    operation: OperationType.READ,
    description: description || '查询资源',
  });
}

/**
 * 审计拦截器
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = Reflect.getMetadata(
      AUDIT_OPTIONS_METADATA,
      context.getHandler(),
    ) as AuditOptions | undefined;

    if (!auditOptions || auditOptions.level === AuditLevel.NONE) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 提取审计信息
    const auditData = this.extractAuditData(context, auditOptions, request);

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - startTime;

        // 记录成功日志
        if (auditOptions.level !== AuditLevel.FAILURE) {
          this.logAudit(auditData, duration, true, result);
        }

        // 执行额外数据提取
        if (auditOptions.extraDataExtractor) {
          const extraData = auditOptions.extraDataExtractor(context, result);
          if (extraData) {
            auditData.extra = { ...auditData.extra, ...extraData };
          }
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // 记录失败日志
        if (auditOptions.level !== AuditLevel.SUCCESS) {
          this.logAudit(auditData, duration, false, null, error);
        }

        throw error;
      }),
    );
  }

  /**
   * 提取审计数据
   */
  private extractAuditData(
    context: ExecutionContext,
    options: AuditOptions,
    request: Request,
  ): AuditData {
    const user = (request as any).user;

    return {
      timestamp: new Date().toISOString(),
      operation: options.operation || OperationType.CUSTOM,
      description: options.description || '',
      resourceType: options.resourceType,
      resourceId: options.resourceIdExtractor?.(context),
      userId: user?.userId,
      username: user?.username,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      path: request.path,
      module: options.module,
      submodule: options.submodule,
      extra: {},
    };
  }

  /**
   * 记录审计日志
   */
  private logAudit(
    data: AuditData,
    duration: number,
    success: boolean,
    result?: any,
    error?: any,
  ): void {
    const logData = {
      ...data,
      success,
      duration,
      statusCode: success ? 200 : 500,
      error: error?.message,
    };

    if (success) {
      this.logger.log(`Audit: ${data.operation} - ${data.description}`, JSON.stringify(logData));
    } else {
      this.logger.error(`Audit: ${data.operation} - ${data.description}`, JSON.stringify(logData));
    }
  }
}

/**
 * 审计数据接口
 */
export interface AuditData {
  /** 时间戳 */
  timestamp: string;
  /** 操作类型 */
  operation: OperationType | string;
  /** 操作描述 */
  description: string;
  /** 资源类型 */
  resourceType?: string;
  /** 资源 ID */
  resourceId?: string;
  /** 用户 ID */
  userId?: string;
  /** 用户名 */
  username?: string;
  /** IP 地址 */
  ip?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 请求方法 */
  method?: string;
  /** 请求路径 */
  path?: string;
  /** 模块 */
  module?: string;
  /** 子模块 */
  submodule?: string;
  /** 额外数据 */
  extra?: Record<string, any>;
}

/**
 * 性能监控装饰器
 *
 * @example
 * @PerformanceMonitor()
 * @Get('slow-operation')
 * async slowOperation() {
 *   return this.service.slowOperation();
 * }
 */
export function PerformanceMonitor(options: { warnThreshold?: number; errorThreshold?: number } = {}): MethodDecorator {
  return SetMetadata('performance:options', {
    warnThreshold: options.warnThreshold || 1000,
    errorThreshold: options.errorThreshold || 5000,
  });
}

/**
 * 请求日志装饰器
 *
 * @example
 * @RequestLog({ skipBody: false, skipResponse: false })
 * @Post('data')
 * async postData(@Body() data: DataDto) {
 *   return this.service.process(data);
 * }
 */
export function RequestLog(options: { skipBody?: boolean; skipResponse?: boolean } = {}): MethodDecorator {
  return SetMetadata('request-log:options', options);
}
