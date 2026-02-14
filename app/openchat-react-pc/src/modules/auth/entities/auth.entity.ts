/**
 * 认证实体定义 - 完整版
 *
 * 职责：定义用户认证相关的领域模型
 * 包含：登录、注册、忘记密码、修改密码
 */

/**
 * 用户信息
 */
export interface User {
  id: string;
  uid?: string;
  username: string;
  email: string;
  phone: string;
  nickname: string;
  avatar?: string;
  status?: string;
}

/**
 * IM连接配置
 * 由服务端登录API返回
 */
export interface IMConfig {
  /** WebSocket服务器地址 */
  wsUrl: string;
  /** API服务器地址 */
  serverUrl?: string;
  /** 用户ID */
  uid: string;
  /** 设备ID */
  deviceId?: string;
  /** 设备标识 */
  deviceFlag?: string;
  /** IM认证Token */
  token: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  imConfig: IMConfig;
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

/**
 * 注册响应
 */
export interface RegisterResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

/**
 * 忘记密码请求
 */
export interface ForgotPasswordRequest {
  email?: string;
  phone?: string;
}

/**
 * 忘记密码响应
 */
export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 修改密码请求
 */
export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 修改密码响应
 */
export interface UpdatePasswordResponse {
  success: boolean;
  error?: string;
}

/**
 * 认证状态
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  imConfig: IMConfig | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 存储的认证数据
 */
export interface StoredAuthData {
  user: User;
  token: string;
  imConfig: IMConfig;
  timestamp: number;
}

/**
 * 密码强度验证结果
 */
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-4
  errors: string[];
  suggestions: string[];
}
