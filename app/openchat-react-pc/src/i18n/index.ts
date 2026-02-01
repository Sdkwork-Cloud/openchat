/**
 * 国际化配置
 *
 * 职责：配置 react-i18next，支持多语言切换
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言资源
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// 语言资源
const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

// 初始化 i18n
i18n
  // 检测用户语言
  .use(LanguageDetector)
  // 绑定 react-i18next
  .use(initReactI18next)
  // 初始化配置
  .init({
    resources,
    fallbackLng: 'zh-CN',
    debug: import.meta.env.MODE === 'development',

    interpolation: {
      escapeValue: false, // React 已经处理了 XSS 防护
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
