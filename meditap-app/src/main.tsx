import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyMediTapDarkMode, readMediTapDarkMode } from './theme/darkModeSync';

/* Settings dark mode before paint: html, body, color-scheme (ion-app patched after mount in App) */
try {
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