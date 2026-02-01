/**
 * 认证 API 服务
 * 处理登录、注册、密码管理等认证相关接口
 */

import apiClient from './api.client';

// 用户类型
export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
  createdAt?: string;
  updatedAt?: string;
}

// 认证响应
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

// 登录参数
export interface LoginParams {
  username: string;
  password: string;
}

// 注册参数
export interface RegisterParams {
  username: string;
  password: string;
  nickname: string;
}

// 更新密码参数
export interface UpdatePasswordParams {
  oldPassword: string;
  newPassword: string;
}

/**
 * 用户登录
 */
export async function login(params: LoginParams): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/login', params);
}

/**
 * 用户注册
 */
export async function register(params: RegisterParams): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/register', params);
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

/**
 * 更新用户密码
 */
export async function updatePassword(params: UpdatePasswordParams): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>('/auth/password', params);
}

/**
 * 刷新访问令牌
 */
export async function refreshToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
  return apiClient.post<{ token: string; expiresIn: number }>('/auth/refresh', { refreshToken });
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  // 可选：调用后端登出接口
  // await apiClient.post('/auth/logout');

  // 清理本地存储
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('uid');
}

// 默认导出
export default {
  login,
  register,
  getCurrentUser,
  updatePassword,
  refreshToken,
  logout,
};
