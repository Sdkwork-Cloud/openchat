
import React from 'react';

interface SpinnerProps {
    size?: number;
    color?: string;
    style?: React.CSSProperties;
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, color = 'currentColor', style, className = '' }) => {
    return (
        <div 
            className={className}
            style={{
                width: size,
                height: size,
                border: `2px solid rgba(0,0,0,0.1)`,
                borderTopColor: color,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                boxSizing: 'border-box',
                ...style
            }}
        >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
