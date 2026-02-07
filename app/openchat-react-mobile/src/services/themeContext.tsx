
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsService } from '../modules/settings/services/SettingsService';

export type ThemeType = 'light' | 'dark' | 'wechat-dark' | 'midnight-blue';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('wechat-dark');

  // Initialize from SettingsService
  useEffect(() => {
    const init = async () => {
        const { data } = await SettingsService.getConfig();
        if (data) {
            setThemeState(data.theme);
        }
    };
    init();
  }, []);

  useEffect(() => {
    // 2. Apply theme to HTML root
    document.documentElement.setAttribute('data-theme', theme);
    
    // Persist changes
    SettingsService.updateConfig({ theme });
    
    // 3. Update Meta Theme Color for mobile status bars
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
        // Simple logic to map theme to status bar color
        const colorMap: Record<ThemeType, string> = {
            'light': '#ededed',
            'dark': '#000000',
            'wechat-dark': '#111111',
            'midnight-blue': '#0d1117'
        };
        metaThemeColor.setAttribute('content', colorMap[theme] || '#ffffff');
    }

  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
