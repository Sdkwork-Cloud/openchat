import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: '业务状态码', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: 'success' })
  message: string;

  @ApiProperty({ description: '业务数据', required: false })
  data?: T;

  @ApiProperty({ description: '时间戳', example: 1700000000000 })
  timestamp: number;

  constructor(code: number, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.timestamp = Date.now();
  }

  static success<T>(data?: T, message: string = 'success'): ApiResponseDto<T> {
    return new ApiResponseDto(0, message, data);
  }

  static error<T>(code: number, message: string, data?: T): ApiResponseDto<T> {
    return new ApiResponseDto(code, message, data);
  }
}

export class PagedResponseDto<T> {
  @ApiProperty({ description: '业务状态码', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: 'success' })
  message: string;

  @ApiProperty({ description: '分页数据' })
  data: {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };

  @ApiProperty({ description: '时间戳', example: 1700000000000 })
  timestamp: number;

  constructor(
    list: T[],
    total: number,
    page: number,
    pageSize: number,
  ) {
    this.code = 0;
    this.message = 'success';
    this.data = {
      list,
      total,
      page,
      pageSize,
      hasMore: list.length === pageSize,
    };
    this.timestamp = Date.now();
  }

  static create<T>(
    list: T[],
    total: number,
    page: number = 1,
    pageSize: number = 20,
  ): PagedResponseDto<T> {
    return new PagedResponseDto(list, total, page, pageSize);
  }
}

export class CursorResponseDto<T> {
  @ApiProperty({ description: '业务状态码', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: 'success' })
  message: string;

  @ApiProperty({ description: '游标分页数据' })
  data: {
    list: T[];
    nextCursor?: string;
    hasMore: boolean;
  };

  @ApiProperty({ description: '时间戳', example: 1700000000000 })
  timestamp: number;

  constructor(list: T[], nextCursor?: string) {
    this.code = 0;
    this.message = 'success';
    this.data = {
      list,
      nextCursor,
      hasMore: !!nextCursor,
    };
    this.timestamp = Date.now();
  }

  static create<T>(list: T[], nextCursor?: string): CursorResponseDto<T> {
    return new CursorResponseDto(list, nextCursor);
  }
}

export enum ErrorCode {
  SUCCESS = 0,
  UNKNOWN_ERROR = 1000,
  INVALID_PARAMS = 1001,
  UNAUTHORIZED = 1002,
  FORBIDDEN = 1003,
  NOT_FOUND = 1004,
  CONFLICT = 1005,
  
  AUTH_ERROR = 2000,
  LOGIN_FAILED = 2001,
  TOKEN_EXPIRED = 2002,
  TOKEN_INVALID = 2003,
  
  USER_ERROR = 3000,
  USER_NOT_FOUND = 3001,
  USER_ALREADY_EXISTS = 3002,
  USER_BLOCKED = 3003,
  
  MESSAGE_ERROR = 4000,
  MESSAGE_NOT_FOUND = 4001,
  MESSAGE_SEND_FAILED = 4002,
  MESSAGE_RECALL_TIMEOUT = 4003,
  
  GROUP_ERROR = 5000,
  GROUP_NOT_FOUND = 5001,
  NOT_GROUP_MEMBER = 5002,
  NOT_GROUP_OWNER = 5003,
  GROUP_FULL = 5004,
  
  FRIEND_ERROR = 6000,
  FRIEND_REQUEST_EXISTS = 6001,
  ALREADY_FRIENDS = 6002,
  BLOCKED_BY_USER = 6003,
  
  FILE_ERROR = 7000,
  FILE_TOO_LARGE = 7001,
  FILE_TYPE_NOT_ALLOWED = 7002,
  FILE_UPLOAD_FAILED = 7003,
  
  RATE_LIMIT = 8000,
  TOO_MANY_REQUESTS = 8001,
}

export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '成功',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.INVALID_PARAMS]: '参数无效',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT]: '资源冲突',
  
  [ErrorCode.AUTH_ERROR]: '认证错误',
  [ErrorCode.LOGIN_FAILED]: '登录失败',
  [ErrorCode.TOKEN_EXPIRED]: '令牌已过期',
  [ErrorCode.TOKEN_INVALID]: '令牌无效',
  
  [ErrorCode.USER_ERROR]: '用户错误',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.USER_BLOCKED]: '用户已被封禁',
  
  [ErrorCode.MESSAGE_ERROR]: '消息错误',
  [ErrorCode.MESSAGE_NOT_FOUND]: '消息不存在',
  [ErrorCode.MESSAGE_SEND_FAILED]: '消息发送失败',
  [ErrorCode.MESSAGE_RECALL_TIMEOUT]: '消息撤回超时',
  
  [ErrorCode.GROUP_ERROR]: '群组错误',
  [ErrorCode.GROUP_NOT_FOUND]: '群组不存在',
  [ErrorCode.NOT_GROUP_MEMBER]: '不是群成员',
  [ErrorCode.NOT_GROUP_OWNER]: '不是群主',
  [ErrorCode.GROUP_FULL]: '群组已满',
  
  [ErrorCode.FRIEND_ERROR]: '好友错误',
  [ErrorCode.FRIEND_REQUEST_EXISTS]: '好友请求已存在',
  [ErrorCode.ALREADY_FRIENDS]: '已经是好友',
  [ErrorCode.BLOCKED_BY_USER]: '已被对方拉黑',
  
  [ErrorCode.FILE_ERROR]: '文件错误',
  [ErrorCode.FILE_TOO_LARGE]: '文件过大',
  [ErrorCode.FILE_TYPE_NOT_ALLOWED]: '文件类型不允许',
  [ErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
  
  [ErrorCode.RATE_LIMIT]: '请求频率限制',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',
};
