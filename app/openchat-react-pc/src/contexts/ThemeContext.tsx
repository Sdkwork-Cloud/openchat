/**
 * 主题上下文
 * 
 * 职责：管理应用主题状态，支持多主题切换
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// 主题类型
export type ThemeType = 'dark' | 'light' | 'blue' | 'purple' | 'green';

// 主题配置接口
export interface ThemeConfig {
  name: string;
  type: ThemeType;
  colors: {
    // 主色调
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryDark: string;
    primarySoft: string;
    primaryMedium: string;
    // 背景色
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgElevated: string;
    // 文字色
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textMuted: string;
    // 边框
    borderColor: string;
    borderLight: string;
    borderMedium: string;
  };
}

// 主题配置集合
export const themes: Record<ThemeType, ThemeConfig> = {
  dark: {
    name: '深邃暗黑',
    type: 'dark',
    colors: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryLight: '#60A5FA',
      primaryDark: '#1D4ED8',
      primarySoft: 'rgba(59, 130, 246, 0.12)',
      primaryMedium: 'rgba(59, 130, 246, 0.25)',
      bgPrimary: '#000000',
      bgSecondary: '#0A0A0A',
      bgTertiary: '#141414',
      bgElevated: '#1C1C1C',
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E8E8',
      textTertiary: '#A0A0A0',
      textMuted: '#6B6B6B',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderLight: 'rgba(255, 255, 255, 0.04)',
      borderMedium: 'rgba(255, 255, 255, 0.12)',
    },
  },
  light: {
    name: '明亮清新',
    type: 'light',
    colors: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryLight: '#60A5FA',
      primaryDark: '#1D4ED8',
      primarySoft: 'rgba(59, 130, 246, 0.1)',
      primaryMedium: 'rgba(59, 130, 246, 0.2)',
      bgPrimary: '#FFFFFF',
      bgSecondary: '#F8FAFC',
      bgTertiary: '#F1F5F9',
      bgElevated: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textTertiary: '#64748B',
      textMuted: '#94A3B8',
      borderColor: 'rgba(0, 0, 0, 0.08)',
      borderLight: 'rgba(0, 0, 0, 0.04)',
      borderMedium: 'rgba(0, 0, 0, 0.12)',
    },
  },
  blue: {
    name: '深海蓝调',
    type: 'blue',
    colors: {
      primary: '#06B6D4',
      primaryHover: '#0891B2',
      primaryLight: '#22D3EE',
      primaryDark: '#0E7490',
      primarySoft: 'rgba(6, 182, 212, 0.12)',
      primaryMedium: 'rgba(6, 182, 212, 0.25)',
      bgPrimary: '#0C1E2A',
      bgSecondary: '#122B3D',
      bgTertiary: '#1A3A52',
      bgElevated: '#234868',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0F2FE',
      textTertiary: '#7DD3FC',
      textMuted: '#38BDF8',
      borderColor: 'rgba(125, 211, 252, 0.15)',
      borderLight: 'rgba(125, 211, 252, 0.08)',
      borderMedium: 'rgba(125, 211, 252, 0.2)',
    },
  },
  purple: {
    name: '紫韵神秘',
    type: 'purple',
    colors: {
      primary: '#8B5CF6',
      primaryHover: '#7C3AED',
      primaryLight: '#A78BFA',
      primaryDark: '#6D28D9',
      primarySoft: 'rgba(139, 92, 246, 0.12)',
      primaryMedium: 'rgba(139, 92, 246, 0.25)',
      bgPrimary: '#1A1425',
      bgSecondary: '#251B35',
      bgTertiary: '#35254A',
      bgElevated: '#452F5F',
      textPrimary: '#FFFFFF',
      textSecondary: '#F3E8FF',
      textTertiary: '#D8B4FE',
      textMuted: '#A855F7',
      borderColor: 'rgba(216, 180, 254, 0.15)',
      borderLight: 'rgba(216, 180, 254, 0.08)',
      borderMedium: 'rgba(216, 180, 254, 0.2)',
    },
  },
  green: {
    name: '极光森林',
    type: 'green',
    colors: {
      primary: '#10B981',
      primaryHover: '#059669',
      primaryLight: '#34D399',
      primaryDark: '#047857',
      primarySoft: 'rgba(16, 185, 129, 0.12)',
      primaryMedium: 'rgba(16, 185, 129, 0.25)',
      bgPrimary: '#0A1F15',
      bgSecondary: '#0F2E1F',
      bgTertiary: '#163D29',
      bgElevated: '#1D4C33',
      textPrimary: '#FFFFFF',
      textSecondary: '#D1FAE5',
      textTertiary: '#6EE7B7',
      textMuted: '#34D399',
      borderColor: 'rgba(110, 231, 183, 0.15)',
      borderLight: 'rgba(110, 231, 183, 0.08)',
      borderMedium: 'rgba(110, 231, 183, 0.2)',
    },
  },
};

// Context 接口
interface ThemeContextType {
  currentTheme: ThemeType;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 存储键
const THEME_STORAGE_KEY = 'app-theme';

// Provider 组件
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    // 从 localStorage 读取主题偏好
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType;
      return saved && themes[saved] ? saved : 'dark';
    }
    return 'dark';
  });

  const themeConfig = themes[currentTheme];
  const isDark = currentTheme === 'dark' || currentTheme === 'blue' || currentTheme === 'purple' || currentTheme === 'green';

  // 应用主题到 CSS 变量
  useEffect(() => {
    const root = document.documentElement;
    const { colors } = themeConfig;

    // 应用颜色变量
    root.style.setProperty('--ai-primary', colors.primary);
    root.style.setProperty('--ai-primary-hover', colors.primaryHover);
    root.style.setProperty('--ai-primary-light', colors.primaryLight);
    root.style.setProperty('--ai-primary-dark', colors.primaryDark);
    root.style.setProperty('--ai-primary-soft', colors.primarySoft);
    root.style.setProperty('--ai-primary-medium', colors.primaryMedium);

    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--bg-elevated', colors.bgElevated);

    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--text-tertiary', colors.textTertiary);
    root.style.setProperty('--text-muted', colors.textMuted);

    root.style.setProperty('--border-color', colors.borderColor);
    root.style.setProperty('--border-light', colors.borderLight);
    root.style.setProperty('--border-medium', colors.borderMedium);

    // 辅助色
    root.style.setProperty('--ai-success', '#22C55E');
    root.style.setProperty('--ai-warning', '#F59E0B');
    root.style.setProperty('--ai-error', '#EF4444');
    root.style.setProperty('--ai-purple', '#8B5CF6');
    root.style.setProperty('--ai-cyan', '#06B6D4');

    // 紫色主题专用
    root.style.setProperty('--ai-purple-hover', '#7C3AED');
    root.style.setProperty('--ai-purple-soft', 'rgba(139, 92, 246, 0.12)');

    // 背景交互状态
    root.style.setProperty('--bg-hover', isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)');

    // 阴影
    root.style.setProperty('--shadow-sm', isDark
      ? '0 1px 2px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4)'
      : '0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)');
    root.style.setProperty('--shadow-md', isDark
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.5)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--shadow-glow', `0 0 20px ${colors.primarySoft}`);

    // 设置 data-theme 属性用于 CSS 选择器
    root.setAttribute('data-theme', currentTheme);

    // 保存到 localStorage
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);

    console.log(`[Theme] Switched to ${themeConfig.name}`);
  }, [currentTheme, themeConfig]);

  const setTheme = useCallback((theme: ThemeType) => {
    if (themes[theme]) {
      setCurrentTheme(theme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setCurrentTheme((prev) => {
      const themeList = Object.keys(themes) as ThemeType[];
      const currentIndex = themeList.indexOf(prev);
      const nextIndex = (currentIndex + 1) % themeList.length;
      return themeList[nextIndex];
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeConfig,
        setTheme,
        toggleTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Hook
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
