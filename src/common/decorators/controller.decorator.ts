import {
  applyDecorators,
  SetMetadata,
  UseInterceptors,
  UseGuards,
  Type,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { ApiResponseDto } from '../dto/response.dto';

export interface ControllerConfig {
  name: string;
  auth?: boolean;
  version?: string;
  prefix?: string;
}

export interface ActionConfig {
  summary: string;
  description?: string;
  auth?: boolean;
  roles?: string[];
  permissions?: string[];
  audit?: {
    action: string;
    entityType: string;
  };
  rateLimit?: {
    limit: number;
    window: number;
  };
  idempotent?: boolean;
}

export interface ResponseConfig<T> {
  type?: Type<T>;
  isArray?: boolean;
  isPaged?: boolean;
  description?: string;
}

export const CONTROLLER_CONFIG_KEY = 'controller_config';
export const ACTION_CONFIG_KEY = 'action_config';

export function ApiController(config: ControllerConfig): ClassDecorator {
  const decorators: ClassDecorator[] = [];

  let prefix = config.prefix || config.name.toLowerCase();
  if (config.version) {
    prefix = `v${config.version}/${prefix}`;
  }

  decorators.push(ApiTags(config.name));

  if (config.auth !== false) {
    decorators.push(ApiBearerAuth());
  }

  decorators.push(SetMetadata(CONTROLLER_CONFIG_KEY, config));

  return applyDecorators(...decorators) as ClassDecorator;
}

export function Action(config: ActionConfig): MethodDecorator {
  return SetMetadata(ACTION_CONFIG_KEY, config);
}

export function SuccessResponse<T>(
  config?: ResponseConfig<T>,
): MethodDecorator {
  const decorators: (MethodDecorator | PropertyDecorator)[] = [];

  if (config?.type) {
    if (config.isPaged) {
      decorators.push(
        ApiResponse({
          status: 200,
          description: config.description || 'Success',
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ApiResponseDto' },
              {
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      list: {
                        type: 'array',
                        items: { $ref: `#/components/schemas/${config.type.name}` },
                      },
                      total: { type: 'number' },
                      page: { type: 'number' },
                      pageSize: { type: 'number' },
                    },
                  },
                },
              },
            ],
          },
        }),
      );
    } else if (config.isArray) {
      decorators.push(
        ApiResponse({
          status: 200,
          description: config.description || 'Success',
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ApiResponseDto' },
              {
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${config.type.name}` },
                  },
                },
              },
            ],
          },
        }),
      );
    } else {
      decorators.push(
        ApiResponse({
          status: 200,
          description: config.description || 'Success',
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ApiResponseDto' },
              {
                properties: {
                  data: { $ref: `#/components/schemas/${config.type.name}` },
                },
              },
            ],
          },
        }),
      );
    }
  } else {
    decorators.push(
      ApiResponse({
        status: 200,
        description: config?.description || 'Success',
        schema: { $ref: '#/components/schemas/ApiResponseDto' },
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function ErrorResponse(
  status: number,
  description: string,
): MethodDecorator {
  return ApiResponse({
    status,
    description,
    schema: {
      properties: {
        code: { type: 'number', example: status },
        message: { type: 'string', example: description },
        timestamp: { type: 'number' },
      },
    },
  });
}

export function ParamId(name: string = 'id', description?: string): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name,
      description: description || `${name}参数`,
      type: String,
    }),
  );
}

export function QueryParam(
  name: string,
  options?: {
    description?: string;
    required?: boolean;
    type?: any;
    enum?: any[];
  },
): MethodDecorator {
  return ApiQuery({
    name,
    description: options?.description,
    required: options?.required ?? true,
    type: options?.type || String,
    enum: options?.enum,
  });
}

export function CrudActions(entityName: string) {
  return {
    create: (summary?: string) =>
      Action({
        summary: summary || `创建${entityName}`,
        audit: { action: 'CREATE', entityType: entityName },
      }),

    update: (summary?: string) =>
      Action({
        summary: summary || `更新${entityName}`,
        audit: { action: 'UPDATE', entityType: entityName },
      }),

    delete: (summary?: string) =>
      Action({
        summary: summary || `删除${entityName}`,
        audit: { action: 'DELETE', entityType: entityName },
      }),

    findOne: (summary?: string) =>
      Action({
        summary: summary || `获取${entityName}详情`,
      }),

    findAll: (summary?: string) =>
      Action({
        summary: summary || `获取${entityName}列表`,
      }),
  };
}

export function RestController<T>(config: ControllerConfig): ClassDecorator {
  return applyDecorators(
    ApiController(config),
    UseInterceptors(TransformInterceptor),
  );
}

export function success<T>(data: T, message?: string): ApiResponseDto<T> {
  return {
    success: true,
    code: 0,
    message: message || 'success',
    data,
    timestamp: Date.now(),
  } as ApiResponseDto<T>;
}

export function successList<T>(
  list: T[],
  total: number,
  page: number = 1,
  pageSize: number = 20,
): ApiResponseDto<{ list: T[]; total: number; page: number; pageSize: number }> {
  return success({
    list,
    total,
    page,
    pageSize,
  });
}

export function successPaginated<T>(
  list: T[],
  total: number,
  page: number = 1,
  pageSize: number = 20,
): ApiResponseDto<{
  list: T[];
  pagination: { total: number; page: number; pageSize: number; hasMore: boolean };
}> {
  return success({
    list,
    pagination: {
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    },
  });
}

export function created<T>(
  data: T,
  message?: string,
): ApiResponseDto<T> {
  return {
    success: true,
    code: 0,
    message: message || 'Created successfully',
    data,
    timestamp: Date.now(),
  } as ApiResponseDto<T>;
}

export function noContent(message?: string): ApiResponseDto<null> {
  return {
    success: true,
    code: 0,
    message: message || 'No content',
    data: null,
    timestamp: Date.now(),
  } as ApiResponseDto<null>;
}

export function accepted<T>(
  data: T,
  message?: string,
): ApiResponseDto<T> {
  return {
    success: true,
    code: 0,
    message: message || 'Request accepted',
    data,
    timestamp: Date.now(),
  } as ApiResponseDto<T>;
}
