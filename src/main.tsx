import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './lib/LanguageContext';
import { ThemeProvider } from './lib/ThemeContext';

// Handle and suppress transient background / closing database rejections in iframe/tab environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || reason?.name || '');
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('The database is closing') ||
      msg.includes('client is offline') ||
      msg.includes('IndexedDB')
    ) {
      // Prevent browser error banner from triggering on benign lifecycle events
      event.preventDefault();
      console.warn('[Firebase Lifecycle Guard] Handled transient database event:', msg);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('The database is closing') ||
      msg.includes('IndexedDB')
    ) {
      event.preventDefault();
      console.warn('[Firebase Lifecycle Guard] Handled transient database error:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);


