/**
 * 路由配置
 * 
 * 职责：
 * 1. 配置应用的路由系统
 * 2. 定义路由路径和对应的组件
 * 3. 实现路由守卫和权限控制
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '../app/AppProvider';

// 导入页面组件
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage';
import { UserListPage } from '../modules/user/pages/UserListPage';
import { UserCreatePage } from '../modules/user/pages/UserCreatePage';
import { DeviceListPage } from '../modules/device/pages/DeviceListPage';
import { DeviceCreatePage } from '../modules/device/pages/DeviceCreatePage';
import { MessageListPage } from '../modules/message/pages/MessageListPage';
import { MessageSettingsPage } from '../modules/message/pages/MessageSettingsPage';
import { SystemSettingsPage } from '../modules/system/pages/SystemSettingsPage';
import { SystemLogsPage } from '../modules/system/pages/SystemLogsPage';
import { SystemMonitorPage } from '../modules/system/pages/SystemMonitorPage';

// 路由守卫组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 应用路由组件
export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 认证路由 */}
      <Route path="/login" element={<AuthPage />} />
      
      {/* 主应用路由（需要认证） */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />

      {/* 用户管理路由 */}
      <Route 
        path="/users" 
        element={
          <ProtectedRoute>
            <Navigate to="/users/list" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users/list" 
        element={
          <ProtectedRoute>
            <UserListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users/create" 
        element={
          <ProtectedRoute>
            <UserCreatePage />
          </ProtectedRoute>
        } 
      />

      {/* 设备管理路由 */}
      <Route 
        path="/devices" 
        element={
          <ProtectedRoute>
            <Navigate to="/devices/list" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/devices/list" 
        element={
          <ProtectedRoute>
            <DeviceListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/devices/create" 
        element={
          <ProtectedRoute>
            <DeviceCreatePage />
          </ProtectedRoute>
        } 
      />

      {/* 消息管理路由 */}
      <Route 
        path="/messages" 
        element={
          <ProtectedRoute>
            <Navigate to="/messages/list" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/messages/list" 
        element={
          <ProtectedRoute>
            <MessageListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/messages/settings" 
        element={
          <ProtectedRoute>
            <MessageSettingsPage />
          </ProtectedRoute>
        } 
      />

      {/* 系统管理路由 */}
      <Route 
        path="/system" 
        element={
          <ProtectedRoute>
            <Navigate to="/system/settings" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/system/settings" 
        element={
          <ProtectedRoute>
            <SystemSettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/system/logs" 
        element={
          <ProtectedRoute>
            <SystemLogsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/system/monitor" 
        element={
          <ProtectedRoute>
            <SystemMonitorPage />
          </ProtectedRoute>
        } 
      />

      {/* 404 页面 */}
      <Route 
        path="*" 
        element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

// 登录页面组件（临时定义，后续会被实际的登录页面替换）
const AuthPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">OpenChat Admin 登录</h2>
        <p className="text-center text-gray-600 mb-8">请使用管理员账号登录系统</p>
        <div className="text-center">
          <p className="text-gray-500 mb-4">用户名: admin</p>
          <p className="text-gray-500 mb-8">密码: admin123</p>
          <button 
            className="w-full py-3 px-4 bg-primary-500 text-white rounded-md font-medium hover:bg-primary-600 transition-colors"
            onClick={() => {
              const { login } = useAuthContext();
              login('admin', 'admin123');
            }}
          >
            快速登录
          </button>
        </div>
      </div>
    </div>
  );
};

// 404 页面组件
const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">页面未找到</h2>
        <p className="text-gray-600 mb-8">您访问的页面不存在</p>
        <button 
          className="px-6 py-3 bg-primary-500 text-white rounded-md font-medium hover:bg-primary-600 transition-colors"
          onClick={() => {
            window.location.href = '/dashboard';
          }}
        >
          返回仪表盘
        </button>
      </div>
    </div>
  );
};

// 导出路由组件
export default AppRouter;