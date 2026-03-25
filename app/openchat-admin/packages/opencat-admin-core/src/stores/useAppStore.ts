import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LanguagePreference,
  SupportedLanguage,
  ThemeColor,
  ThemeMode,
} from '@openchat/opencat-admin-types';

interface AppState {
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  language: SupportedLanguage;
  languagePreference: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
}

interface PersistedAppState {
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  themeMode: ThemeMode;
  themeColor: ThemeColor;
  language: SupportedLanguage;
  languagePreference: LanguagePreference;
}

function clampSidebarWidth(width: number) {
  return Math.max(220, Math.min(360, width));
}

function resolveSystemLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return 'zh-CN';
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

function normalizeLanguagePreference(value?: string | null): LanguagePreference {
  if (value === 'system') {
    return 'system';
  }

  return value === 'en-US' ? 'en-US' : 'zh-CN';
}

function resolveLanguage(preference: LanguagePreference): SupportedLanguage {
  return preference === 'system' ? resolveSystemLanguage() : preference;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      sidebarWidth: 272,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth: clampSidebarWidth(sidebarWidth) }),
      themeMode: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),
      themeColor: 'green-tech',
      setThemeColor: (themeColor) => set({ themeColor }),
      languagePreference: 'system',
      language: resolveSystemLanguage(),
      setLanguage: (languagePreference) => {
        const nextPreference = normalizeLanguagePreference(languagePreference);
        set({
          languagePreference: nextPreference,
          language: resolveLanguage(nextPreference),
        });
      },
    }),
    {
      name: 'opencat-admin-app-storage',
      partialize: (state): PersistedAppState => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        themeMode: state.themeMode,
        themeColor: state.themeColor,
        language: state.language,
        languagePreference: state.languagePreference,
      }),
      merge: (persistedState, currentState) => {
        const nextState = (persistedState as Partial<PersistedAppState>) || {};
        const languagePreference = normalizeLanguagePreference(
          nextState.languagePreference ?? nextState.language ?? 'system',
        );

        return {
          ...currentState,
          ...nextState,
          sidebarWidth: clampSidebarWidth(nextState.sidebarWidth ?? currentState.sidebarWidth),
          languagePreference,
          language: resolveLanguage(languagePreference),
        };
      },
    },
  ),
);
