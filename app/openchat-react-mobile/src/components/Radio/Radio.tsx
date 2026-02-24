
import React from 'react';

interface RadioProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

export const Radio: React.FC<RadioProps> = ({ 
    checked, 
    onChange, 
    disabled = false, 
    children,
    style,
    className = ''
}) => {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        onChange?.(true);
    };

    return (
        <div 
            className={className}
            onClick={handleClick}
            style={{ 
                display: 'inline-flex', alignItems: 'center', 
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                ...style 
            }}
        >
            <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                border: checked ? 'none' : '1px solid var(--text-placeholder)',
                background: checked ? 'var(--primary-color)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
                marginRight: children ? '8px' : '0'
            }}>
                {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </div>
            {children && (
                <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{children}</span>
            )}
        </div>
    );
};
