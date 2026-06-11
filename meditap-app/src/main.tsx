import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import { applyMediTapLocale, readMediTapLocale } from './i18n/localeSync';
import { applyMediTapDarkMode, readMediTapDarkMode } from './theme/darkModeSync';

/* Settings locale + dark mode before paint (ion-app patched after mount in App) */
try {
  applyMediTapLocale(readMediTapLocale());
  applyMediTapDarkMode(readMediTapDarkMode());
} catch {
  /* ignore */
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);