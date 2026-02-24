
import React, { useState, useEffect } from 'react';

interface CheckboxProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    size?: number;
    style?: React.CSSProperties;
    className?: string;
    disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
    checked, 
    onChange, 
    size = 22, 
    style,
    className = '',
    disabled = false
}) => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (checked && !disabled) {
            setAnimate(true);
            const timer = setTimeout(() => setAnimate(false), 300);
            return () => clearTimeout(timer);
        }
    }, [checked, disabled]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        onChange?.(!checked);
    };

    // Computed Styles
    const borderColor = disabled ? 'var(--border-color)' : 'var(--text-placeholder)';
    const bgColor = disabled 
        ? (checked ? 'var(--text-placeholder)' : 'transparent') 
        : (checked ? 'var(--primary-color)' : 'transparent');

    return (
        <div 
            className={className}
            onClick={handleClick}
            style={{
                width: size, height: size, borderRadius: '50%',
                border: checked ? 'none' : `1px solid ${borderColor}`,
                background: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, 
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: animate ? 'scale(1.2)' : 'scale(1)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                ...style
            }}
        >
            {checked && (
                <svg 
                    width={size * 0.65} 
                    height={size * 0.65} 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="3"
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ animation: !disabled ? 'check-pop 0.2s ease-out' : 'none' }}
                >
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            )}
            <style>{`
                @keyframes check-pop {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
