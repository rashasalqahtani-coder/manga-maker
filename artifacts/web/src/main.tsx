import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // using import.meta.env.BASE_URL to get the correct path for sw.js
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.error('ServiceWorker registration failed:', error);
    });
  });
}

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      if (registration.scope.includes(import.meta.env.BASE_URL)) {
        void registration.unregister();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);