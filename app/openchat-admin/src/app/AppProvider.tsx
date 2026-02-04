/**
 * AppProvider 组件
 * 
 * 职责：
 * 1. 提供全局状态管理
 * 2. 管理应用初始化
 * 3. 提供上下文给子组件
 */

import { ReactNode } from 'react';
import { useAuthStore } from '../store/auth.store';

// 认证上下文提供者组件
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // 应用初始化逻辑可以在这里添加
  return (
    <>
      {children}
    </>
  );
}

// 自定义钩子，用于访问认证状态
export function useAuthContext() {
  return useAuthStore();
}
