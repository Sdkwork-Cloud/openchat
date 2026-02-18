import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiTags,
  ApiHeader,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { PagedResponseDto } from '../dto/response.dto';

export interface ApiEndpointOptions {
  summary: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  auth?: boolean;
  headers?: { name: string; description?: string; required?: boolean }[];
}

export interface ApiResponseOptions<T> {
  status: number;
  description: string;
  type?: Type<T> | Function;
  isArray?: boolean;
  isPaged?: boolean;
  example?: any;
}

export interface ApiQueryOptions {
  name: string;
  type?: Type<any> | string;
  description?: string;
  required?: boolean;
  enum?: any[];
  example?: any;
}

export interface ApiParamOptions {
  name: string;
  type?: Type<any> | string;
  description?: string;
  required?: boolean;
  example?: any;
}

export function ApiEndpoint(options: ApiEndpointOptions): MethodDecorator {
  const decorators: (MethodDecorator | PropertyDecorator)[] = [];

  decorators.push(
    ApiOperation({
      summary: options.summary,
      description: options.description,
      operationId: options.operationId,
    }),
  );

  if (options.auth) {
    decorators.push(ApiBearerAuth());
  }

  if (options.headers) {
    options.headers.forEach((header) => {
      decorators.push(
        ApiHeader({
          name: header.name,
          description: header.description,
          required: header.required,
        }),
      );
    });
  }

  return applyDecorators(...decorators);
}

export function ApiSuccessResponseDecorator<T>(
  type?: Type<T>,
  options: { description?: string; isArray?: boolean; isPaged?: boolean } = {},
): MethodDecorator {
  const decorators: (MethodDecorator | PropertyDecorator)[] = [];

  if (options.isPaged && type) {
    decorators.push(
      ApiExtraModels(PagedResponseDto, type),
      ApiOkResponse({
        description: options.description || 'Success',
        schema: {
          allOf: [
            { $ref: getSchemaPath(PagedResponseDto) },
            {
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: getSchemaPath(type) },
                },
              },
            },
          ],
        },
      }),
    );
  } else if (options.isArray && type) {
    decorators.push(
      ApiExtraModels(type),
      ApiOkResponse({
        description: options.description || 'Success',
        schema: {
          type: 'array',
          items: { $ref: getSchemaPath(type) },
        },
      }),
    );
  } else if (type) {
    decorators.push(
      ApiExtraModels(type),
      ApiOkResponse({
        description: options.description || 'Success',
        type,
      }),
    );
  } else {
    decorators.push(
      ApiOkResponse({
        description: options.description || 'Success',
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function ApiCreatedResponseDecorator<T>(
  type?: Type<T>,
  description?: string,
): MethodDecorator {
  if (type) {
    return applyDecorators(
      ApiExtraModels(type),
      ApiCreatedResponse({
        description: description || 'Created successfully',
        type,
      }),
    );
  }

  return applyDecorators(
    ApiCreatedResponse({
      description: description || 'Created successfully',
    }),
  );
}

export interface ApiErrorOptions {
  badRequest?: string | boolean;
  unauthorized?: string | boolean;
  forbidden?: string | boolean;
  notFound?: string | boolean;
  internal?: string | boolean;
}

export function ApiErrorResponses(
  options: ApiErrorOptions = {},
): MethodDecorator {
  const decorators: (MethodDecorator | PropertyDecorator)[] = [];

  if (options.badRequest !== false && options.badRequest !== undefined) {
    decorators.push(
      ApiBadRequestResponse({
        description: typeof options.badRequest === 'string' ? options.badRequest : 'Bad request',
      }),
    );
  }

  if (options.unauthorized !== false && options.unauthorized !== undefined) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: typeof options.unauthorized === 'string' ? options.unauthorized : 'Unauthorized',
      }),
    );
  }

  if (options.forbidden !== false && options.forbidden !== undefined) {
    decorators.push(
      ApiForbiddenResponse({
        description: typeof options.forbidden === 'string' ? options.forbidden : 'Forbidden',
      }),
    );
  }

  if (options.notFound !== false && options.notFound !== undefined) {
    decorators.push(
      ApiNotFoundResponse({
        description: typeof options.notFound === 'string' ? options.notFound : 'Not found',
      }),
    );
  }

  if (options.internal !== false && options.internal !== undefined) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: typeof options.internal === 'string' ? options.internal : 'Internal server error',
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function ApiPaginatedResponse<T>(type: Type<T>): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(PagedResponseDto, type),
    ApiOkResponse({
      description: 'Paginated response',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PagedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(type) },
              },
            },
          },
        ],
      },
    }),
  );
}

export function ApiQueryParams(options: ApiQueryOptions[]): MethodDecorator {
  const decorators = options.map((opt) =>
    ApiQuery({
      name: opt.name,
      type: opt.type || String,
      description: opt.description,
      required: opt.required ?? true,
      enum: opt.enum,
      example: opt.example,
    }),
  );

  return applyDecorators(...decorators);
}

export function ApiPathParams(options: ApiParamOptions[]): MethodDecorator {
  const decorators = options.map((opt) =>
    ApiParam({
      name: opt.name,
      type: opt.type || String,
      description: opt.description,
      required: opt.required ?? true,
      example: opt.example,
    }),
  );

  return applyDecorators(...decorators);
}

export function ApiCrudEndpoint<T>(
  entity: Type<T>,
  options: {
    name: string;
    operations?: ('create' | 'read' | 'update' | 'delete' | 'list')[];
    auth?: boolean;
  } = { name: 'Item' },
): ClassDecorator {
  return function (target: any) {
    ApiTags(options.name)(target);
  };
}

export function ApiFileUpload(
  fieldName: string = 'file',
  required: boolean = true,
): MethodDecorator {
  return applyDecorators(
    ApiBody({
      schema: {
        type: 'object',
        required: required ? [fieldName] : undefined,
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}

export function ApiMultiFileUpload(
  fieldName: string = 'files',
  maxFiles: number = 10,
): MethodDecorator {
  return applyDecorators(
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'array',
            maxItems: maxFiles,
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    }),
  );
}

export const ApiCommonResponses = () =>
  ApiErrorResponses({
    badRequest: '请求参数错误',
    unauthorized: '未授权访问',
    forbidden: '禁止访问',
    notFound: '资源不存在',
    internal: '服务器内部错误',
  });

export function ApiMessageEndpoint(
  options: ApiEndpointOptions & {
    responses?: {
      success?: string;
      badRequest?: string;
      notFound?: string;
    };
  },
): MethodDecorator {
  return applyDecorators(
    ApiEndpoint(options),
    ApiSuccessResponseDecorator(undefined, { description: options.responses?.success || '操作成功' }),
    ApiErrorResponses({
      badRequest: options.responses?.badRequest || '请求参数错误',
      notFound: options.responses?.notFound || '消息不存在',
    }),
  );
}

export function ApiUserEndpoint(
  options: ApiEndpointOptions & {
    responses?: {
      success?: string;
      unauthorized?: string;
      forbidden?: string;
      notFound?: string;
    };
  },
): MethodDecorator {
  return applyDecorators(
    ApiEndpoint({ ...options, auth: true }),
    ApiSuccessResponseDecorator(undefined, { description: options.responses?.success || '操作成功' }),
    ApiErrorResponses({
      unauthorized: options.responses?.unauthorized || '请先登录',
      forbidden: options.responses?.forbidden || '无权限执行此操作',
      notFound: options.responses?.notFound || '用户不存在',
    }),
  );
}

export function ApiGroupEndpoint(
  options: ApiEndpointOptions & {
    responses?: {
      success?: string;
      unauthorized?: string;
      forbidden?: string;
      notFound?: string;
    };
  },
): MethodDecorator {
  return applyDecorators(
    ApiEndpoint({ ...options, auth: true }),
    ApiSuccessResponseDecorator(undefined, { description: options.responses?.success || '操作成功' }),
    ApiErrorResponses({
      unauthorized: options.responses?.unauthorized || '请先登录',
      forbidden: options.responses?.forbidden || '无权限执行此操作',
      notFound: options.responses?.notFound || '群组不存在',
    }),
  );
}
