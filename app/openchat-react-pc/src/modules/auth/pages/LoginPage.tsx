/**
 * 登录页面 - 完整版
 *
 * 职责：
 * 1. 用户登录表单（用户名+密码）
 * 2. 调用服务端登录API获取Token
 * 3. 将Token传递给SDK连接IM服务器
 * 4. 提供注册和忘记密码的链接
 */

import { useState, useCallback } from 'react';
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
  // 在开发环境下设置默认登录用户
  const isDev = import.meta.env.VITE_APP_ENV === 'development';
  const [username, setUsername] = useState(isDev ? 'test' : '');
  const [password, setPassword] = useState(isDev ? '123456' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 验证状态
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // 实时验证用户名
  const validateUsername = useCallback(() => {
    if (!username) {
      setValidationErrors((prev) => ({ ...prev, username: '请输入用户名' }));
    } else {
      setValidationErrors((prev) => ({ ...prev, username: undefined }));
    }
  }, [username]);

  // 实时验证密码
  const validatePassword = useCallback(() => {
    if (!password) {
      setValidationErrors((prev) => ({ ...prev, password: '请输入密码' }));
    } else {
      setValidationErrors((prev) => ({ ...prev, password: undefined }));
    }
  }, [password]);

  // 检查是否可以提交
  const canSubmit = useCallback(() => {
    return (
      username &&
      password &&
      !validationErrors.username &&
      !validationErrors.password &&
      !auth.isLoading
    );
  }, [username, password, validationErrors, auth.isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.clearError();

    // 验证输入
    validateUsername();
    validatePassword();

    if (!canSubmit()) {
      return;
    }

    await auth.login(username.trim(), password.trim());
  };

  const handleThirdPartyLogin = async (provider: string) => {
    try {
      auth.clearError();
      await auth.loginWithThirdParty(provider);
    } catch (error) {
      console.error('Third-party login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <svg className="w-8 sm:w-10 h-8 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">让沟通更简单</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-4 sm:p-6 shadow-[var(--shadow-lg)]">
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
                onChange={(e) => {
                  setUsername(e.target.value);
                  validateUsername();
                }}
                onBlur={validateUsername}
                placeholder="请输入用户名"
                className={`w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors ${
                  validationErrors.username
                    ? 'border-[var(--ai-error)]'
                    : username
                    ? 'border-[var(--ai-success)]'
                    : 'border-[var(--border-color)]'
                }`}
                disabled={auth.isLoading}
              />
              {validationErrors.username && (
                <p className="text-xs text-[var(--ai-error)] mt-1">{validationErrors.username}</p>
              )}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validatePassword();
                  }}
                  onBlur={validatePassword}
                  placeholder="请输入密码"
                  className={`w-full px-4 py-2.5 pr-12 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors ${
                    validationErrors.password
                      ? 'border-[var(--ai-error)]'
                      : password
                      ? 'border-[var(--ai-success)]'
                      : 'border-[var(--border-color)]'
                  }`}
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
              {validationErrors.password && (
                <p className="text-xs text-[var(--ai-error)] mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* 记住我和忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[var(--ai-primary)] focus:ring-[var(--ai-primary)] border-[var(--border-color)] rounded"
                />
                <span className="ml-2 text-sm text-[var(--text-secondary)]">记住我</span>
              </label>
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
              disabled={!canSubmit()}
              className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 ease-in-out flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-[var(--ai-primary)] focus:ring-opacity-50"
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

            {/* 分割线 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-color)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[var(--bg-secondary)] text-[var(--text-muted)]">其他登录方式</span>
              </div>
            </div>

            {/* 第三方登录 */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleThirdPartyLogin('wechat')}
                disabled={auth.isLoading}
                className="flex items-center justify-center py-2 px-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleThirdPartyLogin('github')}
                disabled={auth.isLoading}
                className="flex items-center justify-center py-2 px-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleThirdPartyLogin('google')}
                disabled={auth.isLoading}
                className="flex items-center justify-center py-2 px-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.057 10.057 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </button>
            </div>
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
