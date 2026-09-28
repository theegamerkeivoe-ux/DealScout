import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely catch known asynchronous assertion failures thrown by Firebase Auth
// when popups are blocked, closed, or cancelled in sandboxed iframe environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || '';
    const code = reason?.code || '';

    if (
      msg.includes('Pending promise was never set') ||
      msg.includes('cancelled-popup-request') ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/popup-closed-by-user'
    ) {
      // Suppress noisy internal SDK assertion log
      event.preventDefault();
      console.warn('Handled Firebase Auth asynchronous popup event safely.');
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('Pending promise was never set')) {
      event.preventDefault();
      console.warn('Handled Firebase Auth internal assertion safely.');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

