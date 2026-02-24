
import React, { useEffect, useState } from 'react';

interface ProgressProps {
    percent: number;
    strokeHeight?: number;
    color?: string; // CSS color or gradient
    trackColor?: string;
    showInfo?: boolean;
    style?: React.CSSProperties;
}

export const Progress: React.FC<ProgressProps> = ({ 
    percent, 
    strokeHeight = 6, 
    color = 'var(--primary-color)', 
    trackColor = 'rgba(0,0,0,0.05)',
    showInfo = false,
    style
}) => {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        // Animate on mount or update
        requestAnimationFrame(() => {
            setWidth(Math.min(Math.max(0, percent), 100));
        });
    }, [percent]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', ...style }}>
            <div style={{ 
                flex: 1, 
                height: strokeHeight, 
                background: trackColor, 
                borderRadius: strokeHeight / 2, 
                overflow: 'hidden' 
            }}>
                <div style={{ 
                    width: `${width}%`, 
                    height: '100%', 
                    background: color, 
                    borderRadius: strokeHeight / 2,
                    transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                }} />
            </div>
            {showInfo && (
                <div style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-secondary)', width: '32px', textAlign: 'right' }}>
                    {Math.round(width)}%
                </div>
            )}
        </div>
    );
};
