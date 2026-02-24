
import React from 'react';

export const SplashScreen: React.FC = () => {
    return (
        <div style={{ 
            height: '100vh', width: '100vw', 
            background: 'var(--bg-body)', 
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            position: 'fixed',
            inset: 0
        }}>
            <div style={{ 
                width: '80px', height: '80px', 
                borderRadius: '22px', 
                background: 'linear-gradient(135deg, #2979FF 0%, #0050E6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 12px 40px rgba(41, 121, 255, 0.35)',
                marginBottom: '24px',
                animation: 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)'
            }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
            </div>
            <div style={{ 
                fontSize: '24px', fontWeight: 700, 
                color: 'var(--text-primary)', 
                letterSpacing: '1px',
                marginBottom: '8px'
            }}>
                OpenChat
            </div>
            <div style={{ 
                fontSize: '13px', color: 'var(--text-secondary)', 
                opacity: 0.8, letterSpacing: '0.5px' 
            }}>
                Secure · Intelligent · Open
            </div>
            <style>{`
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
            `}</style>
        </div>
    );
};
