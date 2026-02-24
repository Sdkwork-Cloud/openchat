
import React, { useEffect, useState } from 'react';
import AppProvider from './AppProvider';
import { Router } from '../router';
import { Platform } from '../platform';
import { InitToast } from '../components/Toast';
import { InitImageViewer } from '../components/ImageViewer/ImageViewer';
import { InitDialog } from '../components/Dialog';
import { InitActionSheet } from '../components/ActionSheet';
import { DynamicIsland } from '../components/DynamicIsland/DynamicIsland';
import { NetworkStatus } from '../components/NetworkStatus/NetworkStatus';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useTheme } from '../services/themeContext';
import { SplashScreen } from '../components/SplashScreen/SplashScreen';

// Helper component to observe theme and update status bar
const StatusBarManager = () => {
    const { theme } = useTheme();
    
    useEffect(() => {
        // Sync Native Status Bar Style
        const isDark = theme !== 'light';
        // For Web PWA:
        const metaThemeColor = document.querySelector("meta[name=theme-color]");
        if (metaThemeColor) {
            const colorMap: Record<string, string> = {
                'light': '#ededed',
                'dark': '#000000',
                'wechat-dark': '#111111',
                'midnight-blue': '#0d1117'
            };
            metaThemeColor.setAttribute('content', colorMap[theme] || '#ffffff');
        }
    }, [theme]);

    return null;
};

const App: React.FC = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // 1. Initialize Platform (Environment detection, capabilities)
      await Platform.initialize();
      
      // 2. Artificial delay for branding splash (optional, keep it snappy)
      await new Promise(r => setTimeout(r, 800));
      
      console.log(`Running on platform: ${Platform.type}`);
      setInitialized(true);
    };

    initApp();
  }, []);

  if (!initialized) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBarManager />
        <NetworkStatus />
        <DynamicIsland />
        <InitToast />
        <InitDialog />
        <InitActionSheet />
        <InitImageViewer />
        <Router />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
