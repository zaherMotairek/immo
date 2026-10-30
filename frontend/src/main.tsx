import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { applyTheme, getStoredTheme } from './theme';
import { bootstrapDesignPreview } from './theme/designPreview';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import './index.css';
/** Capture `beforeinstallprompt` dès le chargement (avant les boutons UI). */
import './lib/pwaInstallBridge';
import { initSentryIfConfigured } from './lib/sentry';

applyTheme(getStoredTheme());
bootstrapDesignPreview();
void initSentryIfConfigured();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
