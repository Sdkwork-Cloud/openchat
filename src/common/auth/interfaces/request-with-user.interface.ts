import { Request } from 'express';

/**
 * 带用户信息的请求接口
 */
export interface RequestWithUser extends Request {
  user?: {
    userId: string;
    username: string;
    email?: string;
    [key: string]: unknown;
  };
}
