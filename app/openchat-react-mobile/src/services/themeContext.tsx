
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsService } from '../modules/settings/services/SettingsService';

export type ThemeType = 'light' | 'dark' | 'wechat-dark' | 'midnight-blue';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('wechat-dark');
  const [fontSize, setFontSizeState] = useState<number>(16);

  // Initialize from SettingsService
  useEffect(() => {
    const init = async () => {
        const { data } = await SettingsService.getConfig();
        if (data) {
            setThemeState(data.theme);
            if (data.fontSize) setFontSizeState(data.fontSize);
        }
    };
    init();
  }, []);

  useEffect(() => {
    // Apply theme to HTML root
    document.documentElement.setAttribute('data-theme', theme);
    // Persist theme
    SettingsService.updateConfig({ theme });
    
    // Update Meta Theme Color
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
        const colorMap: Record<ThemeType, string> = {
            'light': '#ededed',
            'dark': '#000000',
            'wechat-dark': '#111111',
            'midnight-blue': '#0d1117'
        };
        metaThemeColor.setAttribute('content', colorMap[theme] || '#ffffff');
    }
  }, [theme]);

  useEffect(() => {
      // Apply Font Size CSS Variable
      document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);
      // Persist font size
      SettingsService.updateConfig({ fontSize });
  }, [fontSize]);

  const setTheme = (newTheme: ThemeType) => setThemeState(newTheme);
  const setFontSize = (newSize: number) => setFontSizeState(newSize);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
