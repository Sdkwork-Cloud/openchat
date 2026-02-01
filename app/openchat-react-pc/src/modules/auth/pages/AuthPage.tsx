/**
 * 认证主页面 - 完整版
 *
 * 职责：
 * 1. 管理认证流程（登录、注册、忘记密码）
 * 2. 处理页面切换
 * 3. 提供统一的认证状态管理
 * 4. 集成SDK服务
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';

type AuthMode = 'login' | 'register' | 'forgotPassword';

/**
 * 认证主页面
 */
export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const auth = useAuth();

  // 切换到登录
  const switchToLogin = () => {
    setMode('login');
    auth.clearError();
  };

  // 切换到注册
  const switchToRegister = () => {
    setMode('register');
    auth.clearError();
  };

  // 切换到忘记密码
  const switchToForgotPassword = () => {
    setMode('forgotPassword');
    auth.clearError();
  };

  // 根据当前模式渲染对应页面
  const renderAuthPage = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginPage
            auth={auth}
            onSwitchToRegister={switchToRegister}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        );
      
      case 'register':
        return (
          <RegisterPage
            auth={auth}
            onSwitchToLogin={switchToLogin}
          />
        );
      
      case 'forgotPassword':
        return (
          <ForgotPasswordPage
            auth={auth}
            onSwitchToLogin={switchToLogin}
          />
        );
      
      default:
        return <LoginPage auth={auth} onSwitchToRegister={switchToRegister} onSwitchToForgotPassword={switchToForgotPassword} />;
    }
  };

  return <>{renderAuthPage()}</>;
}

export default AuthPage;
