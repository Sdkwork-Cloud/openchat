
import React from 'react';
import { useTouchFeedback } from '../../mobile/hooks/useTouchFeedback';

interface CardProps {
    children: React.ReactNode;
    padding?: string | number;
    margin?: string | number;
    radius?: string | number;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (e: React.MouseEvent) => void;
    highlight?: boolean; 
    variant?: 'default' | 'flat' | 'outline' | 'glass';
    interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
    children, 
    padding = '16px', 
    margin = '0 0 12px 0', 
    radius = '16px',
    className = '',
    style,
    onClick,
    highlight = false,
    variant = 'default',
    interactive = true
}) => {
    const { isActive, touchProps } = useTouchFeedback({ disable: !onClick || !interactive });

    const getBackground = () => {
        if (variant === 'flat') return 'var(--bg-body)';
        if (variant === 'glass') return 'rgba(var(--bg-card-rgb), 0.7)';
        return 'var(--bg-card)';
    };

    const getShadow = () => {
        if (highlight) return '0 8px 24px rgba(41, 121, 255, 0.15)';
        if (variant === 'default') return '0 1px 2px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.01)';
        return 'none';
    };

    const finalStyle: React.CSSProperties = {
        background: getBackground(),
        borderRadius: radius,
        padding,
        margin,
        boxShadow: getShadow(),
        border: highlight ? '1px solid var(--primary-color)' : (variant === 'outline' ? '1px solid var(--border-color)' : 'none'),
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isActive ? 'scale(0.97)' : 'scale(1)',
        backdropFilter: variant === 'glass' ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: variant === 'glass' ? 'blur(20px)' : 'none',
        ...style
    };

    return (
        <div 
            onClick={onClick}
            className={`kinetic-card ${className}`}
            {...touchProps}
            style={finalStyle}
        >
            {children}
        </div>
    );
};
