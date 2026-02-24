
import React from 'react';
import { Platform } from '../../platform';

interface StepperProps {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    onChange?: (value: number) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ 
    value, 
    min = 1, 
    max = 999, 
    step = 1, 
    disabled = false, 
    onChange,
    style,
    className = ''
}) => {
    const handleMinus = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled || value <= min) return;
        Platform.device.vibrate(5);
        onChange?.(Math.max(min, value - step));
    };

    const handlePlus = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled || value >= max) return;
        Platform.device.vibrate(5);
        onChange?.(Math.min(max, value + step));
    };

    // Style constants
    const btnSize = '28px';
    const borderRadius = '4px';

    return (
        <div 
            className={className}
            style={{ 
                display: 'inline-flex', alignItems: 'center', 
                background: 'var(--bg-body)', 
                borderRadius: borderRadius,
                opacity: disabled ? 0.6 : 1,
                ...style 
            }}
        >
            <button
                onClick={handleMinus}
                disabled={disabled || value <= min}
                style={{
                    width: btnSize, height: btnSize, 
                    border: 'none', background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (disabled || value <= min) ? 'not-allowed' : 'pointer',
                    color: (disabled || value <= min) ? 'var(--text-placeholder)' : 'var(--text-primary)',
                    fontSize: '16px', fontWeight: 600
                }}
            >
                −
            </button>
            <div style={{ 
                minWidth: '32px', textAlign: 'center', 
                fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)',
                padding: '0 4px', fontFamily: 'DIN Alternate, sans-serif'
            }}>
                {value}
            </div>
            <button
                onClick={handlePlus}
                disabled={disabled || value >= max}
                style={{
                    width: btnSize, height: btnSize, 
                    border: 'none', background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (disabled || value >= max) ? 'not-allowed' : 'pointer',
                    color: (disabled || value >= max) ? 'var(--text-placeholder)' : 'var(--text-primary)',
                    fontSize: '16px', fontWeight: 600
                }}
            >
                +
            </button>
        </div>
    );
};
