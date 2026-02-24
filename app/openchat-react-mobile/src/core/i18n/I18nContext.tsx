
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SettingsService } from '../../modules/settings/services/SettingsService';
import { resources } from './resources';
import { Locale, I18nContextType } from './types';

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('zh-CN');

  // Load locale from settings on boot
  useEffect(() => {
    const init = async () => {
        const { data } = await SettingsService.getConfig();
        if (data && data.language) {
            setLocaleState(data.language);
        }
    };
    init();
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    await SettingsService.updateConfig({ language: newLocale });
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = resources[locale];
    
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            return key; // Fallback to key if not found
        }
    }

    if (typeof value !== 'string') return key;

    if (params) {
        return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
    }

    return value;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
};
