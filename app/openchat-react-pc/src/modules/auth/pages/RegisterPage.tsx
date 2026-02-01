/**
 * 注册页面 - 完整版
 *
 * 职责：
 * 1. 用户注册表单（用户名、密码、确认密码、昵称）
 * 2. 实时密码强度验证
 * 3. 实时用户名验证
 * 4. 实时昵称验证
 * 5. 调用服务端注册API创建用户
 * 6. 注册成功后自动登录
 */

import { useState, useCallback } from 'react';
import type { RegisterRequest } from '../entities/auth.entity';
import type { UseAuthReturn } from '../hooks/useAuth';

interface RegisterPageProps {
  auth: UseAuthReturn;
  onSwitchToLogin: () => void;
}

/**
 * 注册页面
 */
export function RegisterPage({ auth, onSwitchToLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 实时验证状态
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
    nickname?: string;
  }>({});

  // 实时验证用户名
  const validateUsername = useCallback(() => {
    const result = auth.checkUsername(username);
    setValidationErrors((prev) => ({
      ...prev,
      username: result.isValid ? undefined : result.error,
    }));
  }, [username, auth]);

  // 实时验证密码强度
  const validatePassword = useCallback(() => {
    const result = auth.checkPasswordStrength(password);
    setValidationErrors((prev) => ({
      ...prev,
      password: result.isValid ? undefined : result.errors[0],
    }));
  }, [password, auth]);

  // 实时验证确认密码
  const validateConfirmPassword = useCallback(() => {
    if (confirmPassword && password !== confirmPassword) {
      setValidationErrors((prev) => ({
        ...prev,
        confirmPassword: '两次输入的密码不一致',
      }));
    } else {
      setValidationErrors((prev) => ({
        ...prev,
        confirmPassword: undefined,
      }));
    }
  }, [confirmPassword, password]);

  // 实时验证昵称
  const validateNickname = useCallback(() => {
    const result = auth.checkNickname(nickname);
    setValidationErrors((prev) => ({
      ...prev,
      nickname: result.isValid ? undefined : result.error,
    }));
  }, [nickname, auth]);

  // 监听输入变化进行验证
  useState(() => {
    validateUsername();
    validatePassword();
    validateConfirmPassword();
    validateNickname();
  });

  // 检查是否可以提交
  const canSubmit = useCallback(() => {
    return (
      username &&
      password &&
      confirmPassword &&
      nickname &&
      !validationErrors.username &&
      !validationErrors.password &&
      !validationErrors.confirmPassword &&
      !validationErrors.nickname &&
      password === confirmPassword &&
      !auth.isLoading
    );
  }, [username, password, confirmPassword, nickname, validationErrors, auth.isLoading]);

  // 处理注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 再次验证
    validateUsername();
    validatePassword();
    validateConfirmPassword();
    validateNickname();

    if (!canSubmit()) {
      return;
    }

    const request: RegisterRequest = {
      username: username.trim(),
      password: password.trim(),
      confirmPassword: confirmPassword.trim(),
      nickname: nickname.trim(),
    };

    await auth.register(request);
  };

  // 密码强度指示器
  const getPasswordStrength = useCallback(() => {
    const strength = auth.checkPasswordStrength(password);
    const levels = ['非常弱', '弱', '中', '强', '非常强'];
    const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'];
    const widths = ['0%', '25%', '50%', '75%', '100%'];

    return {
      level: levels[strength.score],
      color: colors[strength.score],
      width: widths[strength.score],
      suggestions: strength.suggestions,
    };
  }, [password, auth]);

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 20v-7a4 4 0 00-4-4H6a4 4 0 00-4 4v7M14 14h2m-2 4h2m-6 0h2m2 0h2m-8 0h8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">创建新账户</p>
        </div>

        {/* 注册表单 */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6 shadow-[var(--shadow-lg)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">注册</h2>

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
                placeholder="请输入用户名（3-50个字符）"
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

            {/* 密码 */}
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
                    validateConfirmPassword();
                  }}
                  onBlur={validatePassword}
                  placeholder="请输入密码（至少8个字符）"
                  className={`w-full px-4 py-2.5 pr-12 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors ${
                    validationErrors.password
                      ? 'border-[var(--ai-error)]'
                      : password
                      ? 'border-[var(--ai-success)]'
                      : 'border-[var(--border-color)]'
                  }`}
                  disabled={auth.isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-xs text-[var(--ai-error)] mt-1">{validationErrors.password}</p>
              )}
              
              {/* 密码强度指示器 */}
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      密码强度: {passwordStrength.level}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300 ease-in-out`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                  {passwordStrength.suggestions.length > 0 && (
                    <div className="mt-1">
                      {passwordStrength.suggestions.map((suggestion, index) => (
                        <p key={index} className="text-xs text-[var(--text-muted)]">
                          💡 {suggestion}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                确认密码
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    validateConfirmPassword();
                  }}
                  onBlur={validateConfirmPassword}
                  placeholder="请再次输入密码"
                  className={`w-full px-4 py-2.5 pr-12 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors ${
                    validationErrors.confirmPassword
                      ? 'border-[var(--ai-error)]'
                      : confirmPassword && password === confirmPassword
                      ? 'border-[var(--ai-success)]'
                      : 'border-[var(--border-color)]'
                  }`}
                  disabled={auth.isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-xs text-[var(--ai-error)] mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* 昵称 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                昵称
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  validateNickname();
                }}
                onBlur={validateNickname}
                placeholder="请输入昵称"
                className={`w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors ${
                  validationErrors.nickname
                    ? 'border-[var(--ai-error)]'
                    : nickname
                    ? 'border-[var(--ai-success)]'
                    : 'border-[var(--border-color)]'
                }`}
                disabled={auth.isLoading}
              />
              {validationErrors.nickname && (
                <p className="text-xs text-[var(--ai-error)] mt-1">{validationErrors.nickname}</p>
              )}
            </div>

            {/* 错误提示 */}
            {auth.error && (
              <div className="p-3 bg-[var(--ai-error-soft)] border border-[var(--ai-error)]/20 rounded-xl">
                <p className="text-sm text-[var(--ai-error)]">{auth.error}</p>
              </div>
            )}

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={!canSubmit()}
              className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center"
            >
              {auth.isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </button>
          </form>

          {/* 切换到登录 */}
          <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              已有账户？
              <button
                onClick={onSwitchToLogin}
                className="ml-1 text-[var(--ai-primary)] hover:underline focus:outline-none"
              >
                立即登录
              </button>
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

export default RegisterPage;
