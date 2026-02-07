
import React, { useEffect, useState } from 'react';
import AppProvider from './AppProvider';
import { Router } from '../router';
import { Platform } from '../platform';
import { InitToast } from '../components/Toast';
import { InitImageViewer } from '../components/ImageViewer/ImageViewer';
import { ErrorBoundary } from '../components/ErrorBoundary';

const App: React.FC = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // 1. Initialize Platform (Environment detection, capabilities)
      await Platform.initialize();
      
      // 2. Mobile specific setup (Status bar, Splash screen logic would go here)
      console.log(`Running on platform: ${Platform.type}`);
      
      setInitialized(true);
    };

    initApp();
  }, []);

  if (!initialized) {
    // Return a splash screen or null while platform initializes
    return <div style={{ height: '100vh', width: '100vw', background: 'var(--bg-body)' }} />;
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <InitToast />
        <InitImageViewer />
        <Router />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
