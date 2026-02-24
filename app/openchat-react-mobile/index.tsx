
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/app/App';
import { PlatformManager } from './src/platform';
import { WebPlatform } from './src/platform-impl/web';
import './src/mobile/styles/mobile-theme.css';
import './src/mobile/styles/safe-area.css';
import './src/styles/global.css';
import './src/styles/animations.css';

// 1. Register Platform Strategy (Default to Web)
PlatformManager.setInstance(new WebPlatform());

// 2. Initialize the application
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
