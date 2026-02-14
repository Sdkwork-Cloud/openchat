/**
 * 带用户信息的请求接口
 */
export interface RequestWithUser extends Request {
  user?: {
    id: string;
    username: string;
    email?: string;
    [key: string]: any;
  };
}
