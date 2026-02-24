
import React, { useState, useLayoutEffect, useRef } from 'react';

interface Ripple {
    x: number;
    y: number;
    size: number;
    key: number;
}

interface TouchRippleProps {
    color?: string;
    duration?: number;
}

export const TouchRipple: React.FC<TouchRippleProps> = ({ 
    color = 'rgba(255, 255, 255, 0.3)', 
    duration = 600 
}) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseDown = (e: MouseEvent | TouchEvent) => {
            const parent = container.parentElement;
            // Only trigger if parent is not disabled
            if (parent && (parent as any).disabled) return;

            const rect = container.getBoundingClientRect();
            let clientX, clientY;

            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as MouseEvent).clientX;
                clientY = (e as MouseEvent).clientY;
            }

            const size = Math.max(rect.width, rect.height) * 1.5;
            const x = clientX - rect.left - size / 2;
            const y = clientY - rect.top - size / 2;
            
            const newRipple = { x, y, size, key: Date.now() };
            
            setRipples(prev => [...prev, newRipple]);
        };

        // Attach listener to parent to capture clicks correctly
        const parent = container.parentElement;
        if (parent) {
             const start = (e: any) => handleMouseDown(e);
             parent.addEventListener('mousedown', start);
             parent.addEventListener('touchstart', start, { passive: true });
             
             return () => {
                 parent.removeEventListener('mousedown', start);
                 parent.removeEventListener('touchstart', start);
             };
        }
    }, []);

    // Cleanup ripples
    useLayoutEffect(() => {
        if (ripples.length > 0) {
            const timer = setTimeout(() => {
                setRipples(prev => prev.slice(1));
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [ripples, duration]);

    return (
        <div 
            ref={containerRef}
            style={{ 
                position: 'absolute', inset: 0, overflow: 'hidden', 
                borderRadius: 'inherit', pointerEvents: 'none', zIndex: 0 
            }}
        >
            {ripples.map(r => (
                <span
                    key={r.key}
                    style={{
                        position: 'absolute',
                        left: r.x,
                        top: r.y,
                        width: r.size,
                        height: r.size,
                        backgroundColor: color,
                        borderRadius: '50%',
                        transform: 'scale(0)',
                        animation: `ripple-effect ${duration}ms linear`,
                        opacity: 1
                    }}
                />
            ))}
            <style>{`
                @keyframes ripple-effect {
                    to { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};
