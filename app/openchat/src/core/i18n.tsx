/**
 * 国际化(i18n)系统
 * 支持多语言、动态切换、RTL
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Locale = 'zh-CN' | 'en-US' | 'ja-JP' | 'zh-TW';

export interface Translations {
  [key: string]: string | Translations;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  format: (value: any, style?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
}

const translations: Record<Locale, Translations> = {
  'zh-CN': {
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      search: '搜索',
      noData: '暂无数据',
      retry: '重试',
    },
    chat: {
      placeholder: '发送消息...',
      send: '发送',
      recall: '撤回',
      delete: '删除',
      forward: '转发',
    },
    auth: {
      login: '登录',
      logout: '退出登录',
      username: '用户名',
      password: '密码',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
    },
    tabs: {
      home: '首页',
      agents: '智能体',
      creation: '创作',
      discover: '发现',
      me: '我的',
    },
  },
  'en-US': {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      noData: 'No data',
      retry: 'Retry',
    },
    chat: {
      placeholder: 'Send message...',
      send: 'Send',
      recall: 'Recall',
      delete: 'Delete',
      forward: 'Forward',
    },
    auth: {
      login: 'Login',
      logout: 'Logout',
      username: 'Username',
      password: 'Password',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
    },
    tabs: {
      home: 'Home',
      agents: 'Agents',
      creation: 'Create',
      discover: 'Discover',
      me: 'Me',
    },
  },
  'ja-JP': {
    common: {
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      confirm: '確認',
      cancel: 'キャンセル',
      save: '保存',
      delete: '削除',
      edit: '編集',
      search: '検索',
      noData: 'データなし',
      retry: '再試行',
    },
    chat: {
      placeholder: 'メッセージを入力...',
      send: '送信',
      recall: '撤回',
      delete: '削除',
      forward: '転送',
    },
    auth: {
      login: 'ログイン',
      logout: 'ログアウト',
      username: 'ユーザー名',
      password: 'パスワード',
      loginSuccess: 'ログイン成功',
      loginFailed: 'ログイン失敗',
    },
    tabs: {
      home: 'ホーム',
      agents: 'エージェント',
      creation: '作成',
      discover: '発見',
      me: 'マイ',
    },
  },
  'zh-TW': {
    common: {
      loading: '載入中...',
      error: '錯誤',
      success: '成功',
      confirm: '確認',
      cancel: '取消',
      save: '儲存',
      delete: '刪除',
      edit: '編輯',
      search: '搜尋',
      noData: '暫無資料',
      retry: '重試',
    },
    chat: {
      placeholder: '發送訊息...',
      send: '發送',
      recall: '撤回',
      delete: '刪除',
      forward: '轉發',
    },
    auth: {
      login: '登入',
      logout: '登出',
      username: '使用者名稱',
      password: '密碼',
      loginSuccess: '登入成功',
      loginFailed: '登入失敗',
    },
    tabs: {
      home: '首頁',
      agents: '智慧體',
      creation: '創作',
      discover: '探索',
      me: '我的',
    },
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ 
  children, 
  defaultLocale = 'zh-CN' 
}) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale') as Locale;
    return stored && translations[stored] ? stored : defaultLocale;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale.startsWith('zh') || newLocale.startsWith('ja') 
      ? 'ltr' 
      : 'ltr';
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(`{${paramKey}}`, String(paramValue)),
        value
      );
    }

    return value;
  }, [locale]);

  const format = useCallback((value: any, style?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale, style).format(value);
  }, [locale]);

  const formatDate = useCallback((
    value: Date | number | string, 
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const date = new Date(value);
    return new Intl.DateTimeFormat(locale, options).format(date);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, format, formatDate }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { t, locale } = useI18n();
  return { t, locale };
};

export const SUPPORTED_LOCALES: { code: Locale; name: string; nativeName: string }[] = [
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
];
