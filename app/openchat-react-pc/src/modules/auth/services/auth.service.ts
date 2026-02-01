/**
 * 认证服务 - 完整版
 *
 * 职责：
 * 1. 用户登录（调用服务端API获取JWT Token和IM配置）
 * 2. 用户注册（创建新用户并自动登录）
 * 3. 忘记密码（发送重置链接）
 * 4. 修改密码（更新用户密码）
 * 5. 密码强度验证
 * 6. 管理认证状态
 *
 * 登录流程：
 * 1. 用户名+密码 -> 服务端登录API
 * 2. 返回 JWT Token + IM配置(wsUrl, uid, imToken)
 * 3. 使用IM配置初始化SDK
 * 4. SDK使用imToken连接IM服务器
 */

import { initializeSDK, destroySDK, isSDKInitialized } from '../../im/adapters/sdk-adapter';
import type {
  User,
  IMConfig,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  UpdatePasswordRequest,
  UpdatePasswordResponse,
  PasswordStrength,
} from '../entities/auth.entity';

const AUTH_STORAGE_KEY = 'openchat_auth_data';
const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000';

/**
 * 存储的认证数据
 */
interface StoredAuthData {
  user: User;
  token: string;
  imConfig: IMConfig;
  timestamp: number;
}

/**
 * 从 localStorage 加载认证数据
 */
export function loadAuthData(): StoredAuthData | null {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // 忽略解析错误
  }
  return null;
}

/**
 * 保存认证数据到 localStorage
 */
export function saveAuthData(data: StoredAuthData): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 清除认证数据
 */
export function clearAuthData(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // 忽略清除错误
  }
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // 长度检查
  if (password.length < 8) {
    errors.push('密码长度不能少于8个字符');
  } else if (password.length >= 12) {
    score += 1;
  }

  if (password.length > 100) {
    errors.push('密码长度不能超过100个字符');
  }

  // 小写字母
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  } else {
    score += 1;
  }

  // 大写字母
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  } else {
    score += 1;
  }

  // 数字
  if (!/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  } else {
    score += 1;
  }

  // 特殊字符
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符(@$!%*?&)');
  } else {
    score += 1;
  }

  // 建议
  if (password.length < 12) {
    suggestions.push('建议使用12位以上密码增强安全性');
  }
  if (!/[^A-Za-z\d@$!%*?&]/.test(password)) {
    suggestions.push('可以添加更多类型的特殊字符');
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
    suggestions,
  };
}

/**
 * 验证用户名
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: '用户名不能为空' };
  }

  if (username.length < 3) {
    return { isValid: false, error: '用户名长度不能少于3个字符' };
  }

  if (username.length > 50) {
    return { isValid: false, error: '用户名长度不能超过50个字符' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, error: '用户名只能包含字母、数字、下划线和横线' };
  }

  return { isValid: true };
}

/**
 * 验证昵称
 */
export function validateNickname(nickname: string): { isValid: boolean; error?: string } {
  if (!nickname) {
    return { isValid: false, error: '昵称不能为空' };
  }

  if (nickname.length < 1) {
    return { isValid: false, error: '昵称长度不能少于1个字符' };
  }

  if (nickname.length > 100) {
    return { isValid: false, error: '昵称长度不能超过100个字符' };
  }

  return { isValid: true };
}

/**
 * 调用服务端登录API
 */
async function callLoginApi(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('用户名或密码错误');
    }
    throw new Error('登录失败，请稍后重试');
  }

  const data = await response.json();

  // 检查响应数据
  if (!data) {
    throw new Error('服务器返回数据为空');
  }

  if (!data.imConfig) {
    console.error('服务器响应:', data);
    throw new Error('服务器未返回IM配置，请检查服务端配置');
  }

  if (!data.imConfig.wsUrl) {
    console.error('IM配置:', data.imConfig);
    throw new Error('IM配置缺少wsUrl');
  }

  if (!data.imConfig.uid) {
    throw new Error('IM配置缺少uid');
  }

  if (!data.imConfig.token) {
    throw new Error('IM配置缺少token');
  }

  return {
    user: data.user,
    token: data.token,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    imConfig: {
      wsUrl: data.imConfig.wsUrl,
      uid: data.imConfig.uid,
      token: data.imConfig.token,
    },
  };
}

/**
 * 调用服务端注册API
 */
async function callRegisterApi(
  username: string,
  password: string,
  nickname: string
): Promise<{ user: User; token: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, nickname }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('用户名已存在');
    }
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.message || '请求参数错误');
    }
    throw new Error('注册失败，请稍后重试');
  }

  const data = await response.json();

  if (!data.user || !data.token) {
    throw new Error('服务器返回数据不完整');
  }

  return {
    user: data.user,
    token: data.token,
  };
}

/**
 * 登录
 * 1. 调用服务端API获取Token和IM配置
 * 2. 使用IM配置初始化SDK
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  // 参数验证
  if (!username) {
    throw new Error('请输入用户名');
  }

  if (!password) {
    throw new Error('请输入密码');
  }

  // 如果已初始化，先销毁
  if (isSDKInitialized()) {
    destroySDK();
  }

  try {
    // 1. 调用服务端登录API
    const loginResponse = await callLoginApi(username, password);

    // 2. 使用IM配置初始化SDK
    await initializeSDK({
      apiBaseUrl: API_BASE_URL,
      imWsUrl: loginResponse.imConfig.wsUrl,
      uid: loginResponse.imConfig.uid,
      token: loginResponse.imConfig.token,
    });

    // 3. 保存认证数据
    const authData: StoredAuthData = {
      user: loginResponse.user,
      token: loginResponse.token,
      imConfig: loginResponse.imConfig,
      timestamp: Date.now(),
    };
    saveAuthData(authData);

    return loginResponse;
  } catch (error: any) {
    // 连接失败，清理资源
    destroySDK();
    throw error;
  }
}

/**
 * 注册
 * 1. 调用服务端注册API创建用户
 * 2. 自动登录获取IM配置
 */
export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  // 参数验证
  const usernameValidation = validateUsername(request.username);
  if (!usernameValidation.isValid) {
    return { success: false, error: usernameValidation.error };
  }

  const nicknameValidation = validateNickname(request.nickname);
  if (!nicknameValidation.isValid) {
    return { success: false, error: nicknameValidation.error };
  }

  const passwordStrength = validatePasswordStrength(request.password);
  if (!passwordStrength.isValid) {
    return { success: false, error: passwordStrength.errors[0] };
  }

  if (request.password !== request.confirmPassword) {
    return { success: false, error: '两次输入的密码不一致' };
  }

  // 如果已初始化，先销毁
  if (isSDKInitialized()) {
    destroySDK();
  }

  try {
    // 1. 调用服务端注册API
    const registerResult = await callRegisterApi(
      request.username,
      request.password,
      request.nickname
    );

    // 2. 自动登录获取IM配置
    const loginResponse = await callLoginApi(request.username, request.password);

    // 3. 使用IM配置初始化SDK
    await initializeSDK({
      apiBaseUrl: API_BASE_URL,
      imWsUrl: loginResponse.imConfig.wsUrl,
      uid: loginResponse.imConfig.uid,
      token: loginResponse.imConfig.token,
    });

    // 4. 保存认证数据
    const authData: StoredAuthData = {
      user: loginResponse.user,
      token: loginResponse.token,
      imConfig: loginResponse.imConfig,
      timestamp: Date.now(),
    };
    saveAuthData(authData);

    return {
      success: true,
      user: loginResponse.user,
      token: loginResponse.token,
    };
  } catch (error: any) {
    // 连接失败，清理资源
    destroySDK();
    return {
      success: false,
      error: error.message || '注册失败',
    };
  }
}

/**
 * 忘记密码
 * 调用服务端API发送密码重置链接
 */
export async function forgotPassword(
  request: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  if (!request.username) {
    return { success: false, error: '请输入用户名' };
  }

  try {
    // 调用服务端忘记密码API（如果存在）
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: '用户不存在' };
      }
      throw new Error('请求失败');
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message || '密码重置链接已发送到您的邮箱',
    };
  } catch (error: any) {
    // 如果服务端API不存在，返回提示信息
    console.error('忘记密码请求失败:', error);
    return {
      success: false,
      error: '密码重置功能暂时不可用，请联系管理员',
    };
  }
}

/**
 * 修改密码
 * 调用服务端API更新密码
 */
export async function updatePassword(
  request: UpdatePasswordRequest,
  currentToken: string
): Promise<UpdatePasswordResponse> {
  if (!request.oldPassword) {
    return { success: false, error: '请输入旧密码' };
  }

  const passwordStrength = validatePasswordStrength(request.newPassword);
  if (!passwordStrength.isValid) {
    return { success: false, error: passwordStrength.errors[0] };
  }

  if (request.newPassword !== request.confirmPassword) {
    return { success: false, error: '两次输入的新密码不一致' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPassword: request.oldPassword,
        newPassword: request.newPassword,
      }),
    });

    if (!response.ok) {
      if (response.status === 400) {
        return { success: false, error: '旧密码错误' };
      }
      if (response.status === 401) {
        return { success: false, error: '登录已过期，请重新登录' };
      }
      throw new Error('修改密码失败');
    }

    return { success: true };
  } catch (error: any) {
    console.error('修改密码失败:', error);
    return {
      success: false,
      error: error.message || '修改密码失败，请稍后重试',
    };
  }
}

/**
 * 登出
 * 断开SDK连接并清理资源
 */
export async function logout(): Promise<void> {
  try {
    // 调用服务端登出API（可选）
    const authData = loadAuthData();
    if (authData?.token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => {
        // 忽略登出API错误
      });
    }
  } catch (error) {
    console.error('调用登出API失败:', error);
  } finally {
    // 销毁SDK实例
    destroySDK();
    // 清除本地存储
    clearAuthData();
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  const authData = loadAuthData();
  return !!authData && isSDKInitialized();
}

/**
 * 获取当前用户
 */
export function getCurrentUser(): User | null {
  const authData = loadAuthData();
  return authData?.user || null;
}

/**
 * 获取IM配置
 */
export function getIMConfig(): IMConfig | null {
  const authData = loadAuthData();
  return authData?.imConfig || null;
}

/**
 * 获取JWT Token
 */
export function getToken(): string | null {
  const authData = loadAuthData();
  return authData?.token || null;
}

/**
 * 恢复登录状态
 * 应用启动时调用，尝试恢复之前的登录状态
 */
export async function restoreAuth(): Promise<LoginResponse | null> {
  const authData = loadAuthData();
  if (!authData) {
    return null;
  }

  // 检查是否已过期（7天）
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - authData.timestamp > maxAge) {
    clearAuthData();
    return null;
  }

  try {
    // 尝试重新连接
    await initializeSDK({
      apiBaseUrl: API_BASE_URL,
      imWsUrl: authData.imConfig.wsUrl,
      uid: authData.imConfig.uid,
      token: authData.imConfig.token,
    });

    return {
      user: authData.user,
      token: authData.token,
      imConfig: authData.imConfig,
    };
  } catch (error) {
    console.error('恢复登录状态失败:', error);
    clearAuthData();
    return null;
  }
}

/**
 * 刷新Token
 * 调用服务端刷新API
 */
export async function refreshToken(): Promise<string | null> {
  const authData = loadAuthData();
  if (!authData?.token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authData.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('刷新Token失败');
    }

    const data = await response.json();

    // 更新本地存储的token
    authData.token = data.token;
    saveAuthData(authData);

    return data.token;
  } catch (error) {
    console.error('刷新Token失败:', error);
    return null;
  }
}
