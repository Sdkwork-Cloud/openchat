/**
 * App 组件 - 应用根组件
 * 
 * 职责：
 * 1. 管理认证状态
 * 2. 渲染应用主体或登录页面
 */

import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider, useAuthContext } from './AppProvider';
import { MainLayout } from '../layouts/MainLayout';
import { AppRouter } from '../router';
import { AuthPage } from '../modules/auth/pages/AuthPage';

/**
 * 应用内容组件
 * 根据认证状态显示登录页面或主应用
 */
function AppContent() {
  const { isAuthenticated } = useAuthContext();

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

  useEffect(() => {
    // 初始化应用
    setIsReady(true);
  }, []);

  // 加载中
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary-900">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-secondary-400">初始化中...</span>
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