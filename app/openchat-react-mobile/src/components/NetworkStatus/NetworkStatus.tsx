
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../core/i18n/I18nContext';

export const NetworkStatus: React.FC = () => {
    const { t } = useTranslation();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Hide banner after a brief "Back Online" success message if we want, or just hide immediately
            setTimeout(() => setShowBanner(false), 2000); 
        };
        
        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showBanner) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
            background: isOnline ? '#07c160' : '#fa5151',
            color: 'white', fontSize: '13px', fontWeight: 500,
            textAlign: 'center', padding: 'env(safe-area-inset-top) 0 4px 0',
            height: 'calc(32px + env(safe-area-inset-top))',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            transition: 'transform 0.3s ease',
            transform: showBanner ? 'translateY(0)' : 'translateY(-100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isOnline ? (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        {t('network.restored')}
                    </>
                ) : (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                        {t('network.disconnected')}
                    </>
                )}
            </div>
        </div>
    );
};
