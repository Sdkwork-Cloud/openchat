/**
 * 响应包装器
 * 
 * 提供统一的 API 响应格式，支持多种响应类型
 * 包含成功响应、错误响应、分页响应等
 * 
 * @framework
 */

import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type as TransformType } from 'class-transformer';

/**
 * 响应元数据
 */
export interface ResponseMeta {
  /** 请求 ID */
  requestId?: string;
  /** 响应时间戳 */
  timestamp?: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** API 版本 */
  version?: string;
  /** 分页信息 */
  pagination?: PaginationMeta;
  /** 额外元数据 */
  [key: string]: any;
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 上一页页码 */
  previousPage?: number;
  /** 下一页页码 */
  nextPage?: number;
}

/**
 * 通用响应接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 状态码 */
  code: number;
  /** 消息 */
  message?: string;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误详情 */
  details?: any;
  /** 元数据 */
  meta?: ResponseMeta;
}

/**
 * 成功响应 DTO
 */
export class SuccessResponseDto<T = any> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '操作成功' })
  message?: string;

  @ApiPropertyOptional({ description: '响应数据' })
  data?: T;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(data: T, options?: { message?: string; meta?: ResponseMeta }) {
    this.success = true;
    this.code = 200;
    this.message = options?.message || '操作成功';
    this.data = data;
    this.meta = options?.meta;
  }

  static success<T>(data: T, options?: { message?: string; meta?: ResponseMeta }): SuccessResponseDto<T> {
    return new SuccessResponseDto(data, options);
  }
}

/**
 * 错误响应 DTO
 */
export class ErrorResponseDto {
  @ApiProperty({ description: '是否成功', example: false })
  success: boolean;

  @ApiProperty({ description: '错误码', example: 4000 })
  code: number;

  @ApiProperty({ description: '错误消息', example: '请求参数错误' })
  message: string;

  @ApiPropertyOptional({ description: '错误详情' })
  details?: any;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(code: number, message: string, options?: { details?: any; meta?: ResponseMeta }) {
    this.success = false;
    this.code = code;
    this.message = message;
    this.details = options?.details;
    this.meta = options?.meta;
  }

  static error(code: number, message: string, options?: { details?: any; meta?: ResponseMeta }): ErrorResponseDto {
    return new ErrorResponseDto(code, message, options);
  }
}

/**
 * 分页响应 DTO
 */
export class PagedResponseDto<T = any> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '查询成功' })
  message?: string;

  @ApiProperty({ description: '数据列表' })
  data: T[];

  @ApiProperty({ description: '分页信息' })
  pagination: PaginationMeta;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(
    data: T[],
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    },
    options?: { message?: string; meta?: ResponseMeta },
  ) {
    this.success = true;
    this.code = 200;
    this.message = options?.message || '查询成功';
    this.data = data;
    
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    this.pagination = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      hasPrevious: pagination.page > 1,
      hasNext: pagination.page < totalPages,
      previousPage: pagination.page > 1 ? pagination.page - 1 : undefined,
      nextPage: pagination.page < totalPages ? pagination.page + 1 : undefined,
    };
    this.meta = options?.meta;
  }

  static page<T>(
    data: T[],
    pagination: { page: number; pageSize: number; total: number },
    options?: { message?: string; meta?: ResponseMeta },
  ): PagedResponseDto<T> {
    return new PagedResponseDto(data, pagination, options);
  }

  /**
   * 从 TypeORM 分页结果创建
   */
  static fromTypeORM<T>(
    result: { entities: T[]; raw: any[] },
    pagination: { page: number; pageSize: number },
    total: number,
    options?: { message?: string; meta?: ResponseMeta },
  ): PagedResponseDto<T> {
    return new PagedResponseDto(
      result.entities,
      {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
      options,
    );
  }

  /**
   * 创建分页响应（别名，用于兼容）
   */
  static create<T>(
    data: T[],
    pagination: { page: number; pageSize: number; total: number },
    options?: { message?: string; meta?: ResponseMeta },
  ): PagedResponseDto<T> {
    return this.page(data, pagination, options);
  }
}

/**
 * 游标分页响应 DTO
 */
export class CursorPagedResponseDto<T = any> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '查询成功' })
  message?: string;

  @ApiProperty({ description: '数据列表' })
  data: T[];

  @ApiProperty({ description: '游标信息' })
  cursor: {
    /** 当前游标 */
    current: string | null;
    /** 下一页游标 */
    next: string | null;
    /** 上一页游标 */
    previous: string | null;
    /** 是否有更多 */
    hasMore: boolean;
  };

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(
    data: T[],
    cursor: {
      current: string | null;
      next: string | null;
      previous: string | null;
      hasMore: boolean;
    },
    options?: { message?: string; meta?: ResponseMeta },
  ) {
    this.success = true;
    this.code = 200;
    this.message = options?.message || '查询成功';
    this.data = data;
    this.cursor = cursor;
    this.meta = options?.meta;
  }

  static cursor<T>(
    data: T[],
    cursor: {
      current: string | null;
      next: string | null;
      previous: string | null;
      hasMore: boolean;
    },
    options?: { message?: string; meta?: ResponseMeta },
  ): CursorPagedResponseDto<T> {
    return new CursorPagedResponseDto(data, cursor, options);
  }

  /**
   * 创建游标分页响应（别名，用于兼容）
   */
  static create<T>(
    data: T[],
    cursor: {
      current: string | null;
      next: string | null;
      previous: string | null;
      hasMore: boolean;
    },
    options?: { message?: string; meta?: ResponseMeta },
  ): CursorPagedResponseDto<T> {
    return this.cursor(data, cursor, options);
  }
}

/**
 * 空响应 DTO
 */
export class EmptyResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '操作成功' })
  message?: string;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(options?: { message?: string; meta?: ResponseMeta }) {
    this.success = true;
    this.code = 204;
    this.message = options?.message || '操作成功';
    this.meta = options?.meta;
  }

  static empty(options?: { message?: string; meta?: ResponseMeta }): EmptyResponseDto {
    return new EmptyResponseDto(options);
  }
}

/**
 * 布尔响应 DTO
 */
export class BooleanResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '操作成功' })
  message?: string;

  @ApiProperty({ description: '结果', example: true })
  result: boolean;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(result: boolean, options?: { message?: string; meta?: ResponseMeta }) {
    this.success = true;
    this.code = 200;
    this.message = options?.message || '操作成功';
    this.result = result;
    this.meta = options?.meta;
  }

  static boolean(result: boolean, options?: { message?: string; meta?: ResponseMeta }): BooleanResponseDto {
    return new BooleanResponseDto(result, options);
  }
}

/**
 * ID 响应 DTO
 */
export class IdResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 201 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '创建成功' })
  message?: string;

  @ApiProperty({ description: '创建的 ID' })
  id: string | number;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(id: string | number, options?: { message?: string; meta?: ResponseMeta }) {
    this.success = true;
    this.code = 201;
    this.message = options?.message || '创建成功';
    this.id = id;
    this.meta = options?.meta;
  }

  static id(id: string | number, options?: { message?: string; meta?: ResponseMeta }): IdResponseDto {
    return new IdResponseDto(id, options);
  }
}

/**
 * 批量操作响应
 */
export class BatchResponseDto<T = any> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '批量操作完成' })
  message?: string;

  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failureCount: number;

  @ApiProperty({ description: '总数量' })
  totalCount: number;

  @ApiProperty({ description: '结果列表' })
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: string;
  }>;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(
    results: Array<{
      index: number;
      success: boolean;
      data?: T;
      error?: string;
    }>,
    options?: { message?: string; meta?: ResponseMeta },
  ) {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    this.success = failureCount === 0;
    this.code = failureCount === 0 ? 200 : 207;
    this.message = options?.message || (failureCount === 0 ? '批量操作成功' : '部分操作失败');
    this.successCount = successCount;
    this.failureCount = failureCount;
    this.totalCount = results.length;
    this.results = results;
    this.meta = options?.meta;
  }

  static batch<T>(
    results: Array<{
      index: number;
      success: boolean;
      data?: T;
      error?: string;
    }>,
    options?: { message?: string; meta?: ResponseMeta },
  ): BatchResponseDto<T> {
    return new BatchResponseDto(results, options);
  }
}

/**
 * 任务响应 DTO
 */
export class TaskResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 202 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '任务已提交' })
  message?: string;

  @ApiProperty({ description: '任务 ID' })
  taskId: string;

  @ApiPropertyOptional({ description: '任务状态', example: 'pending' })
  status?: string;

  @ApiPropertyOptional({ description: '预计完成时间（秒）' })
  estimatedTime?: number;

  @ApiPropertyOptional({ description: '查询 URL' })
  queryUrl?: string;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(
    taskId: string,
    options?: {
      message?: string;
      status?: string;
      estimatedTime?: number;
      queryUrl?: string;
      meta?: ResponseMeta;
    },
  ) {
    this.success = true;
    this.code = 202;
    this.message = options?.message || '任务已提交';
    this.taskId = taskId;
    this.status = options?.status || 'pending';
    this.estimatedTime = options?.estimatedTime;
    this.queryUrl = options?.queryUrl;
    this.meta = options?.meta;
  }

  static task(
    taskId: string,
    options?: {
      message?: string;
      status?: string;
      estimatedTime?: number;
      queryUrl?: string;
      meta?: ResponseMeta;
    },
  ): TaskResponseDto {
    return new TaskResponseDto(taskId, options);
  }
}

/**
 * 导出响应 DTO
 */
export class ExportResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '导出成功' })
  message?: string;

  @ApiProperty({ description: '文件 URL' })
  fileUrl: string;

  @ApiPropertyOptional({ description: '文件名' })
  filename?: string;

  @ApiPropertyOptional({ description: '文件大小（字节）' })
  fileSize?: number;

  @ApiPropertyOptional({ description: '过期时间' })
  expiresAt?: string;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(
    fileUrl: string,
    options?: {
      message?: string;
      filename?: string;
      fileSize?: number;
      expiresAt?: string;
      meta?: ResponseMeta;
    },
  ) {
    this.success = true;
    this.code = 200;
    this.message = options?.message || '导出成功';
    this.fileUrl = fileUrl;
    this.filename = options?.filename;
    this.fileSize = options?.fileSize;
    this.expiresAt = options?.expiresAt;
    this.meta = options?.meta;
  }

  static export(
    fileUrl: string,
    options?: {
      message?: string;
      filename?: string;
      fileSize?: number;
      expiresAt?: string;
      meta?: ResponseMeta;
    },
  ): ExportResponseDto {
    return new ExportResponseDto(fileUrl, options);
  }
}

/**
 * 导入响应 DTO
 */
export class ImportResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiPropertyOptional({ description: '消息', example: '导入成功' })
  message?: string;

  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failureCount: number;

  @ApiProperty({ description: '跳过数量' })
  skipCount: number;

  @ApiProperty({ description: '总数量' })
  totalCount: number;

  @ApiPropertyOptional({ description: '错误详情' })
  errors?: Array<{
    row: number;
    error: string;
    data?: any;
  }>;

  @ApiPropertyOptional({ description: '元数据' })
  meta?: ResponseMeta;

  constructor(
    stats: {
      successCount: number;
      failureCount: number;
      skipCount: number;
      totalCount: number;
    },
    options?: {
      message?: string;
      errors?: Array<{ row: number; error: string; data?: any }>;
      meta?: ResponseMeta;
    },
  ) {
    this.success = stats.failureCount === 0;
    this.code = stats.failureCount === 0 ? 200 : 207;
    this.message = options?.message || (stats.failureCount === 0 ? '导入成功' : '部分导入失败');
    this.successCount = stats.successCount;
    this.failureCount = stats.failureCount;
    this.skipCount = stats.skipCount;
    this.totalCount = stats.totalCount;
    this.errors = options?.errors;
    this.meta = options?.meta;
  }

  static import(
    stats: {
      successCount: number;
      failureCount: number;
      skipCount: number;
      totalCount: number;
    },
    options?: {
      message?: string;
      errors?: Array<{ row: number; error: string; data?: any }>;
      meta?: ResponseMeta;
    },
  ): ImportResponseDto {
    return new ImportResponseDto(stats, options);
  }
}

/**
 * 健康检查响应 DTO
 */
export class HealthResponseDto {
  @ApiProperty({ description: '是否健康', example: true })
  healthy: boolean;

  @ApiProperty({ description: '状态', example: 'ok' })
  status?: string;

  @ApiProperty({ description: '时间戳' })
  timestamp: string;

  @ApiPropertyOptional({ description: '服务信息' })
  services?: Record<string, {
    status?: string;
    latency?: number;
    message?: string;
  }>;

  @ApiPropertyOptional({ description: '系统信息' })
  system?: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percent: number;
    };
    cpu: {
      cores: number;
      load: number;
    };
  };

  constructor(
    healthy: boolean,
    options?: {
      status?: string;
      services?: Record<string, { status?: string; latency?: number; message?: string }>;
      system?: {
        uptime: number;
        memory: { used: number; total: number; percent: number };
        cpu: { cores: number; load: number };
      };
    },
  ) {
    this.healthy = healthy;
    this.status = options?.status || (healthy ? 'ok' : 'error');
    this.timestamp = new Date().toISOString();
    this.services = options?.services;
    this.system = options?.system;
  }

  static health(
    healthy: boolean,
    options?: {
      status?: string;
      services?: Record<string, { status?: string; latency?: number; message?: string }>;
      system?: {
        uptime: number;
        memory: { used: number; total: number; percent: number };
        cpu: { cores: number; load: number };
      };
    },
  ): HealthResponseDto {
    return new HealthResponseDto(healthy, options);
  }
}

/**
 * 构建响应元数据
 */
export function buildResponseMeta(options?: {
  requestId?: string;
  duration?: number;
  version?: string;
  pagination?: PaginationMeta;
  extra?: Record<string, any>;
}): ResponseMeta {
  const meta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    ...options,
  };

  if (options?.pagination) {
    meta.pagination = options.pagination;
  }

  if (options?.extra) {
    Object.assign(meta, options.extra);
  }

  return meta;
}

/**
 * Swagger 响应装饰器工厂
 */
export function ApiResponseDecorator<T>(
  type: Type<T> | 'array' | 'paged' | 'empty' | 'boolean' | 'id' | 'task',
  options?: {
    description?: string;
    statusCode?: number;
    isArray?: boolean;
  },
) {
  const statusCode = options?.statusCode || 200;
  const description = options?.description || '成功响应';

  if (type === 'empty') {
    return applyDecorators(
      ApiExtraModels(EmptyResponseDto),
      ApiOkResponse({
        status: statusCode as any,
        description,
        schema: { $ref: getSchemaPath(EmptyResponseDto) },
      } as any),
    );
  }

  if (type === 'boolean') {
    return applyDecorators(
      ApiExtraModels(BooleanResponseDto),
      ApiOkResponse({
        status: statusCode as any,
        description,
        schema: { $ref: getSchemaPath(BooleanResponseDto) },
      } as any),
    );
  }

  if (type === 'id') {
    return applyDecorators(
      ApiExtraModels(IdResponseDto),
      ApiOkResponse({
        status: statusCode as any,
        description,
        schema: { $ref: getSchemaPath(IdResponseDto) },
      } as any),
    );
  }

  if (type === 'task') {
    return applyDecorators(
      ApiExtraModels(TaskResponseDto),
      ApiOkResponse({
        status: 202 as any,
        description: '任务已提交',
        schema: { $ref: getSchemaPath(TaskResponseDto) },
      } as any),
    );
  }

  if (type === 'paged') {
    return applyDecorators(
      ApiExtraModels(PagedResponseDto),
      ApiOkResponse({
        status: statusCode as any,
        description,
        schema: { $ref: getSchemaPath(PagedResponseDto) },
      } as any),
    );
  }

  if (options?.isArray || type === 'array') {
    return applyDecorators(
      ApiExtraModels(SuccessResponseDto),
      ApiOkResponse({
        status: statusCode as any,
        description,
        schema: {
          allOf: [
            { $ref: getSchemaPath(SuccessResponseDto) },
            {
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: getSchemaPath(type as Type<T>) },
                },
              },
            },
          ],
        },
      } as any),
    );
  }

  return applyDecorators(
    ApiExtraModels(SuccessResponseDto),
    ApiOkResponse({
      status: statusCode as any,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(type as Type<T>) },
            },
          },
        ],
      },
    } as any),
  );
}

/**
 * API 响应 DTO 别名（用于兼容）
 */
export type ApiResponseDto<T = any> = ApiResponse<T>;

/**
 * 游标响应 DTO 别名（用于兼容）
 */
export type CursorResponseDto<T = any> = ApiResponse<T>;
