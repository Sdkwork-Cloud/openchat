
import React from 'react';

interface DividerProps {
    children?: React.ReactNode;
    position?: 'center' | 'left' | 'right';
    color?: string;
    style?: React.CSSProperties;
    className?: string;
}

export const Divider: React.FC<DividerProps> = ({ 
    children, 
    position = 'center', 
    color = 'var(--border-color)', 
    style,
    className = ''
}) => {
    const lineStyle: React.CSSProperties = {
        flex: 1,
        height: '1px', // Using 1px instead of 0.5px for better visibility across devices, opacity handles weight
        background: color,
        transform: 'scaleY(0.5)', // Hairline
        opacity: 0.6
    };

    if (!children) {
        return (
            <div 
                className={className} 
                style={{ 
                    width: '100%', 
                    height: '1px', 
                    background: color, 
                    transform: 'scaleY(0.5)', 
                    margin: '16px 0',
                    opacity: 0.6,
                    ...style 
                }} 
            />
        );
    }

    return (
        <div 
            className={className}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                margin: '16px 0', 
                color: 'var(--text-secondary)', 
                fontSize: '12px',
                width: '100%',
                ...style 
            }}
        >
            {position !== 'left' && <div style={lineStyle} />}
            <div style={{ padding: '0 12px', fontWeight: 500 }}>{children}</div>
            {position !== 'right' && <div style={lineStyle} />}
        </div>
    );
};
