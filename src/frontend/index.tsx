import React from 'react';
import ReactDOM from 'react-dom/client';
// Acronis UI Syntax - design tokens and fonts
import '@acronis-platform/ui-syntax/dist/css/globals.css';
import '@acronis-platform/ui-syntax/dist/css/acronis/acronis-light.css';
import '@acronis-platform/ui-syntax/dist/css/fonts.css';
import './index.css';
import App from './App';
import { APP_VERSION, APP_BUILD_REF } from './constants';

// Version-based cache busting: clear browser caches when UI version changes
const APP_VERSION_KEY = 'cyber-wiki-app-version';
const versionFingerprint = `${APP_VERSION}-${APP_BUILD_REF}`;
const previousVersion = localStorage.getItem(APP_VERSION_KEY);

if (previousVersion && previousVersion !== versionFingerprint) {
  localStorage.setItem(APP_VERSION_KEY, versionFingerprint);

  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }

  window.location.reload();
} else {
  if (!previousVersion) {
    localStorage.setItem(APP_VERSION_KEY, versionFingerprint);
  }

  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('No checkout popup config found')) {
      return;
    }
    originalError.apply(console, args);
  };

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(<App />);
}
