
import React, { useState, useRef } from 'react';
import { Platform } from '../../platform';

interface IndexBarProps {
    indexes: string[];
    onSelect: (index: string) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const IndexBar: React.FC<IndexBarProps> = ({ 
    indexes, 
    onSelect,
    style,
    className = ''
}) => {
    const [activeIndex, setActiveIndex] = useState<string | null>(null);
    const touchTimeout = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        // Prevent default to stop scrolling the page while scrubbing
        if (e.cancelable && e.type !== 'mousedown' && e.type !== 'mousemove') {
            e.preventDefault(); 
        }

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        
        // Use document.elementFromPoint to find the target element under finger
        // This is robust even if the touch moves slightly outside the exact element bounds
        const element = document.elementFromPoint(clientX, clientY);
        const char = element?.getAttribute('data-index');
        
        if (char && char !== activeIndex) {
            Platform.device.vibrate(2); // Light haptic
            setActiveIndex(char);
            onSelect(char);
            
            // Auto hide toast after delay
            if (touchTimeout.current) clearTimeout(touchTimeout.current);
            touchTimeout.current = setTimeout(() => setActiveIndex(null), 600);
        }
    };

    const handleTouchEnd = () => {
        if (touchTimeout.current) clearTimeout(touchTimeout.current);
        touchTimeout.current = setTimeout(() => setActiveIndex(null), 300);
    };

    return (
        <>
            <div 
                ref={containerRef}
                className={className}
                style={{ 
                    position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                    padding: '8px 0', zIndex: 100, userSelect: 'none', touchAction: 'none',
                    background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)',
                    borderRadius: '16px',
                    width: '24px',
                    ...style
                }}
                onTouchStart={handleTouchMove}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => { /* Start mouse drag */ }}
                onMouseMove={(e) => e.buttons === 1 && handleTouchMove(e)}
            >
                {indexes.map(char => (
                    <div 
                        key={char} 
                        data-index={char}
                        style={{ 
                            fontSize: '10px', fontWeight: 600, 
                            width: '20px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%',
                            color: activeIndex === char ? 'var(--primary-color)' : 'var(--text-secondary)',
                            transition: 'color 0.1s'
                        }}
                    >
                        {char === '↑' ? '▲' : char}
                    </div>
                ))}
            </div>

            {/* Central Toast Tip */}
            {activeIndex && (
                <div style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '60px', height: '60px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px',
                    color: 'white', fontSize: '32px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 200, backdropFilter: 'blur(4px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    animation: 'popIn 0.1s ease-out',
                    pointerEvents: 'none'
                }}>
                    {activeIndex}
                </div>
            )}
            <style>{`@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }`}</style>
        </>
    );
};
