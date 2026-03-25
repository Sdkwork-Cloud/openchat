import { Monitor, MonitorCog, MoonStar, SunMedium } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppStore, useAuthStore } from '@openchat/opencat-admin-core';
import { Button, classNames } from '@openchat/opencat-admin-ui';
import { resolveRouteMeta } from '../application/router/navigation';

export function AppHeader() {
  const location = useLocation();
  const routeMeta = resolveRouteMeta(location.pathname);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  return (
    <header className="app-header-surface">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="page-eyebrow">Operations Shell</p>
          <h2 className="app-header-title">
            {routeMeta?.label || 'OpenChat Super Admin'}
          </h2>
          <p className="app-header-description">
            {routeMeta?.description || 'Centralized control plane for the OpenChat estate.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="topbar-chip">
            <span className="topbar-chip-dot" />
            Live backend mode
          </div>
          <div className="topbar-chip">Auth: /im/v3/auth</div>
          <div className="topbar-chip">Admin SDK: composed</div>
          {user ? (
            <div className="topbar-chip">
              <MonitorCog className="h-4 w-4" />
              {user.displayName}
            </div>
          ) : null}

          <div className="mode-switch">
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={classNames(
                'mode-switch-button',
                themeMode === 'light' ? 'mode-switch-button-active' : 'mode-switch-button-idle',
              )}
              title="Light mode"
            >
              <SunMedium className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              className={classNames(
                'mode-switch-button',
                themeMode === 'system' ? 'mode-switch-button-active' : 'mode-switch-button-idle',
              )}
              title="System mode"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={classNames(
                'mode-switch-button',
                themeMode === 'dark' ? 'mode-switch-button-active' : 'mode-switch-button-idle',
              )}
              title="Dark mode"
            >
              <MoonStar className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="muted"
            onClick={() => {
              void signOut();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>
    </header>
  );
}
