import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

export type SupportedLanguage = 'zh-CN' | 'en-US';

export const supportedLanguages: SupportedLanguage[] = ['zh-CN', 'en-US'];
export const defaultLanguage: SupportedLanguage = 'zh-CN';

function detectSystemLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return defaultLanguage;
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function normalizeLanguage(value?: string | null): SupportedLanguage {
  return value === 'en-US' ? 'en-US' : 'zh-CN';
}

export function resolveInitialLanguage(): SupportedLanguage {
  return detectSystemLanguage();
}

let ensureI18nPromise: Promise<typeof i18n> | null = null;

export function ensureI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return Promise.resolve(i18n);
  }

  if (!ensureI18nPromise) {
    ensureI18nPromise = i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {
          'zh-CN': {
            translation: zhCN,
          },
          'en-US': {
            translation: enUS,
          },
        },
        lng: resolveInitialLanguage(),
        fallbackLng: defaultLanguage,
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      })
      .then(() => i18n);
  }

  return ensureI18nPromise;
}

export { i18n };
