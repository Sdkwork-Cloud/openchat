
import React, { ReactNode } from 'react';
import { ThemeProvider } from '../services/themeContext';
import { ChatStoreProvider } from '../services/store';
import { ErrorProvider } from '../core/error-handler';
import { I18nProvider } from '../core/i18n';

interface AppProviderProps {
  children: ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <I18nProvider defaultLocale="zh-CN">
      <ThemeProvider>
        <ErrorProvider>
          <ChatStoreProvider>
            {children}
          </ChatStoreProvider>
        </ErrorProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

export default AppProvider;
