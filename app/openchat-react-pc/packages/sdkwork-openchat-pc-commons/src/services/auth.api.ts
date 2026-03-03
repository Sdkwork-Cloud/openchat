/**
 * 璁よ瘉 API 鏈嶅姟
 * 澶勭悊鐧诲綍銆佹敞鍐屻€佸瘑鐮佺鐞嗙瓑璁よ瘉鐩稿叧鎺ュ彛
 */

import apiClient from './api.client';

// 鐢ㄦ埛绫诲瀷
export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
  createdAt?: string;
  updatedAt?: string;
}

// 璁よ瘉鍝嶅簲
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

// 鐧诲綍鍙傛暟
export interface LoginParams {
  username: string;
  password: string;
}

// 娉ㄥ唽鍙傛暟
export interface RegisterParams {
  username: string;
  password: string;
  nickname: string;
}

// 鏇存柊瀵嗙爜鍙傛暟
export interface UpdatePasswordParams {
  oldPassword: string;
  newPassword: string;
}

/**
 * 鐢ㄦ埛鐧诲綍
 */
export async function login(params: LoginParams): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/login', params);
}

/**
 * 鐢ㄦ埛娉ㄥ唽
 */
export async function register(params: RegisterParams): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/register', params);
}

/**
 * 鑾峰彇褰撳墠鐢ㄦ埛淇℃伅
 */
export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

/**
 * 鏇存柊鐢ㄦ埛瀵嗙爜
 */
export async function updatePassword(params: UpdatePasswordParams): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>('/auth/password', params);
}

/**
 * 鍒锋柊璁块棶浠ょ墝
 */
export async function refreshToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
  return apiClient.post<{ token: string; expiresIn: number }>('/auth/refresh', { refreshToken });
}

/**
 * 鐢ㄦ埛鐧诲嚭
 */
export async function logout(): Promise<void> {
  // 鍙€夛細璋冪敤鍚庣鐧诲嚭鎺ュ彛
  // await apiClient.post('/auth/logout');

  // 娓呯悊鏈湴瀛樺偍
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('uid');
}

// 榛樿瀵煎嚭
export default {
  login,
  register,
  getCurrentUser,
  updatePassword,
  refreshToken,
  logout,
};

