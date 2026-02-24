
import React, { useRef, useState, useEffect } from 'react';
import { Platform } from '../../platform';

interface SliderProps {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (value: number) => void;
    onAfterChange?: (value: number) => void; // Called on drag end
    disabled?: boolean;
    marks?: Record<number, React.ReactNode>;
    showValue?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

export const Slider: React.FC<SliderProps> = ({ 
    value, 
    min = 0, 
    max = 100, 
    step = 1, 
    onChange, 
    onAfterChange,
    disabled = false,
    marks,
    showValue = false,
    style,
    className = ''
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [internalValue, setInternalValue] = useState(value);

    useEffect(() => {
        if (!isDragging) {
            setInternalValue(value);
        }
    }, [value, isDragging]);

    const getValueFromEvent = (e: React.TouchEvent | React.MouseEvent | MouseEvent | TouchEvent) => {
        if (!trackRef.current) return min;
        
        const rect = trackRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        
        // Calculate percentage
        let percentage = (clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));
        
        // Map to range
        const rawValue = min + percentage * (max - min);
        
        // Snap to step
        const steppedValue = Math.round(rawValue / step) * step;
        
        // Clamp (redundant due to percentage clamp but safe for step rounding floating point errors)
        return Math.max(min, Math.min(max, steppedValue));
    };

    const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (disabled) return;
        setIsDragging(true);
        const newValue = getValueFromEvent(e);
        setInternalValue(newValue);
        onChange?.(newValue);
        Platform.device.vibrate(2); // Initial tick
        
        // Bind global events
        window.addEventListener('mousemove', handleMove as any);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove as any, { passive: false });
        window.addEventListener('touchend', handleEnd);
    };

    const handleMove = (e: TouchEvent | MouseEvent) => {
        if (e.cancelable) e.preventDefault(); // Prevent scroll while dragging
        const newValue = getValueFromEvent(e);
        
        // Only update if changed (dedupe for perf and haptic)
        if (newValue !== internalValue) {
            setInternalValue(newValue);
            onChange?.(newValue);
            // Haptic only on significant step changes if discrete? 
            // For continuous sliders, continuous vibration is bad. 
            // We can throttle it or only vibrate on step boundaries if step is large.
        }
    };

    const handleEnd = () => {
        setIsDragging(false);
        onAfterChange?.(internalValue);
        
        window.removeEventListener('mousemove', handleMove as any);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove as any);
        window.removeEventListener('touchend', handleEnd);
    };

    const percent = ((internalValue - min) / (max - min)) * 100;

    return (
        <div 
            className={className} 
            style={{ 
                padding: '10px 0', 
                position: 'relative', 
                opacity: disabled ? 0.5 : 1,
                touchAction: 'none', // Critical for preventing scroll
                ...style 
            }}
        >
            <div 
                ref={trackRef}
                onClick={handleStart} // Click to jump
                onTouchStart={handleStart}
                onMouseDown={handleStart}
                style={{ 
                    height: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    position: 'relative'
                }}
            >
                {/* Track Background */}
                <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', position: 'relative' }}>
                    {/* Active Track */}
                    <div style={{ 
                        width: `${percent}%`, 
                        height: '100%', 
                        background: 'var(--primary-color)', 
                        borderRadius: '2px',
                        transition: isDragging ? 'none' : 'width 0.2s'
                    }} />
                </div>

                {/* Thumb */}
                <div style={{
                    position: 'absolute',
                    left: `${percent}%`,
                    width: '24px', height: '24px',
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
                    transform: `translateX(-50%) scale(${isDragging ? 1.2 : 1})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: isDragging ? 'none' : 'left 0.2s, transform 0.2s',
                    zIndex: 2
                }}>
                    {/* Inner Dot */}
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }} />
                </div>
            </div>

            {/* Marks */}
            {marks && (
                <div style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
                    {Object.entries(marks).map(([key, label]) => {
                        const markVal = parseFloat(key);
                        const markPercent = ((markVal - min) / (max - min)) * 100;
                        const isActive = markVal <= internalValue;
                        
                        return (
                            <div key={key} style={{ 
                                position: 'absolute', left: `${markPercent}%`, transform: 'translateX(-50%)',
                                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
                            }}>
                                {/* Optional tick mark on track? Already have visual cues. Just label. */}
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-placeholder)',
                                    fontWeight: isActive ? 600 : 400,
                                    whiteSpace: 'nowrap'
                                }}>
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {showValue && !marks && (
                <div style={{ position: 'absolute', right: 0, top: '-20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {internalValue}
                </div>
            )}
        </div>
    );
};
