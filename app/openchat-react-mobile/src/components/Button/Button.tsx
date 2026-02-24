
import React from 'react';
import { useTouchFeedback } from '../../mobile/hooks/useTouchFeedback';
import { Sound } from '../../utils/sound';
import { TouchRipple } from '../TouchRipple/TouchRipple';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    block?: boolean; // Full width
    icon?: React.ReactNode;
    sound?: boolean; // Enable click sound
    ripple?: boolean; // Enable ripple effect
}

export const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    block = false,
    icon,
    className = '',
    style,
    disabled,
    onClick,
    sound = true,
    ripple = true,
    ...props 
}) => {
    const { isActive, touchProps } = useTouchFeedback({ disable: disabled || loading });

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (loading || disabled) return;
        if (sound) Sound.click();
        if (onClick) onClick(e);
    };

    // Design Tokens
    const getBackground = () => {
        if (disabled) return 'var(--bg-cell-active)';
        switch(variant) {
            case 'primary': return 'var(--primary-gradient)';
            case 'secondary': return 'var(--bg-card)';
            case 'outline': return 'transparent';
            case 'danger': return '#fa5151'; 
            case 'ghost': return 'transparent';
            case 'glass': return 'rgba(255, 255, 255, 0.2)';
            default: return 'var(--primary-color)';
        }
    };

    const getColor = () => {
        if (disabled) return 'var(--text-secondary)';
        switch(variant) {
            case 'primary': return 'white';
            case 'secondary': return 'var(--text-primary)';
            case 'outline': return 'var(--primary-color)';
            case 'danger': return 'white';
            case 'ghost': return 'var(--primary-color)';
            case 'glass': return 'white';
            default: return 'white';
        }
    };

    const getBorder = () => {
        if (variant === 'outline' && !disabled) return '1px solid currentColor';
        if (variant === 'secondary' && !disabled) return '1px solid var(--border-color)';
        return 'none';
    };

    const getPadding = () => {
        switch(size) {
            case 'sm': return '6px 12px';
            case 'lg': return '16px 24px';
            default: return '12px 20px'; // md
        }
    };

    const getFontSize = () => {
        switch(size) {
            case 'sm': return '13px';
            case 'lg': return '17px';
            default: return '15px'; // md
        }
    };

    const rippleColor = variant === 'primary' || variant === 'danger' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.05)';

    return (
        <button
            {...props}
            {...touchProps}
            onClick={handleClick}
            disabled={disabled}
            style={{
                display: block ? 'flex' : 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: block ? '100%' : 'auto',
                border: getBorder(),
                background: getBackground(),
                color: getColor(),
                padding: getPadding(),
                fontSize: getFontSize(),
                borderRadius: size === 'sm' ? '14px' : '12px',
                fontWeight: 600,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                opacity: (disabled) ? 0.6 : (isActive ? 0.95 : 1),
                transform: isActive ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                boxShadow: (variant === 'primary' || variant === 'danger') && !disabled ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                gap: '8px',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative', 
                overflow: 'hidden', // Contain ripple
                ...style
            }}
        >
            {/* Ripple Layer */}
            {ripple && !disabled && !loading && <TouchRipple color={rippleColor} />}

            <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                opacity: loading ? 0 : 1, 
                transition: 'opacity 0.2s',
                zIndex: 1, position: 'relative'
            }}>
                {icon}
                {children}
            </div>

            {loading && (
                <div style={{ 
                    position: 'absolute', top: '50%', left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2
                }}>
                    <div className="btn-spinner" />
                </div>
            )}

            <style>{`
                .btn-spinner {
                    width: 1.2em; height: 1.2em;
                    border: 2px solid currentColor;
                    border-right-color: transparent;
                    border-radius: 50%;
                    animation: btn-spin 0.8s linear infinite;
                }
                @keyframes btn-spin { to { transform: rotate(360deg); } }
            `}</style>
        </button>
    );
};
