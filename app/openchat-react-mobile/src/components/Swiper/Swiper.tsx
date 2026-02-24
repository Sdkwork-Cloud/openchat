
import React, { useState, useRef, useEffect, Children } from 'react';

interface SwiperProps {
    children: React.ReactNode;
    height?: string | number;
    autoplay?: boolean;
    interval?: number; // ms
    loop?: boolean; // Infinite loop
    showIndicators?: boolean;
    style?: React.CSSProperties;
    className?: string;
    onClick?: (index: number) => void;
}

export const Swiper: React.FC<SwiperProps> = ({ 
    children, 
    height = '160px', 
    autoplay = true, 
    interval = 3000, 
    loop = true, 
    showIndicators = true,
    style,
    className = '',
    onClick
}) => {
    const [currentIndex, setCurrentIndex] = useState(loop ? 1 : 0);
    const [isDragging, setIsDragging] = useState(false);
    const [translate, setTranslate] = useState(loop ? -100 : 0); // Percentage
    const [transitionDuration, setTransitionDuration] = useState(300);

    const containerRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startTranslate = useRef(0);
    const autoPlayTimer = useRef<any>(null);
    
    // Process Children
    const originalChildren = Children.toArray(children);
    const count = originalChildren.length;
    
    // If loop, clone first and last
    const displayChildren = loop && count > 1
        ? [originalChildren[count - 1], ...originalChildren, originalChildren[0]]
        : originalChildren;

    const totalCount = displayChildren.length;

    const resetAutoplay = () => {
        if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
        if (autoplay && count > 1) {
            autoPlayTimer.current = setInterval(() => {
                next();
            }, interval);
        }
    };

    useEffect(() => {
        resetAutoplay();
        return () => clearInterval(autoPlayTimer.current);
    }, [autoplay, interval, count, currentIndex]); // Dep on currentIndex to ensure closure freshness if needed

    const next = () => {
        goTo(currentIndex + 1);
    };

    const goTo = (index: number, duration = 300) => {
        setTransitionDuration(duration);
        setTranslate(-(index * 100));
        setCurrentIndex(index);

        if (loop) {
            // Handle wrapping
            if (index === totalCount - 1) {
                // Moving to clone of first
                setTimeout(() => {
                    setTransitionDuration(0);
                    setTranslate(-100);
                    setCurrentIndex(1);
                }, duration);
            } else if (index === 0) {
                // Moving to clone of last
                setTimeout(() => {
                    setTransitionDuration(0);
                    setTranslate(-(count * 100));
                    setCurrentIndex(count);
                }, duration);
            }
        }
    };

    // Touch Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (count <= 1) return;
        if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
        
        setIsDragging(true);
        startX.current = e.touches[0].clientX;
        startTranslate.current = translate;
        setTransitionDuration(0); // Disable transition for direct tracking
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        const containerWidth = containerRef.current?.offsetWidth || 1;
        const diffPercent = (diff / containerWidth) * 100;
        
        setTranslate(startTranslate.current + diffPercent);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        resetAutoplay();

        const containerWidth = containerRef.current?.offsetWidth || 1;
        const diff = (e.changedTouches[0].clientX - startX.current);
        const threshold = containerWidth * 0.2; // 20% swipe to change

        if (Math.abs(diff) < 5 && onClick) {
            // It was a tap
            const realIndex = loop ? (currentIndex - 1 + count) % count : currentIndex;
            onClick(realIndex);
            goTo(currentIndex); // Snap back to center
            return;
        }

        if (diff > threshold) {
            // Swipe Right (Prev)
            goTo(currentIndex - 1);
        } else if (diff < -threshold) {
            // Swipe Left (Next)
            goTo(currentIndex + 1);
        } else {
            // Revert
            goTo(currentIndex);
        }
    };

    // Calculate active indicator index
    let indicatorIndex = currentIndex;
    if (loop) {
        if (currentIndex === 0) indicatorIndex = count - 1;
        else if (currentIndex === totalCount - 1) indicatorIndex = 0;
        else indicatorIndex = currentIndex - 1;
    }

    return (
        <div 
            ref={containerRef}
            className={className}
            style={{ 
                position: 'relative', 
                overflow: 'hidden', 
                height: typeof height === 'number' ? `${height}px` : height,
                width: '100%',
                borderRadius: '16px', // Default styling
                transform: 'translateZ(0)', // GPU fix
                ...style 
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div 
                style={{
                    display: 'flex',
                    height: '100%',
                    width: `${totalCount * 100}%`,
                    transform: `translateX(${translate / totalCount}%)`,
                    transition: isDragging ? 'none' : `transform ${transitionDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
                }}
            >
                {displayChildren.map((child, idx) => (
                    <div 
                        key={idx} 
                        style={{ 
                            width: `${100 / totalCount}%`, 
                            height: '100%',
                            flexShrink: 0
                        }}
                    >
                        {child}
                    </div>
                ))}
            </div>

            {showIndicators && count > 1 && (
                <div style={{
                    position: 'absolute', bottom: '12px', left: 0, right: 0,
                    display: 'flex', justifyContent: 'center', gap: '6px',
                    pointerEvents: 'none'
                }}>
                    {Array.from({ length: count }).map((_, idx) => (
                        <div 
                            key={idx}
                            style={{
                                width: idx === indicatorIndex ? '16px' : '6px',
                                height: '6px',
                                borderRadius: '3px',
                                background: idx === indicatorIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                                transition: 'all 0.3s'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
