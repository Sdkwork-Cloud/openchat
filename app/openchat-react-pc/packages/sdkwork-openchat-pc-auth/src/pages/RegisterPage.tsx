import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AuthResultService } from "../services";
import type { UseAuthReturn } from "../hooks/useAuth";

interface RegisterPageProps {
  auth: UseAuthReturn;
  onSwitchToLogin: () => void;
}

function isPhoneTarget(target: string): boolean {
  return /^1[3-9]\d{9}$/.test(target);
}

function isEmailTarget(target: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(target);
}

function buildUsername(target: string): string {
  if (isPhoneTarget(target)) {
    return target;
  }

  const [prefix] = target.split("@");
  const normalized = prefix.replace(/[^a-zA-Z0-9_-]/g, "").trim();
  return normalized || `user${Date.now()}`;
}

function buildNickname(target: string): string {
  if (isPhoneTarget(target)) {
    return `user-${target.slice(-4)}`;
  }

  const [prefix] = target.split("@");
  return prefix || `user-${Date.now()}`;
}

export function RegisterPage({ auth, onSwitchToLogin }: RegisterPageProps) {
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const canSendCode = useMemo(() => {
    const normalizedTarget = target.trim();
    return (
      normalizedTarget.length > 0 &&
      (isPhoneTarget(normalizedTarget) || isEmailTarget(normalizedTarget)) &&
      countdown === 0 &&
      !submitting &&
      !auth.isLoading
    );
  }, [auth.isLoading, countdown, submitting, target]);

  const canSubmit = useMemo(() => {
    return (
      target.trim().length > 0 &&
      code.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      !submitting &&
      !auth.isLoading
    );
  }, [auth.isLoading, code, confirmPassword, password, submitting, target]);

  const clearFeedback = () => {
    auth.clearError();
    setError(null);
    setSuccessMessage(null);
  };

  const startCountdown = () => {
    setCountdown(60);

    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    const normalizedTarget = target.trim();
    clearFeedback();

    if (!isPhoneTarget(normalizedTarget) && !isEmailTarget(normalizedTarget)) {
      setError("Please enter a valid phone number or email address.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await AuthResultService.sendVerificationCode(
        isPhoneTarget(normalizedTarget) ? undefined : normalizedTarget,
        isPhoneTarget(normalizedTarget) ? normalizedTarget : undefined,
        "register",
      );

      if (!result.success) {
        setError(result.error || "Failed to send verification code.");
        return;
      }

      startCountdown();
      setSuccessMessage(result.message || "Verification code sent.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!canSubmit) {
      return;
    }

    const normalizedTarget = target.trim();
    if (!isPhoneTarget(normalizedTarget) && !isEmailTarget(normalizedTarget)) {
      setError("Please enter a valid phone number or email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const username = buildUsername(normalizedTarget);
    const nickname = buildNickname(normalizedTarget);

    setSubmitting(true);
    try {
      const registerResult = isPhoneTarget(normalizedTarget)
        ? await AuthResultService.phoneRegister({
            phone: normalizedTarget,
            code: code.trim(),
            username,
            password: password.trim(),
            nickname,
          })
        : await AuthResultService.emailRegister({
            email: normalizedTarget,
            code: code.trim(),
            username,
            password: password.trim(),
            nickname,
          });

      if (!registerResult.success) {
        setError(registerResult.error || "Registration failed.");
        return;
      }

      const loginOk = await auth.login(username, password.trim());
      if (!loginOk) {
        setError(auth.error || "Registration succeeded but login sync failed.");
        return;
      }

      setSuccessMessage("Registration successful.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto mb-4 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <svg className="w-8 sm:w-10 h-8 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">OpenChat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Create account</p>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-4 sm:p-6 shadow-[var(--shadow-lg)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Register</h2>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Phone or Email
              </label>
              <input
                type="text"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="Phone number or email"
                className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                disabled={submitting || auth.isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Verification Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Code"
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={submitting || auth.isLoading}
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSendCode();
                  }}
                  disabled={!canSendCode}
                  className="px-4 py-2.5 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  {countdown > 0 ? `${countdown}s` : "Send Code"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-2.5 pr-12 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={submitting || auth.isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  onClick={() => setShowPassword((value) => !value)}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-2.5 pr-12 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-primary)]"
                  disabled={submitting || auth.isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {(error || auth.error) && (
              <div className="p-3 bg-[var(--ai-error-soft)] border border-[var(--ai-error)]/20 rounded-xl">
                <p className="text-sm text-[var(--ai-error)]">{error || auth.error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-[var(--ai-success-soft)] border border-[var(--ai-success)]/20 rounded-xl">
                <p className="text-sm text-[var(--ai-success)]">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {submitting || auth.isLoading ? "Registering..." : "Register"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Already have an account?
              <button
                onClick={onSwitchToLogin}
                className="ml-1 text-[var(--ai-primary)] hover:underline focus:outline-none"
              >
                Login now
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
