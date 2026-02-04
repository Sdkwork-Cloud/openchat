/**
 * 认证状态管理 Hook - 完整版
 *
 * 职责：
 * 1. 管理用户登录状态（通过SDK服务）
 * 2. 提供登录/注册/登出方法（调用SDK服务）
 * 3. 持久化认证数据到 localStorage
 * 4. 应用启动时自动恢复登录状态
 * 5. 密码强度实时验证
 *
 * 登录流程：
 * 1. 用户输入用户名+密码
 * 2. 调用login() -> authService.login()
 * 3. authService调用服务端登录API获取JWT和IM配置
 * 4. 使用IM配置初始化SDK连接
 * 5. SDK使用IM Token连接IM服务器
 */

import { useState, useEffect, useCallback } from 'react';
import type { User, IMConfig, AuthState, RegisterRequest, PasswordStrength } from '../entities/auth.entity';
import {
  login as loginService,
  logout as logoutService,
  register as registerService,
  forgotPassword as forgotPasswordService,
  restoreAuth,
  loadAuthData,
  validatePasswordStrength,
  validateUsername,
  validateEmail,
  validatePhone,
  validateNickname,
  loginWithThirdParty as loginWithThirdPartyService,
} from '../services/auth.service';

export interface UseAuthReturn extends AuthState {
  /** 登录 - 传入用户名和密码 */
  login: (username: string, password: string) => Promise<boolean>;
  /** 第三方登录 - 传入第三方提供商 */
  loginWithThirdParty: (provider: string) => Promise<boolean>;
  /** 注册 - 传入注册信息 */
  register: (request: RegisterRequest) => Promise<boolean>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 忘记密码 */
  forgotPassword: (email?: string, phone?: string) => Promise<boolean>;
  /** 清除错误 */
  clearError: () => void;
  /** 验证密码强度 */
  checkPasswordStrength: (password: string) => PasswordStrength;
  /** 验证用户名 */
  checkUsername: (username: string) => { isValid: boolean; error?: string };
  /** 验证邮箱 */
  checkEmail: (email: string) => { isValid: boolean; error?: string };
  /** 验证手机号 */
  checkPhone: (phone: string) => { isValid: boolean; error?: string };
  /** 验证昵称 */
  checkNickname: (nickname: string) => { isValid: boolean; error?: string };
}

/**
 * 认证 Hook
 * 使用SDK服务进行登录认证
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    imConfig: null,
    isLoading: true,
    error: null,
  });

  // 初始化：尝试恢复登录状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 尝试恢复之前的登录状态
        const result = await restoreAuth();

        if (result) {
          setState({
            isAuthenticated: true,
            user: result.user,
            imConfig: result.imConfig,
            isLoading: false,
            error: null,
          });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  /**
   * 登录
   * 调用SDK服务进行登录
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await loginService(username, password);

      setState({
        isAuthenticated: true,
        user: response.user,
        imConfig: response.imConfig,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '登录失败',
      }));
      return false;
    }
  }, []);

  /**
   * 注册
   * 调用SDK服务进行注册
   */
  const register = useCallback(async (request: RegisterRequest): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await registerService(request);

      if (!response.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || '注册失败',
        }));
        return false;
      }

      // 注册成功，更新状态（注册服务已自动登录）
      const authData = loadAuthData();
      if (authData) {
        setState({
          isAuthenticated: true,
          user: authData.user,
          imConfig: authData.imConfig,
          isLoading: false,
          error: null,
        });
      }

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '注册失败',
      }));
      return false;
    }
  }, []);

  /**
   * 登出
   * 调用SDK服务进行登出
   */
  const logout = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await logoutService();
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      setState({
        isAuthenticated: false,
        user: null,
        imConfig: null,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  /**
   * 第三方登录
   * 调用SDK服务进行第三方登录
   */
  const loginWithThirdParty = useCallback(async (provider: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await loginWithThirdPartyService(provider);

      setState({
        isAuthenticated: true,
        user: response.user,
        imConfig: response.imConfig,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '第三方登录失败',
      }));
      return false;
    }
  }, []);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * 验证密码强度
   */
  const checkPasswordStrength = useCallback((password: string): PasswordStrength => {
    return validatePasswordStrength(password);
  }, []);

  /**
   * 验证用户名
   */
  const checkUsername = useCallback((username: string): { isValid: boolean; error?: string } => {
    return validateUsername(username);
  }, []);

  /**
   * 验证邮箱
   */
  const checkEmail = useCallback((email: string): { isValid: boolean; error?: string } => {
    return validateEmail(email);
  }, []);

  /**
   * 验证手机号
   */
  const checkPhone = useCallback((phone: string): { isValid: boolean; error?: string } => {
    return validatePhone(phone);
  }, []);

  /**
   * 验证昵称
   */
  const checkNickname = useCallback((nickname: string): { isValid: boolean; error?: string } => {
    return validateNickname(nickname);
  }, []);

  /**
   * 忘记密码
   */
  const forgotPassword = useCallback(async (email?: string, phone?: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await forgotPasswordService(email, phone);

      if (!response.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || '发送失败',
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '发送失败',
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    login,
    loginWithThirdParty,
    register,
    logout,
    forgotPassword,
    clearError,
    checkPasswordStrength,
    checkUsername,
    checkEmail,
    checkPhone,
    checkNickname,
  };
}
