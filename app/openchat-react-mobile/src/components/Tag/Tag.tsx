
import React from 'react';

export type TagColor = 'primary' | 'success' | 'warning' | 'danger' | 'default' | 'blue' | 'green' | 'orange' | 'red';
export type TagVariant = 'solid' | 'outline' | 'light' | 'ghost';

interface TagProps {
    children: React.ReactNode;
    color?: TagColor;
    variant?: TagVariant;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    size?: 'sm' | 'md';
}

export const Tag: React.FC<TagProps> = ({ 
    children, 
    color = 'default', 
    variant = 'light', 
    className = '', 
    style, 
    onClick,
    size = 'sm'
}) => {
    
    const getColorStyles = () => {
        const colors: Record<string, string> = {
            primary: 'var(--primary-color)',
            blue: 'var(--primary-color)',
            success: '#07c160',
            green: '#07c160',
            warning: '#ff9a44',
            orange: '#ff9a44',
            danger: '#fa5151',
            red: '#fa5151',
            default: 'var(--text-secondary)'
        };
        return colors[color] || colors.default;
    };

    const baseColor = getColorStyles();

    let bg = 'transparent';
    let textColor = baseColor;
    let border = 'none';

    switch (variant) {
        case 'solid':
            bg = baseColor;
            textColor = '#fff';
            break;
        case 'outline':
            bg = 'transparent';
            border = `1px solid ${baseColor}`;
            break;
        case 'light':
            // Calculate a rough light version using opacity
            // Note: Since we use CSS vars or hex, simple opacity on bg works best
            // We'll use a dynamic style for bg opacity
            textColor = baseColor;
            // Background handled in style object below
            break;
        case 'ghost':
            bg = 'transparent';
            break;
    }

    const lightBgMap: Record<string, string> = {
        primary: 'rgba(41, 121, 255, 0.1)',
        blue: 'rgba(41, 121, 255, 0.1)',
        success: 'rgba(7, 193, 96, 0.1)',
        green: 'rgba(7, 193, 96, 0.1)',
        warning: 'rgba(255, 154, 68, 0.1)',
        orange: 'rgba(255, 154, 68, 0.1)',
        danger: 'rgba(250, 81, 81, 0.1)',
        red: 'rgba(250, 81, 81, 0.1)',
        default: 'rgba(0, 0, 0, 0.05)'
    };

    if (variant === 'light') {
        bg = lightBgMap[color] || lightBgMap.default;
    }

    return (
        <span 
            className={className}
            onClick={onClick}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: size === 'sm' ? '2px 6px' : '4px 10px',
                fontSize: size === 'sm' ? '10px' : '12px',
                borderRadius: '4px',
                backgroundColor: bg,
                color: textColor,
                border: border,
                fontWeight: 500,
                lineHeight: 1.2,
                cursor: onClick ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                ...style
            }}
        >
            {children}
        </span>
    );
};
