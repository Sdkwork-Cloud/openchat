
import React, { useState, useRef, useEffect, ReactNode } from 'react';

export interface Action {
    text: string;
    color: string;
    onClick: () => void;
    width?: number; // default 70
}

interface SwipeableRowProps {
    children: ReactNode;
    rightActions: Action[];
    onOpen?: () => void;
    onClose?: () => void;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onBodyClick?: () => void;
    contentBackground?: string;
}

// --- Mutex Event Bus ---
const SWIPE_OPEN_EVENT = 'swipe-row-open';
const swipeBus = new EventTarget();

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ 
    children, 
    rightActions, 
    onOpen, 
    onClose, 
    disabled = false,
    className = '',
    style,
    onBodyClick,
    contentBackground = 'var(--bg-card)'
}) => {
    const [offset, setOffset] = useState(0);
    const startX = useRef(0);
    const startY = useRef(0);
    const isDragging = useRef(false);
    const isScrolling = useRef(false);
    const currentOffset = useRef(0);
    
    // Unique ID for mutex check
    const rowId = useRef(Math.random().toString(36).slice(2));

    const totalActionWidth = rightActions.reduce((acc, action) => acc + (action.width || 70), 0);
    const maxSwipe = -totalActionWidth;

    // --- Mutex Listener ---
    useEffect(() => {
        const handleOtherOpen = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail !== rowId.current && currentOffset.current !== 0) {
                // Close this row if another row opened
                closeRow();
            }
        };

        swipeBus.addEventListener(SWIPE_OPEN_EVENT, handleOtherOpen);
        return () => {
            swipeBus.removeEventListener(SWIPE_OPEN_EVENT, handleOtherOpen);
        };
    }, []);

    const closeRow = () => {
        setOffset(0);
        currentOffset.current = 0;
        onClose?.();
    };

    const openRow = () => {
        setOffset(maxSwipe);
        currentOffset.current = maxSwipe;
        onOpen?.();
        
        // Haptic feedback when opening
        if (navigator.vibrate) navigator.vibrate(10);
        
        // Notify others to close
        swipeBus.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: rowId.current }));
    };

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (disabled) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        startX.current = clientX;
        startY.current = clientY;
        isDragging.current = false;
        isScrolling.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (disabled) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const deltaX = clientX - startX.current;
        const deltaY = clientY - startY.current;

        // Determine intent (Horizontal Swipe vs Vertical Scroll)
        if (!isDragging.current && !isScrolling.current) {
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isScrolling.current = true;
                return;
            }
            if (Math.abs(deltaX) > 5) { // Threshold
                isDragging.current = true;
            }
        }

        if (isDragging.current) {
            if (e.cancelable && 'preventDefault' in e) e.preventDefault();

            let newOffset = currentOffset.current + deltaX;

            // Resistance Logic
            if (newOffset > 0) {
                newOffset = newOffset * 0.3; // Dragging right (overshoot)
            } else if (newOffset < maxSwipe) {
                // Dragging past max actions
                const extra = newOffset - maxSwipe;
                newOffset = maxSwipe + extra * 0.4;
            }

            setOffset(newOffset);
        }
    };

    const handleTouchEnd = () => {
        if (disabled || isScrolling.current) return;

        if (isDragging.current) {
            const snapThreshold = maxSwipe / 2;
            
            // If moved significantly left
            if (offset < snapThreshold) {
                openRow();
            } else {
                closeRow();
            }
            isDragging.current = false;
        }
    };

    const handleActionClick = (e: React.MouseEvent, action: Action) => {
        e.stopPropagation();
        closeRow();
        action.onClick();
    };

    const handleContentClick = () => {
        if (offset !== 0) {
            closeRow(); // Tap body to close if open
        } else {
            onBodyClick?.(); // Normal click
        }
    };

    return (
        <div 
            className={className} 
            style={{ position: 'relative', overflow: 'hidden', ...style }}
        >
            {/* Actions Layer */}
            <div style={{ 
                position: 'absolute', top: 0, bottom: 0, right: 0, 
                display: 'flex', zIndex: 0 
            }}>
                {rightActions.map((action, idx) => (
                    <div 
                        key={idx}
                        onClick={(e) => handleActionClick(e, action)}
                        style={{
                            width: action.width || 70,
                            background: action.color,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '15px',
                            cursor: 'pointer'
                        }}
                    >
                        {action.text}
                    </div>
                ))}
            </div>

            {/* Foreground Content */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onClick={handleContentClick}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    background: contentBackground, // Important to cover actions
                    transform: `translateX(${offset}px)`,
                    transition: isDragging.current ? 'none' : 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                    willChange: 'transform'
                }}
            >
                {children}
            </div>
        </div>
    );
};
