import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@openchat/opencat-admin-core';
import { Button, Input, Label } from '@openchat/opencat-admin-ui';

function resolveRedirectTarget(rawTarget: string | null) {
  if (!rawTarget || !rawTarget.startsWith('/')) {
    return '/overview';
  }

  if (rawTarget === '/login') {
    return '/overview';
  }

  return rawTarget;
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = resolveRedirectTarget(searchParams.get('redirect'));
  const {
    isAuthenticated,
    isSubmitting,
    error,
    clearError,
    signIn,
  } = useAuthStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  if (isAuthenticated) {
    return <Navigate to={redirectTarget} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password.trim()) {
      setLocalError('Username and password are required.');
      return;
    }

    try {
      await signIn({
        username: username.trim(),
        password,
      });
      navigate(redirectTarget, { replace: true });
    } catch {
      // Error state is owned by the auth store.
    }
  }

  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="auth-card relative z-10 flex w-full max-w-6xl flex-col overflow-hidden lg:flex-row">
        <section className="auth-hero relative flex w-full flex-col justify-between overflow-hidden p-8 lg:w-[44%] lg:p-10">
          <div className="auth-hero-orb absolute inset-0" />
          <div className="relative z-10">
            <p className="page-eyebrow text-primary-200">OpenChat Control Plane</p>
            <h1 className="auth-hero-title">
              Super Admin
            </h1>
            <p className="auth-hero-copy">
              Centralized operations for users, groups, friendships, messages, RTC providers,
              IoT devices, WuKongIM control-plane and runtime configuration.
            </p>
          </div>

          <div className="relative z-10 mt-8 grid gap-4">
            <div className="auth-note rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <div className="auth-note-icon">
                  <ShieldCheck className="h-5 w-5 text-primary-200" />
                </div>
                <div>
                  <p className="auth-note-title">Strict Admin Validation</p>
                  <p className="auth-note-copy">
                    Login succeeds only if the account session and persisted roles both validate.
                  </p>
                </div>
              </div>
            </div>

            <div className="auth-note rounded-3xl p-5">
              <p className="auth-note-kicker">
                Boundaries
              </p>
              <p className="auth-note-copy">
                Auth bootstrap uses the composed admin SDK and the app auth bridge.
                Control-plane operations remain on the admin contract only.
              </p>
            </div>
          </div>
        </section>

        <section className="auth-form-panel w-full p-8 lg:w-[56%] lg:p-12">
          <div className="mx-auto max-w-lg">
            <div>
              <p className="page-eyebrow">Sign In</p>
              <h2 className="auth-form-title">
                Connect to the admin shell
              </h2>
              <p className="auth-form-copy">
                Use a live operator account with the persisted `admin` role. Redirect handling
                is preserved after successful authentication.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <Label className="auth-label">
                  Username
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <UserRound className="auth-input-icon h-5 w-5" />
                  </div>
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="admin"
                    className="py-3 pl-12 pr-4"
                  />
                </div>
              </div>

              <div>
                <Label className="auth-label">
                  Password
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="auth-input-icon h-5 w-5" />
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your admin password"
                    className="py-3 pl-12 pr-4"
                  />
                </div>
              </div>

              {localError || error ? (
                <div className="auth-error rounded-2xl px-4 py-3 text-sm">
                  {localError || error}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-auto w-full py-3 text-base font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Authenticating...' : 'Enter Super Admin'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
