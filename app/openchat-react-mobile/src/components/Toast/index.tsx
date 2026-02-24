
import React, { useState, useEffect, useCallback } from 'react';

// Types
type ToastType = 'info' | 'success' | 'loading' | 'error';

interface ToastOptions {
  duration?: number;
}

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

// Event Bus
const toastConfig = {
  show: (msg: string, type: ToastType, opts?: ToastOptions) => {},
  hideAll: () => {}
};

// --- The Component ---
const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = React.useRef(0);

  const addToast = useCallback((msg: string, type: ToastType, opts?: ToastOptions) => {
      const id = ++idCounter.current;
      const duration = opts?.duration || (type === 'loading' ? 0 : 2000);
      
      // If loading, remove existing loading toasts to prevent stuck spinners
      if (type === 'loading') {
          setToasts(prev => prev.filter(t => t.type !== 'loading'));
      }

      const newItem: ToastItem = { id, message: msg, type, duration };
      
      setToasts(prev => {
          // Limit stack size to 3 for UI cleanliness
          const next = [...prev, newItem];
          if (next.length > 3) return next.slice(next.length - 3);
          return next;
      });

      if (duration > 0) {
          setTimeout(() => {
              removeToast(id);
          }, duration);
      }
  }, []);

  const removeToast = useCallback((id: number) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const hideAll = useCallback(() => {
      setToasts([]);
  }, []);

  useEffect(() => {
    toastConfig.show = addToast;
    toastConfig.hideAll = hideAll;
  }, [addToast, hideAll]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '45%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 'var(--z-toast)', 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      gap: '12px', pointerEvents: 'none',
      width: '100%', height: '100%', justifyContent: 'center'
    }}>
      {toasts.map((toast, index) => {
          // Stacking logic: 
          // Newest is at the bottom (index = length - 1)
          // Older ones move UP and scale DOWN
          const reverseIndex = toasts.length - 1 - index; // 0 = newest
          
          const scale = 1 - (reverseIndex * 0.05);
          const opacity = 1 - (reverseIndex * 0.3);
          const translateY = reverseIndex * -12; // Move up by 12px per step
          const blur = reverseIndex * 1; // Slight blur for background items

          return (
            <div 
                key={toast.id}
                className="toast-item-enter"
                style={{
                    background: 'rgba(30, 30, 30, 0.85)', 
                    backdropFilter: `blur(${10 + blur}px)`,
                    WebkitBackdropFilter: `blur(${10 + blur}px)`,
                    padding: '16px 24px', 
                    borderRadius: '16px', 
                    color: 'white',
                    fontSize: '15px', fontWeight: 500, textAlign: 'center', 
                    maxWidth: '80%', minWidth: '120px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
                    opacity: opacity,
                    position: 'absolute', // Stack them
                    zIndex: index // Ensure correct draw order
                }}
            >
                {toast.type === 'success' && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#27c93f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                {toast.type === 'error' && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fa5151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                {toast.type === 'loading' && <div className="toast-spinner" />}
                
                <span style={{ lineHeight: 1.4 }}>{toast.message}</span>
            </div>
          );
      })}
      <style>{`
        .toast-spinner { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .toast-item-enter { animation: toastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes toastIn { 
            from { opacity: 0; transform: translate3d(0, 20px, 0) scale(0.9); } 
            to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); } 
        }
      `}</style>
    </div>
  );
};

// --- API ---
export const Toast = {
  info: (msg: string, duration = 2000) => toastConfig.show(msg, 'info', { duration }),
  success: (msg: string, duration = 2000) => toastConfig.show(msg, 'success', { duration }),
  error: (msg: string, duration = 2500) => toastConfig.show(msg, 'error', { duration }),
  loading: (msg: string) => toastConfig.show(msg, 'loading'),
  hide: () => toastConfig.hideAll()
};

export const InitToast = () => <ToastContainer />;
