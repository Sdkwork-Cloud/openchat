/**
 * 认证状态存储
 * 
 * 职责：
 * 1. 管理用户认证状态
 * 2. 提供登录、登出、注册等方法
 * 3. 持久化存储认证信息
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken, getAuthToken, clearAuthToken, setUserInfo, getUserInfo, UserInfo } from '../utils/auth';

/**
 * 认证状态类型
 */
interface AuthState {
  // 状态
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 方法
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

/**
 * 认证状态存储
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 初始状态
      user: getUserInfo(),
      isAuthenticated: !!getAuthToken(),
      isLoading: false,
      error: null,
      
      // 登录方法
      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 这里应该调用API进行登录验证
          // 暂时模拟登录成功
          if (username === 'admin' && password === 'admin123') {
            const mockUser: UserInfo = {
              id: '1',
              username: 'admin',
              role: 'admin'
            };
            const mockToken = 'mock_admin_token_123456';
            
            // 存储认证信息
            setAuthToken(mockToken);
            setUserInfo(mockUser);
            
            set({ 
              user: mockUser, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            throw new Error('用户名或密码错误');
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '登录失败', 
            isLoading: false 
          });
        }
      },
      
      // 登出方法
      logout: () => {
        // 清除认证信息
        clearAuthToken();
        
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        });
      },
      
      // 清除错误
      clearError: () => {
        set({ error: null });
      },
      
      // 刷新用户信息
      refreshUser: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // 这里应该调用API获取最新用户信息
          // 暂时使用本地存储的用户信息
          const userInfo = getUserInfo();
          
          set({ 
            user: userInfo, 
            isAuthenticated: !!userInfo, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '刷新用户信息失败', 
            isLoading: false 
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
