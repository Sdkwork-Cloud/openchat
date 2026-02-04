/**
 * 认证工具函数
 * 
 * 职责：
 * 1. 管理认证令牌的存储和获取
 * 2. 处理用户认证状态
 */

// 认证令牌存储键
const AUTH_TOKEN_KEY = 'admin_token';
const USER_INFO_KEY = 'admin_user';

/**
 * 用户信息类型
 */
export interface UserInfo {
  id: string;
  username: string;
  role: string;
  [key: string]: any;
}

/**
 * 设置认证令牌
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

/**
 * 获取认证令牌
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * 清除认证令牌
 */
export const clearAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
};

/**
 * 设置用户信息
 */
export const setUserInfo = (userInfo: UserInfo): void => {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
};

/**
 * 获取用户信息
 */
export const getUserInfo = (): UserInfo | null => {
  const userInfoStr = localStorage.getItem(USER_INFO_KEY);
  return userInfoStr ? JSON.parse(userInfoStr) : null;
};

/**
 * 检查是否已认证
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
