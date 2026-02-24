
import React from 'react';

export type ResultStatus = 'success' | 'error' | 'info' | 'warning' | 'waiting';

interface ResultProps {
    status?: ResultStatus;
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    extra?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

const Icons = {
    success: <svg width="64" height="64" viewBox="0 0 24 24" fill="#07c160"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    error: <svg width="64" height="64" viewBox="0 0 24 24" fill="#fa5151"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>,
    info: <svg width="64" height="64" viewBox="0 0 24 24" fill="#1677ff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
    warning: <svg width="64" height="64" viewBox="0 0 24 24" fill="#ffc107"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>,
    waiting: <svg width="64" height="64" viewBox="0 0 24 24" fill="#009688"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>,
};

export const Result: React.FC<ResultProps> = ({ 
    status = 'info', 
    title, 
    description, 
    icon, 
    extra,
    style,
    className = ''
}) => {
    return (
        <div 
            className={className}
            style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '48px 32px', textAlign: 'center',
                ...style 
            }}
        >
            <div style={{ marginBottom: '24px' }}>
                {icon || Icons[status]}
            </div>
            
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.4 }}>
                {title}
            </div>
            
            {description && (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
                    {description}
                </div>
            )}
            
            {extra && (
                <div style={{ width: '100%', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    {extra}
                </div>
            )}
        </div>
    );
};
