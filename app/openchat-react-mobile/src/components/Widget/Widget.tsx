
import React from 'react';

interface WidgetProps {
    title?: string;
    action?: string;
    onAction?: () => void;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    padding?: string;
}

export const Widget: React.FC<WidgetProps> = ({ 
    title, 
    action, 
    onAction, 
    children, 
    className = '',
    style,
    padding = '16px'
}) => {
    return (
        <div 
            className={className}
            style={{ 
                background: 'var(--bg-card)', 
                borderRadius: '16px', 
                marginBottom: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                ...style 
            }}
        >
            {title && (
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '16px 16px 8px 16px' 
                }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
                    {action && (
                        <div 
                            onClick={onAction}
                            style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            {action} <span style={{ marginLeft: '2px' }}>›</span>
                        </div>
                    )}
                </div>
            )}
            <div style={{ padding }}>
                {children}
            </div>
        </div>
    );
};
