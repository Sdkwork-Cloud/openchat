/**
 * 认证状态管理 (Zustand + Immer)
 *
 * 职责：管理用户认证状态
 * 优势：不可变性保证、更好的性能、支持持久化
 * 已对接真实 API
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import authApi, { type User, type LoginParams, type RegisterParams } from '@/services/auth.api';

// ==================== 类型定义 ====================

export interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (params: LoginParams) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ==================== Store 创建 ====================

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (params: LoginParams) => {
        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await authApi.login(params);

          set((draft) => {
            draft.user = response.user;
            draft.token = response.token;
            draft.refreshToken = response.refreshToken || null;
            draft.isAuthenticated = true;
            draft.isLoading = false;
          });

          // 同时更新 localStorage（用于 SDK 初始化）
          localStorage.setItem('uid', response.user.id);
          localStorage.setItem('token', response.token);
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
        } catch (err: any) {
          set((draft) => {
            draft.error = err.message || '登录失败';
            draft.isLoading = false;
            draft.isAuthenticated = false;
          });
          throw err;
        }
      },

      // 注册
      register: async (params: RegisterParams) => {
        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await authApi.register(params);

          set((draft) => {
            draft.user = response.user;
            draft.token = response.token;
            draft.refreshToken = response.refreshToken || null;
            draft.isAuthenticated = true;
            draft.isLoading = false;
          });

          // 同时更新 localStorage
          localStorage.setItem('uid', response.user.id);
          localStorage.setItem('token', response.token);
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
        } catch (err: any) {
          set((draft) => {
            draft.error = err.message || '注册失败';
            draft.isLoading = false;
            draft.isAuthenticated = false;
          });
          throw err;
        }
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('登出失败:', error);
        }

        set((draft) => {
          draft.user = null;
          draft.token = null;
          draft.refreshToken = null;
          draft.isAuthenticated = false;
          draft.error = null;
        });

        // 清理 localStorage
        localStorage.removeItem('uid');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      },

      // 获取当前用户信息
      fetchCurrentUser: async () => {
        const token = get().token;
        if (!token) {
          return;
        }

        try {
          const user = await authApi.getCurrentUser();
          set((draft) => {
            draft.user = user;
            draft.isAuthenticated = true;
          });
        } catch (error) {
          console.error('获取用户信息失败:', error);
          // 如果获取失败，可能是 token 过期，执行登出
          get().logout();
        }
      },

      setUser: (user) => {
        set((draft) => {
          draft.user = user;
        });
      },

      setToken: (token) => {
        set((draft) => {
          draft.token = token;
        });
      },

      setLoading: (loading) => {
        set((draft) => {
          draft.isLoading = loading;
        });
      },

      setError: (error) => {
        set((draft) => {
          draft.error = error;
        });
      },

      clearError: () => {
        set((draft) => {
          draft.error = null;
        });
      },
    })),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ==================== 选择器 (优化性能) ====================

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
