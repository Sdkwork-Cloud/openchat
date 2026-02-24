import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常类型枚举
 */
export enum BusinessErrorCode {
  // 通用错误 (1000-1099)
  UNKNOWN_ERROR = 1000,
  INVALID_PARAMETER = 1001,
  RESOURCE_NOT_FOUND = 1002,
  PERMISSION_DENIED = 1003,
  OPERATION_FAILED = 1004,
  RESOURCE_EXISTS = 1005,
  RATE_LIMIT_EXCEEDED = 1006,
  SERVICE_UNAVAILABLE = 1007,
  UNAUTHORIZED = 1008,

  // 用户相关错误 (2000-2099)
  USER_NOT_FOUND = 2000,
  USER_ALREADY_EXISTS = 2001,
  INVALID_CREDENTIALS = 2002,
  USER_BLOCKED = 2003,
  USER_INACTIVE = 2004,
  INVALID_TOKEN = 2005,
  TOKEN_EXPIRED = 2006,

  // 消息相关错误 (3000-3099)
  MESSAGE_SEND_FAILED = 3000,
  MESSAGE_NOT_FOUND = 3001,
  MESSAGE_TOO_LARGE = 3002,
  MESSAGE_RATE_LIMIT = 3003,
  INVALID_MESSAGE_TYPE = 3004,
  MESSAGE_DUPLICATE = 3005,

  // 好友相关错误 (4000-4099)
  FRIEND_NOT_FOUND = 4000,
  ALREADY_FRIENDS = 4001,
  FRIEND_REQUEST_PENDING = 4002,
  FRIEND_REQUEST_REJECTED = 4003,
  CANNOT_ADD_SELF = 4004,

  // 群组相关错误 (5000-5099)
  GROUP_NOT_FOUND = 5000,
  GROUP_ALREADY_EXISTS = 5001,
  NOT_GROUP_MEMBER = 5002,
  NOT_GROUP_ADMIN = 5003,
  GROUP_FULL = 5004,
  ALREADY_IN_GROUP = 5005,
  RESOURCE_CONFLICT = 5006,

  // IM 服务错误 (6000-6099)
  IM_SERVICE_ERROR = 6000,
  IM_CONNECTION_FAILED = 6001,
  IM_SEND_FAILED = 6002,

  // RTC 服务错误 (7000-7099)
  RTC_SERVICE_ERROR = 7000,
  RTC_CHANNEL_CREATION_FAILED = 7001,
  RTC_NOT_IN_CALL = 7002,

  // AI Bot 错误 (8000-8099)
  AI_SERVICE_ERROR = 8000,
  AI_RESPONSE_TIMEOUT = 8001,
  AI_RATE_LIMIT = 8002,

  // 配置错误
  INVALID_CONFIGURATION = 9000,

  // 文件错误
  FILE_TOO_LARGE = 9001,
  INVALID_FILE_TYPE = 9002,

  // 验证错误
  VALIDATION_ERROR = 9003,
  INVALID_FORMAT = 9004,
  INVALID_JSON = 9005,
}

/**
 * 业务错误消息映射
 */
export const BusinessErrorMessages: Record<BusinessErrorCode, string> = {
  [BusinessErrorCode.UNKNOWN_ERROR]: '未知错误',
  [BusinessErrorCode.INVALID_PARAMETER]: '参数无效',
  [BusinessErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [BusinessErrorCode.PERMISSION_DENIED]: '权限不足',
  [BusinessErrorCode.OPERATION_FAILED]: '操作失败',
  [BusinessErrorCode.RESOURCE_EXISTS]: '资源已存在',
  [BusinessErrorCode.RATE_LIMIT_EXCEEDED]: '请求过于频繁',
  [BusinessErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用',
  [BusinessErrorCode.UNAUTHORIZED]: '未授权',

  [BusinessErrorCode.USER_NOT_FOUND]: '用户不存在',
  [BusinessErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [BusinessErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [BusinessErrorCode.USER_BLOCKED]: '用户已被封禁',
  [BusinessErrorCode.USER_INACTIVE]: '用户未激活',
  [BusinessErrorCode.INVALID_TOKEN]: '无效的令牌',
  [BusinessErrorCode.TOKEN_EXPIRED]: '令牌已过期',

  [BusinessErrorCode.MESSAGE_SEND_FAILED]: '消息发送失败',
  [BusinessErrorCode.MESSAGE_NOT_FOUND]: '消息不存在',
  [BusinessErrorCode.MESSAGE_TOO_LARGE]: '消息内容过大',
  [BusinessErrorCode.MESSAGE_RATE_LIMIT]: '消息发送过于频繁',
  [BusinessErrorCode.INVALID_MESSAGE_TYPE]: '无效的消息类型',
  [BusinessErrorCode.MESSAGE_DUPLICATE]: '重复消息',

  [BusinessErrorCode.FRIEND_NOT_FOUND]: '好友不存在',
  [BusinessErrorCode.ALREADY_FRIENDS]: '已经是好友',
  [BusinessErrorCode.FRIEND_REQUEST_PENDING]: '好友请求待处理',
  [BusinessErrorCode.FRIEND_REQUEST_REJECTED]: '好友请求已被拒绝',
  [BusinessErrorCode.CANNOT_ADD_SELF]: '不能添加自己为好友',

  [BusinessErrorCode.GROUP_NOT_FOUND]: '群组不存在',
  [BusinessErrorCode.GROUP_ALREADY_EXISTS]: '群组已存在',
  [BusinessErrorCode.NOT_GROUP_MEMBER]: '不是群组成员',
  [BusinessErrorCode.NOT_GROUP_ADMIN]: '不是群组管理员',
  [BusinessErrorCode.GROUP_FULL]: '群组已满',
  [BusinessErrorCode.ALREADY_IN_GROUP]: '已经在群组中',
  [BusinessErrorCode.RESOURCE_CONFLICT]: '资源冲突',

  [BusinessErrorCode.IM_SERVICE_ERROR]: '即时通讯服务错误',
  [BusinessErrorCode.IM_CONNECTION_FAILED]: '即时通讯连接失败',
  [BusinessErrorCode.IM_SEND_FAILED]: '消息发送失败',

  [BusinessErrorCode.RTC_SERVICE_ERROR]: '实时音视频服务错误',
  [BusinessErrorCode.RTC_CHANNEL_CREATION_FAILED]: '音视频频道创建失败',
  [BusinessErrorCode.RTC_NOT_IN_CALL]: '不在通话中',

  [BusinessErrorCode.AI_SERVICE_ERROR]: 'AI 服务错误',
  [BusinessErrorCode.AI_RESPONSE_TIMEOUT]: 'AI 响应超时',
  [BusinessErrorCode.AI_RATE_LIMIT]: 'AI 请求过于频繁',

  [BusinessErrorCode.INVALID_CONFIGURATION]: '配置无效',
  [BusinessErrorCode.FILE_TOO_LARGE]: '文件过大',
  [BusinessErrorCode.INVALID_FILE_TYPE]: '文件类型无效',
  [BusinessErrorCode.VALIDATION_ERROR]: '验证失败',
  [BusinessErrorCode.INVALID_FORMAT]: '格式无效',
  [BusinessErrorCode.INVALID_JSON]: 'JSON 格式无效',
};

/**
 * HTTP 状态码映射
 */
export const ErrorCodeToHttpStatus: Record<BusinessErrorCode, HttpStatus> = {
  [BusinessErrorCode.UNKNOWN_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [BusinessErrorCode.INVALID_PARAMETER]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.RESOURCE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.PERMISSION_DENIED]: HttpStatus.FORBIDDEN,
  [BusinessErrorCode.OPERATION_FAILED]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.RESOURCE_EXISTS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.RATE_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
  [BusinessErrorCode.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [BusinessErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,

  [BusinessErrorCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.USER_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [BusinessErrorCode.USER_BLOCKED]: HttpStatus.FORBIDDEN,
  [BusinessErrorCode.USER_INACTIVE]: HttpStatus.FORBIDDEN,
  [BusinessErrorCode.INVALID_TOKEN]: HttpStatus.UNAUTHORIZED,
  [BusinessErrorCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,

  [BusinessErrorCode.MESSAGE_SEND_FAILED]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.MESSAGE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.MESSAGE_TOO_LARGE]: HttpStatus.PAYLOAD_TOO_LARGE,
  [BusinessErrorCode.MESSAGE_RATE_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,
  [BusinessErrorCode.INVALID_MESSAGE_TYPE]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.MESSAGE_DUPLICATE]: HttpStatus.CONFLICT,

  [BusinessErrorCode.FRIEND_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.ALREADY_FRIENDS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.FRIEND_REQUEST_PENDING]: HttpStatus.CONFLICT,
  [BusinessErrorCode.FRIEND_REQUEST_REJECTED]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.CANNOT_ADD_SELF]: HttpStatus.BAD_REQUEST,

  [BusinessErrorCode.GROUP_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.GROUP_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.NOT_GROUP_MEMBER]: HttpStatus.FORBIDDEN,
  [BusinessErrorCode.NOT_GROUP_ADMIN]: HttpStatus.FORBIDDEN,
  [BusinessErrorCode.GROUP_FULL]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.ALREADY_IN_GROUP]: HttpStatus.CONFLICT,
  [BusinessErrorCode.RESOURCE_CONFLICT]: HttpStatus.CONFLICT,

  [BusinessErrorCode.IM_SERVICE_ERROR]: HttpStatus.BAD_GATEWAY,
  [BusinessErrorCode.IM_CONNECTION_FAILED]: HttpStatus.BAD_GATEWAY,
  [BusinessErrorCode.IM_SEND_FAILED]: HttpStatus.BAD_GATEWAY,

  [BusinessErrorCode.RTC_SERVICE_ERROR]: HttpStatus.BAD_GATEWAY,
  [BusinessErrorCode.RTC_CHANNEL_CREATION_FAILED]: HttpStatus.BAD_GATEWAY,
  [BusinessErrorCode.RTC_NOT_IN_CALL]: HttpStatus.BAD_REQUEST,

  [BusinessErrorCode.AI_SERVICE_ERROR]: HttpStatus.BAD_GATEWAY,
  [BusinessErrorCode.AI_RESPONSE_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [BusinessErrorCode.AI_RATE_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,

  [BusinessErrorCode.INVALID_CONFIGURATION]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.FILE_TOO_LARGE]: HttpStatus.PAYLOAD_TOO_LARGE,
  [BusinessErrorCode.INVALID_FILE_TYPE]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.INVALID_FORMAT]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.INVALID_JSON]: HttpStatus.BAD_REQUEST,
};

/**
 * 业务异常选项
 */
export interface BusinessExceptionOptions {
  customMessage?: string;
  details?: Record<string, any>;
}

/**
 * 错误详情接口
 */
export interface ErrorDetail {
  field?: string;
  message: string;
  value?: any;
  type?: string;
}

/**
 * 业务异常类
 */
export class BusinessException extends HttpException {
  public readonly code: BusinessErrorCode;
  public readonly details?: Record<string, any>;
  public readonly errorDetails?: ErrorDetail[];

  constructor(
    code: BusinessErrorCode,
    messageOrOptions?: string | BusinessExceptionOptions,
    details?: Record<string, any>,
  ) {
    const defaultMessage = BusinessErrorMessages[code] || '未知错误';
    const httpStatus = ErrorCodeToHttpStatus[code] || HttpStatus.INTERNAL_SERVER_ERROR;

    let message = defaultMessage;
    let optsDetails = details;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
    } else if (messageOrOptions) {
      if (messageOrOptions.customMessage) {
        message = messageOrOptions.customMessage;
      }
      if (messageOrOptions.details) {
        optsDetails = messageOrOptions.details;
      }
    }

    super(
      {
        code,
        message,
        details: optsDetails,
      },
      httpStatus,
    );

    this.code = code;
    this.details = optsDetails;
  }

  static validation(errors: ErrorDetail[], message?: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.VALIDATION_ERROR,
      message || '验证失败',
      { errors },
    );
  }
}

/**
 * 创建业务异常的快捷函数
 */
export function createError(
  code: BusinessErrorCode,
  message?: string,
  details?: Record<string, any>,
): BusinessException {
  return new BusinessException(code, message, details);
}

/**
 * 验证错误构建器
 */
export class ValidationErrorBuilder {
  private errors: ErrorDetail[] = [];

  addField(field: string, message: string, value?: any, type?: string): this {
    this.errors.push({ field, message, value, type });
    return this;
  }

  addRequired(field: string): this {
    this.errors.push({ field, message: `${field} is required`, type: 'required' });
    return this;
  }

  build(): BusinessException {
    return BusinessException.validation(this.errors);
  }
}
