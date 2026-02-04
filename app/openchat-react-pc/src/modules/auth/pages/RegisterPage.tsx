/**
 * 注册页面 - 简化版
 *
 * 职责：
 * 1. 用户注册表单（手机号/邮箱、验证码、密码）
 * 2. 调用服务端注册API创建用户
 * 3. 注册成功后自动登录
 */

import { useState, useCallback } from 'react';
import type { RegisterRequest } from '../entities/auth.entity';
import type { UseAuthReturn } from '../hooks/useAuth';
import { sendVerificationCode, phoneRegister, emailRegister } from '../services/auth.service';

interface RegisterPageProps {
  auth: UseAuthReturn;
  onSwitchToLogin: () => void;
}

/**
 * 注册页面
 */
export function RegisterPage({ auth, onSwitchToLogin }: RegisterPageProps) {
  const [target, setTarget] = useState(''); // 手机号或邮箱
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 验证状态
  const [validationErrors, setValidationErrors] = useState<{
    target?: string;
    code?: string;
    password?: string;
  }>({});

  // 验证目标（手机号或邮箱）
  const validateTarget = useCallback(() => {
    if (!target) {
      setValidationErrors((prev) => ({ ...prev, target: '请输入手机号或邮箱' }));
      return false;
    }

    // 检查是否是手机号
    const isPhone = /^1[3-9]\d{9}$/.test(target);
    // 检查是否是邮箱
    const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(target);

    if (!isPhone && !isEmail) {
      setValidationErrors((prev) => ({ ...prev, target: '请输入有效的手机号或邮箱' }));
      return false;
    }

    setValidationErrors((prev) => ({ ...prev, target: undefined }));
    return true;
  }, [target]);

  // 验证密码
  const validatePassword = useCallback(() => {
    if (!password) {
      setValidationErrors((prev) => ({ ...prev, password: '请输入密码' }));
      return false;
    }

    if (password.length < 6) {
      setValidationErrors((prev) => ({ ...prev, password: '密码长度至少6个字符' }));
      return false;
    }

    setValidationErrors((prev) => ({ ...prev, password: undefined }));
    return true;
  }, [password]);

  // 检查是否可以提交
  const canSubmit = useCallback(() => {
    return (
      target &&
      code &&
      password &&
      !validationErrors.target &&
      !validationErrors.code &&
      !validationErrors.password &&
      !auth.isLoading
    );
  }, [target, code, password, validationErrors, auth.isLoading]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!validateTarget()) {
      return;
    }

    // 检查是手机号还是邮箱
    const isPhone = /^1[3-9]\d{9}$/.test(target);

    try {
      // 调用发送验证码的API
      const result = await sendVerificationCode(
        isPhone ? undefined : target,
        isPhone ? target : undefined,
        'register'
      );

      if (result.success) {
        // 开始倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // 显示成功提示
        alert('验证码已发送，请查收');
      } else {
        // 显示错误提示
        setValidationErrors((prev) => ({
          ...prev,
          code: result.error || '发送验证码失败',
        }));
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      setValidationErrors((prev) => ({
        ...prev,
        code: '发送验证码失败，请稍后重试',
      }));
    }
  };

  // 处理注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 再次验证
    if (!validateTarget() || !validatePassword()) {
      return;
    }

    if (!canSubmit()) {
      return;
    }

    // 检查是手机号还是邮箱
    const isPhone = /^1[3-9]\d{9}$/.test(target);

    try {
      // 准备注册数据
      const registerData = {
        username: isPhone ? target : target.split('@')[0], // 使用手机号或邮箱前缀作为用户名
        password: password.trim(),
        nickname: isPhone ? `用户${target.slice(-4)}` : target.split('@')[0], // 自动生成昵称
        code: code.trim(),
      };

      // 根据类型调用对应的API
      let result;
      if (isPhone) {
        result = await phoneRegister({
          ...registerData,
          phone: target.trim(),
        });
      } else {
        result = await emailRegister({
          ...registerData,
          email: target.trim(),
        });
      }

      if (result.success) {
        // 注册成功，自动登录已在API中完成
        alert('注册成功！');
      } else {
        // 显示注册错误
        setValidationErrors((prev) => ({
          ...prev,
          code: result.error || '注册失败',
        }));
      }
    } catch (error) {
      console.error('注册失败:', error);
      setValidationErrors((prev) => ({
        ...prev,
        code: '注册失败，请稍后重试',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <svg className="w-8 sm:w-10 h-8 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 20v-7a4 4 0 00-4-4H6a4 4 0 00-4 4v7M14 14h2m-2 4h2m-6 0h2m2 0h2m-8 0h8" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">创建新账户</p>
        </div>

        {/* 注册表单 */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-4 sm:p-6 shadow-[var(--shadow-lg)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">注册</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 手机号或邮箱 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                手机号或邮箱
              </label>
              <input
                type="text"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                }}
                onBlur={validateTarget}
                placeholder="请输入手机号或邮箱"
                className={`w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors ${
                  validationErrors.target
                    ? 'border-[var(--ai-error)]'
                    : target
                    ? 'border-[var(--ai-success)]'
                    : 'border-[var(--border-color)]'
                }`}
                disabled={auth.isLoading}
              />
              {validationErrors.target && (
                <p className="text-xs text-[var(--ai-error)] mt-1">{validationErrors.target}</p>
              )}
            </div>

            {/* 验证码 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                验证码
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入验证码"
                  className={`flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors ${
                    validationErrors.code
                      ? 'border-[var(--ai-error)]'
                      : code
                      ? 'border-[var(--ai-success)]'
                      : 'border-[var(--border-color)]'
                  }`}
                  disabled={auth.isLoading}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || auth.isLoading || !target}
                  className="px-4 py-2.5 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                >
                  {countdown > 0 ? `${countdown}s后重发` : '发送验证码'}
                </button>
              </div>
              {validationErrors.code && (
                <p className="text-xs text-[var(--ai-error)] mt-1">{validationErrors.code}</p>
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
                  }}
                  onBlur={validatePassword}
                  placeholder="请输入密码（至少6个字符）"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
              className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 ease-in-out flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-[var(--ai-primary)] focus:ring-opacity-50"
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