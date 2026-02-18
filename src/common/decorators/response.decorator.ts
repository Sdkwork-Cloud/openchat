import { SetMetadata } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export const SKIP_TRANSFORM_KEY = 'skipTransform';
export const RESPONSE_MESSAGE_KEY = 'responseMessage';

export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);

export const ResponseMessage = (message: string) => 
  SetMetadata(RESPONSE_MESSAGE_KEY, message);

export function ApiSuccessResponse(
  description: string = 'Success',
  options?: { type?: any; isArray?: boolean },
) {
  return ApiResponse({
    status: 200,
    description,
    schema: {
      allOf: [
        { $ref: '#/components/schemas/ApiResponseDto' },
        {
          properties: {
            code: { type: 'number', example: 0 },
            message: { type: 'string', example: 'success' },
            data: options?.type
              ? options.isArray
                ? { type: 'array', items: { $ref: `#/components/schemas/${options.type.name}` } }
                : { $ref: `#/components/schemas/${options.type.name}` }
              : { type: 'object' },
            timestamp: { type: 'number', example: Date.now() },
          },
        },
      ],
    },
  });
}

export function ApiPagedResponse(
  description: string = 'Success',
  itemType?: any,
) {
  return ApiResponse({
    status: 200,
    description,
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PagedResponseDto' },
        {
          properties: {
            code: { type: 'number', example: 0 },
            message: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                list: {
                  type: 'array',
                  items: itemType ? { $ref: `#/components/schemas/${itemType.name}` } : {},
                },
                total: { type: 'number', example: 100 },
                page: { type: 'number', example: 1 },
                pageSize: { type: 'number', example: 20 },
                hasMore: { type: 'boolean', example: true },
              },
            },
            timestamp: { type: 'number', example: Date.now() },
          },
        },
      ],
    },
  });
}

export function ApiErrorResponse(
  status: number,
  description: string,
  errorCode?: number,
) {
  return ApiResponse({
    status,
    description,
    schema: {
      properties: {
        code: { type: 'number', example: errorCode || status },
        message: { type: 'string', example: description },
        timestamp: { type: 'number', example: Date.now() },
        requestId: { type: 'string', example: '1234567890-abc123def' },
      },
    },
  });
}

export function ApiBadRequestResponse(description: string = 'Bad Request') {
  return ApiErrorResponse(400, description, 1001);
}

export function ApiUnauthorizedResponse(description: string = 'Unauthorized') {
  return ApiErrorResponse(401, description, 1002);
}

export function ApiForbiddenResponse(description: string = 'Forbidden') {
  return ApiErrorResponse(403, description, 1003);
}

export function ApiNotFoundResponse(description: string = 'Not Found') {
  return ApiErrorResponse(404, description, 1004);
}
