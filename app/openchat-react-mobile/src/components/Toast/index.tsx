
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// Types
type ToastType = 'info' | 'success' | 'loading';

interface ToastOptions {
  duration?: number;
  icon?: string;
}

// Event Bus for Singleton Communication
const toastConfig = {
  show: (msg: string, type: ToastType, opts?: ToastOptions) => {},
};

// --- The Component ---
const ToastContainer: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  
  useEffect(() => {
    // Register the show function
    toastConfig.show = (msg, t, opts) => {
      setMessage(msg);
      setType(t);
      setVisible(true);
      
      if (t !== 'loading') {
        const duration = opts?.duration || 2000;
        setTimeout(() => setVisible(false), duration);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.2s'
    }}>
      <div style={{
        background: 'rgba(17, 17, 17, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '16px 24px',
        borderRadius: '12px',
        color: 'white',
        fontSize: '15px',
        fontWeight: 500,
        textAlign: 'center',
        maxWidth: '200px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        {type === 'success' && (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#27c93f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        )}
        {type === 'loading' && (
          <div className="toast-spinner" />
        )}
        {/* Info usually has no icon or a custom one */}
        
        <span style={{ lineHeight: 1.4 }}>{message}</span>
      </div>
      <style>{`
        .toast-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// --- Singleton API ---
export const Toast = {
  info: (msg: string, duration = 2000) => toastConfig.show(msg, 'info', { duration }),
  success: (msg: string, duration = 2000) => toastConfig.show(msg, 'success', { duration }),
  loading: (msg: string) => toastConfig.show(msg, 'loading'),
  hide: () => toastConfig.show('', 'info', { duration: 0 }) // Hacky hide
};

// Initialize functionality
export const InitToast = () => <ToastContainer />;
