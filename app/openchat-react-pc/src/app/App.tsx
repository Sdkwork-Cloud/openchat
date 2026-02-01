/**
 * App 组件 - 应用根组件
 * 
 * 职责：
 * 1. 初始化 Platform
 * 2. 检测运行环境 (Web/Desktop)
 * 3. 管理认证状态
 * 4. 渲染应用主体或登录页面
 */

import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { initializePlatform } from '../platform';
import { createWebPlatform } from '../platform-impl/web';
import { AppProvider, useAuthContext } from './AppProvider';
import { MainLayout } from '../layouts/MainLayout';
import { AppRouter } from '../router';
import { AuthPage } from '../modules/auth/pages/AuthPage';

/**
 * 检测是否在 Tauri Desktop 环境
 */
function isTauri(): boolean {
  return !!(window as any).__TAURI__;
}

/**
 * 初始化 Platform
 */
async function initPlatform() {
  if (isTauri()) {
    // Desktop 环境 - 动态导入 Desktop Platform
    const { createDesktopPlatform } = await import('../platform-impl/desktop');
    initializePlatform(createDesktopPlatform());
  } else {
    // Web 环境
    initializePlatform(createWebPlatform());
  }
}

/**
 * 应用内容组件
 * 根据认证状态显示登录页面或主应用
 */
function AppContent() {
  const { isAuthenticated, isLoading, login, error, clearError } = useAuthContext();

  // 显示登录页面
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // 显示主应用
  return (
    <MainLayout>
      <AppRouter />
    </MainLayout>
  );
}

/**
 * 应用根组件
 */
export function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initPlatform()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Failed to initialize platform:', err);
        setError(err);
      });
  }, []);

  // 加载中
  if (!isReady && !error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F172A]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#94A3B8]">初始化中...</span>
        </div>
      </div>
    );
  }

  // 初始化失败
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F172A]">
        <div className="text-center">
          <div className="text-[#EF4444] text-lg mb-2">初始化失败</div>
          <div className="text-[#94A3B8] text-sm">{error.message}</div>
        </div>
      </div>
    );
  }

  // 正常渲染
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
