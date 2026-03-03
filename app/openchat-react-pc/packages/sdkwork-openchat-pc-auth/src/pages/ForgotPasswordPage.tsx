/**
 * 忘记密码页面 - 完整版
 *
 * 职责：
 * 1. 忘记密码表单（用户名）
 * 2. 调用服务端忘记密码API
 * 3. 显示密码重置链接发送成功提示
 * 4. 提供返回登录的按钮
 */

import { useState } from 'react';
import type { UseAuthReturn } from '../hooks/useAuth';

interface ForgotPasswordPageProps {
  auth: UseAuthReturn;
  onSwitchToLogin: () => void;
}

/**
 * 忘记密码页面
 */
export function ForgotPasswordPage({ auth, onSwitchToLogin }: ForgotPasswordPageProps) {
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((recoveryMethod === 'email' && !email.trim()) || (recoveryMethod === 'phone' && !phone.trim())) {
      return;
    }

    // 调用忘记密码服务
    const success = await auth.forgotPassword(
      recoveryMethod === 'email' ? email.trim() : undefined,
      recoveryMethod === 'phone' ? phone.trim() : undefined
    );
    
    if (success) {
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          </div>

          {/* 成功提示 */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-8 shadow-[var(--shadow-lg)] text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--ai-success-soft)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--ai-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              {recoveryMethod === 'email' ? '密码重置邮件已发送' : '密码重置验证码已发送'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {recoveryMethod === 'email' 
                ? '我们已向您的邮箱发送了密码重置链接，请查收邮件并按照提示操作。' 
                : '我们已向您的手机号发送了密码重置验证码，请查收短信并按照提示操作。'}
            </p>
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                ⏰ 链接将在24小时后失效
              </p>
              {recoveryMethod === 'email' ? (
                <p className="text-xs text-[var(--text-muted)]">
                  📧 如果没有收到邮件，请检查垃圾邮件文件夹
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  📱 如果没有收到短信，请检查手机号是否正确
                </p>
              )}
            </div>
            <button
              onClick={onSwitchToLogin}
              className="mt-8 px-6 py-2.5 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
            >
              返回登录
            </button>
          </div>

          {/* 版权信息 */}
          <p className="text-center text-xs text-[var(--text-muted)] mt-8">
            © 2024 OpenChat Team
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">找回密码</p>
        </div>

        {/* 忘记密码表单 */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6 shadow-[var(--shadow-lg)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">忘记密码？</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 找回方式选择 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                找回方式
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="recoveryMethod"
                    value="email"
                    checked={recoveryMethod === 'email'}
                    onChange={() => setRecoveryMethod('email')}
                    className="h-4 w-4 text-[var(--ai-primary)] focus:ring-[var(--ai-primary)] border-[var(--border-color)]"
                    disabled={auth.isLoading}
                  />
                  <span className="ml-2 text-sm text-[var(--text-secondary)]">邮箱</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="recoveryMethod"
                    value="phone"
                    checked={recoveryMethod === 'phone'}
                    onChange={() => setRecoveryMethod('phone')}
                    className="h-4 w-4 text-[var(--ai-primary)] focus:ring-[var(--ai-primary)] border-[var(--border-color)]"
                    disabled={auth.isLoading}
                  />
                  <span className="ml-2 text-sm text-[var(--text-secondary)]">手机号</span>
                </label>
              </div>
            </div>

            {/* 邮箱输入 */}
            {recoveryMethod === 'email' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入您的邮箱地址"
                  className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                  disabled={auth.isLoading}
                />
              </div>
            )}

            {/* 手机号输入 */}
            {recoveryMethod === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入您的手机号"
                  className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] transition-colors"
                  disabled={auth.isLoading}
                />
              </div>
            )}

            {/* 说明 */}
            <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl">
              <p className="text-xs text-[var(--text-secondary)]">
                {recoveryMethod === 'email' 
                  ? '请输入您的邮箱，我们将向您的邮箱发送密码重置链接。' 
                  : '请输入您的手机号，我们将向您的手机号发送密码重置验证码。'}
              </p>
            </div>

            {/* 错误提示 */}
            {auth.error && (
              <div className="p-3 bg-[var(--ai-error-soft)] border border-[var(--ai-error)]/20 rounded-xl">
                <p className="text-sm text-[var(--ai-error)]">{auth.error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={((recoveryMethod === 'email' && !email.trim()) || (recoveryMethod === 'phone' && !phone.trim())) || auth.isLoading}
              className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center"
            >
              {auth.isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  发送中...
                </>
              ) : (
                recoveryMethod === 'email' ? '发送重置链接' : '发送验证码'
              )}
            </button>
          </form>

          {/* 切换到登录 */}
          <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              想起密码了？
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

export default ForgotPasswordPage;
