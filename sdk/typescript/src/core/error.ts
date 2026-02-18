/**
 * SDK统一错误类型
 */

export class SDKError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: any;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string = 'SDK_ERROR',
    status?: number,
    details?: any
  ) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = Date.now();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SDKError);
    }
  }

  static fromError(error: Error, code: string = 'SDK_ERROR'): SDKError {
    return new SDKError(
      error.message,
      code,
      undefined,
      error
    );
  }

  static networkError(message: string = 'Network error'): SDKError {
    return new SDKError(message, 'NETWORK_ERROR');
  }

  static timeout(message: string = 'Request timeout'): SDKError {
    return new SDKError(message, 'TIMEOUT', 408);
  }

  static unauthorized(message: string = 'Unauthorized'): SDKError {
    return new SDKError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message: string = 'Forbidden'): SDKError {
    return new SDKError(message, 'FORBIDDEN', 403);
  }

  static notFound(message: string = 'Resource not found'): SDKError {
    return new SDKError(message, 'NOT_FOUND', 404);
  }

  static validationError(message: string = 'Validation failed', details?: any): SDKError {
    return new SDKError(message, 'VALIDATION_ERROR', 400, details);
  }

  static rateLimitExceeded(message: string = 'Rate limit exceeded'): SDKError {
    return new SDKError(message, 'RATE_LIMIT_EXCEEDED', 429);
  }

  static serverError(message: string = 'Internal server error'): SDKError {
    return new SDKError(message, 'SERVER_ERROR', 500);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

export const SDKErrorCode = {
  SUCCESS: 'SUCCESS',
  SDK_ERROR: 'SDK_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCodeType = typeof SDKErrorCode[keyof typeof SDKErrorCode];

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };

export function success<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function failure<T>(error: ErrorResponse): { success: false; error: ErrorResponse } {
  return { success: false, error };
}

export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

export function isFailure<T>(result: Result<T>): result is { success: false; error: ErrorResponse } {
  return result.success === false;
}
