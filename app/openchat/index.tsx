
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/app/App';
import './src/mobile/styles/mobile-theme.css';
import './src/mobile/styles/safe-area.css';
import './src/styles/global.css';

// Initialize the application
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
