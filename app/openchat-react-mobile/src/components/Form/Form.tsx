
import React from 'react';

interface FormProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    inset?: boolean; // Card style
}

export const Form: React.FC<FormProps> = ({ 
    children, 
    style, 
    className = '', 
    inset = false 
}) => {
    return (
        <div 
            className={className}
            style={{ 
                margin: inset ? '12px 16px' : '0',
                borderRadius: inset ? '12px' : '0',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                borderTop: inset ? 'none' : '0.5px solid var(--border-color)',
                borderBottom: inset ? 'none' : '0.5px solid var(--border-color)',
                ...style 
            }}
        >
            {children}
        </div>
    );
};
