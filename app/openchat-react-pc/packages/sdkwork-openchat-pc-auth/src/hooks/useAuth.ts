import { useCallback, useEffect, useState } from "react";
import { IS_DEV } from "@sdkwork/openchat-pc-kernel";
import type {
  AuthState,
  IMConfig,
  PasswordStrength,
  RegisterRequest,
} from "../entities/auth.entity";
import {
  AuthResultService,
  loadAuthData,
  saveAuthData,
  validateEmail,
  validateNickname,
  validatePasswordStrength,
  validatePhone,
  validateUsername,
} from "../services";

const DEV_TEST_ACCOUNT = {
  username: "testuser",
  password: "Test@123456",
};

const DEV_AUTO_LOGIN_KEY = "openchat_dev_auto_login_disabled";

function resolveErrorMessage(message?: string, fallback = "Request failed."): string {
  return message || fallback;
}

export interface UseAuthReturn extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  loginWithThirdParty: (provider: string) => Promise<boolean>;
  register: (request: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email?: string, phone?: string) => Promise<boolean>;
  clearError: () => void;
  checkPasswordStrength: (password: string) => PasswordStrength;
  checkUsername: (username: string) => { isValid: boolean; error?: string };
  checkEmail: (email: string) => { isValid: boolean; error?: string };
  checkPhone: (phone: string) => { isValid: boolean; error?: string };
  checkNickname: (nickname: string) => { isValid: boolean; error?: string };
  updateIMConfig: (config: Partial<IMConfig>) => void;
  disableDevAutoLogin: () => void;
  enableDevAutoLogin: () => void;
  isDevAutoLoginDisabled: () => boolean;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    imConfig: null,
    isLoading: true,
    error: null,
  });

  const disableDevAutoLogin = useCallback(() => {
    localStorage.setItem(DEV_AUTO_LOGIN_KEY, "true");
  }, []);

  const enableDevAutoLogin = useCallback(() => {
    localStorage.removeItem(DEV_AUTO_LOGIN_KEY);
  }, []);

  const isDevAutoLoginDisabled = useCallback(() => {
    return localStorage.getItem(DEV_AUTO_LOGIN_KEY) === "true";
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const restoreResult = await AuthResultService.restoreAuth();
        if (restoreResult.success && restoreResult.data) {
          setState({
            isAuthenticated: true,
            user: restoreResult.data.user,
            imConfig: restoreResult.data.imConfig,
            isLoading: false,
            error: null,
          });
          return;
        }

        if (IS_DEV && !isDevAutoLoginDisabled()) {
          const loginResult = await AuthResultService.login(
            DEV_TEST_ACCOUNT.username,
            DEV_TEST_ACCOUNT.password,
          );
          if (loginResult.success && loginResult.data) {
            setState({
              isAuthenticated: true,
              user: loginResult.data.user,
              imConfig: loginResult.data.imConfig,
              isLoading: false,
              error: null,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth state:", error);
      }

      setState((prev) => ({ ...prev, isLoading: false }));
    };

    void initAuth();
  }, [isDevAutoLoginDisabled]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await AuthResultService.login(username, password);
      if (!result.success || !result.data) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: resolveErrorMessage(result.error, "Login failed."),
        }));
        return false;
      }

      setState({
        isAuthenticated: true,
        user: result.data.user,
        imConfig: result.data.imConfig,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed.",
      }));
      return false;
    }
  }, []);

  const register = useCallback(async (request: RegisterRequest): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await AuthResultService.register(request);
      if (!result.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: resolveErrorMessage(result.error, "Register failed."),
        }));
        return false;
      }

      const authData = loadAuthData();
      if (authData) {
        setState({
          isAuthenticated: true,
          user: authData.user,
          imConfig: authData.imConfig,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
      }

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Register failed.",
      }));
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await AuthResultService.logout();
      if (!result.success) {
        console.error("Logout failed:", result.error);
      }
    } catch (error) {
      console.error("Logout failed:", error);
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

  const loginWithThirdParty = useCallback(async (provider: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await AuthResultService.loginWithThirdParty(provider);
      if (!result.success || !result.data) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: resolveErrorMessage(result.error, "Third-party login failed."),
        }));
        return false;
      }

      setState({
        isAuthenticated: true,
        user: result.data.user,
        imConfig: result.data.imConfig,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Third-party login failed.",
      }));
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const checkPasswordStrength = useCallback((password: string): PasswordStrength => {
    return validatePasswordStrength(password);
  }, []);

  const checkUsername = useCallback((username: string): { isValid: boolean; error?: string } => {
    return validateUsername(username);
  }, []);

  const checkEmail = useCallback((email: string): { isValid: boolean; error?: string } => {
    return validateEmail(email);
  }, []);

  const checkPhone = useCallback((phone: string): { isValid: boolean; error?: string } => {
    return validatePhone(phone);
  }, []);

  const checkNickname = useCallback((nickname: string): { isValid: boolean; error?: string } => {
    return validateNickname(nickname);
  }, []);

  const forgotPassword = useCallback(async (email?: string, phone?: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await AuthResultService.forgotPassword(email, phone);
      if (!result.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: resolveErrorMessage(result.error, "Failed to send password reset request."),
        }));
        return false;
      }

      setState((prev) => ({ ...prev, isLoading: false, error: null }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to send password reset request.",
      }));
      return false;
    }
  }, []);

  const updateIMConfig = useCallback((config: Partial<IMConfig>) => {
    setState((prev) => {
      if (!prev.imConfig) {
        return prev;
      }

      const nextConfig = { ...prev.imConfig, ...config };
      if (prev.user) {
        const currentAuth = loadAuthData();
        saveAuthData({
          user: prev.user,
          token: currentAuth?.token || "",
          authToken: currentAuth?.authToken,
          accessToken: currentAuth?.accessToken,
          imToken: nextConfig.token,
          refreshToken: currentAuth?.refreshToken,
          imConfig: nextConfig,
          timestamp: Date.now(),
        });
      }

      return { ...prev, imConfig: nextConfig };
    });
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
    updateIMConfig,
    disableDevAutoLogin,
    enableDevAutoLogin,
    isDevAutoLoginDisabled,
  };
}
