import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootstrapShellRuntime } from '@openchat/opencat-admin-shell';
import App from './App';

async function mountApp() {
  await bootstrapShellRuntime();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void mountApp();
