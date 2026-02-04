import React from 'react';
import { useAuthContext } from '../../../app/AppProvider';

/**
 * 认证页面组件
 * 功能：提供管理员登录界面
 */
export const AuthPage: React.FC = () => {
  const { login } = useAuthContext();

  const handleLogin = () => {
    login('admin', 'admin123');
  };

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
            onClick={handleLogin}
          >
            快速登录
          </button>
        </div>
      </div>
    </div>
  );
};

// 导出组件
export default AuthPage;