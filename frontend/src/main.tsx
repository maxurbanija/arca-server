import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import toast, { Toaster, type Toast } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#1e1b4b',
              color: '#fff',
              maxWidth: '420px',
              fontSize: '14px',
            },
            success: {
              style: {
                background: '#065f46',
              },
            },
            error: {
              duration: 10000,
              style: {
                background: '#991b1b',
              },
            },
          }}
        >
          {(t: Toast) => (
            <div
              className={`flex items-start gap-2 ${t.visible ? 'animate-enter' : 'animate-leave'}`}
              style={t.style}
            >
              <span className="flex-1">{typeof t.message === 'function' ? t.message(t) : t.message}</span>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold opacity-70 hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                ✕
              </button>
            </div>
          )}
        </Toaster>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
