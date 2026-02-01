/**
 * 登录页面 - 完整版
 *
 * 职责：
 * 1. 用户登录表单（用户名+密码）
 * 2. 调用服务端登录API获取Token
 * 3. 将Token传递给SDK连接IM服务器
 * 4. 提供注册和忘记密码的链接
 */

import { useState } from 'react';
import type { UseAuthReturn } from '../hooks/useAuth';

interface LoginPageProps {
  auth: UseAuthReturn;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

/**
 * 登录页面
 */
export function LoginPage({ auth, onSwitchToRegister, onSwitchToForgotPassword }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.clearError();

    await auth.login(username.trim(), password.trim());
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">让沟通更简单</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6 shadow-[var(--shadow-lg)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">登录</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                required
                disabled={auth.isLoading}
              />
            </div>

            {/* 密码 - 带可见性切换 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-2.5 pr-12 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                  required
                  disabled={auth.isLoading}
                />
                {/* 密码可见性切换按钮 */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    // 眼睛睁开图标 - 密码可见
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    // 眼睛关闭图标 - 密码隐藏
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 忘记密码链接 */}
            <div className="text-right">
              <button
                onClick={onSwitchToForgotPassword}
                className="text-sm text-[var(--ai-primary)] hover:underline focus:outline-none"
              >
                忘记密码？
              </button>
            </div>

            {/* 错误提示 */}
            {auth.error && (
              <div className="p-3 bg-[var(--ai-error-soft)] border border-[var(--ai-error)]/20 rounded-xl">
                <p className="text-sm text-[var(--ai-error)]">{auth.error}</p>
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={auth.isLoading}
              className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center"
            >
              {auth.isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              还没有账户？
              <button
                onClick={onSwitchToRegister}
                className="ml-1 text-[var(--ai-primary)] hover:underline focus:outline-none"
              >
                立即注册
              </button>
            </p>
          </div>

          {/* 说明 */}
          <div className="mt-6">
            <p className="text-xs text-[var(--text-muted)] text-center">
              基于 OpenChat SDK 实现 IM 连接
            </p>
          </div>
        </div>

        {/* 版权信息 */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          © 2024 OpenChat Team
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
