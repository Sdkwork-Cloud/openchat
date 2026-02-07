
import React, { ReactNode } from 'react';
import { ChatStoreProvider } from '../services/store';
import { ThemeProvider } from '../services/themeContext';

interface AppProviderProps {
  children: ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <ChatStoreProvider>
        {children}
      </ChatStoreProvider>
    </ThemeProvider>
  );
};

export default AppProvider;
