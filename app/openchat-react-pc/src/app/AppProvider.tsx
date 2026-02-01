/**
 * 应用状态提供者
 * 
 * 整合所有全局状态管理：
 * - TanStack Query (数据获取)
 * - OpenChat SDK
 * - 主题
 * - 国际化
 * - 认证状态
 */

import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { OpenChatProvider } from '../modules/im/OpenChatProvider';
import { useAuth } from '../modules/auth';
import { ThemeProvider } from '../contexts/ThemeContext';

interface AppProviderProps {
  children: ReactNode;
}

// 创建认证上下文
import { createContext, useContext } from 'react';
import type { UseAuthReturn } from '../modules/auth';

const AuthContext = createContext<UseAuthReturn | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AppProvider');
  }
  return context;
}

/**
 * 应用状态提供者
 */
export function AppProvider({ children }: AppProviderProps) {
  const auth = useAuth();

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <OpenChatProvider>
            {children}
          </OpenChatProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default AppProvider;
