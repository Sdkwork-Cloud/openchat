import { useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAppStore, useAuthStore } from '@openchat/opencat-admin-core';
import { ensureI18n, i18n } from '@openchat/opencat-admin-i18n';
import '../../styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ThemeManager() {
  const themeMode = useAppStore((state) => state.themeMode);
  const themeColor = useAppStore((state) => state.themeColor);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeColor;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
      const isDark = themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
      root.classList.toggle('dark', isDark);
    };

    syncTheme();
    mediaQuery.addEventListener('change', syncTheme);

    return () => {
      mediaQuery.removeEventListener('change', syncTheme);
    };
  }, [themeColor, themeMode]);

  return null;
}

function LanguageManager() {
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    void ensureI18n().then(() => {
      if (i18n.language !== language) {
        return i18n.changeLanguage(language);
      }

      return undefined;
    });
  }, [language]);

  return null;
}

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const themeMode = useAppStore((state) => state.themeMode);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const bootstrapStartedRef = useRef(false);

  useEffect(() => {
    void ensureI18n();
  }, []);

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }

    bootstrapStartedRef.current = true;
    void bootstrap();
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <LanguageManager />
      <Router>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          theme={themeMode === 'system' ? 'system' : themeMode}
        />
      </Router>
    </QueryClientProvider>
  );
}
