
import React, { useState, useEffect, useRef } from 'react';
import { Haptic } from '../../utils/haptic';

interface SegmentedControlProps {
    options: { label: string; value: string | number }[];
    value: string | number;
    onChange: (value: any) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ 
    options, 
    value, 
    onChange, 
    style,
    className = ''
}) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        const index = options.findIndex(o => o.value === value);
        if (index !== -1) setActiveIndex(index);
    }, [value, options]);

    useEffect(() => {
        // Calculate indicator position
        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth - 8; // padding 4px * 2
            const itemWidth = containerWidth / options.length;
            
            setIndicatorStyle({
                width: `${itemWidth}px`,
                transform: `translateX(${activeIndex * itemWidth}px)`,
            });
        }
    }, [activeIndex, options.length]);

    const handleSelect = (val: string | number, index: number) => {
        if (val !== value) {
            Haptic.selection();
            onChange(val);
        }
    };

    return (
        <div 
            ref={containerRef}
            className={className}
            style={{ 
                position: 'relative', 
                background: 'rgba(118, 118, 128, 0.12)', 
                borderRadius: '9px', 
                padding: '4px',
                display: 'flex',
                userSelect: 'none',
                height: '36px',
                ...style 
            }}
        >
            {/* Sliding Indicator */}
            <div 
                style={{
                    position: 'absolute',
                    top: 4, left: 4, bottom: 4,
                    background: 'var(--bg-card)',
                    borderRadius: '7px',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)',
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.3s',
                    zIndex: 1,
                    ...indicatorStyle
                }}
            />

            {options.map((opt, index) => {
                const isActive = index === activeIndex;
                return (
                    <div 
                        key={opt.value}
                        onClick={() => handleSelect(opt.value, index)}
                        style={{ 
                            flex: 1, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--text-primary)' : 'var(--text-primary)',
                            zIndex: 2,
                            cursor: 'pointer',
                            opacity: isActive ? 1 : 0.6,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {opt.label}
                    </div>
                );
            })}
        </div>
    );
};
