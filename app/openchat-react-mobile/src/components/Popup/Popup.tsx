
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Overlay } from '../Overlay/Overlay';
import { useScrollLock } from '../../hooks/useScrollLock';

export type PopupPosition = 'center' | 'bottom' | 'top' | 'left' | 'right';

export interface PopupProps {
    visible: boolean;
    onClose?: () => void;
    children: React.ReactNode;
    position?: PopupPosition;
    zIndex?: number;
    mask?: boolean;
    maskClosable?: boolean;
    round?: boolean; // Rounded corners
    safeArea?: boolean; // Padding for safe area
    destroyOnClose?: boolean; // Unmount content when closed
    style?: React.CSSProperties;
    className?: string;
    dragToClose?: boolean; // Enable drag gesture
}

export const Popup: React.FC<PopupProps> = ({ 
    visible, 
    onClose, 
    children, 
    position = 'center', 
    zIndex, 
    mask = true,
    maskClosable = true,
    round = false,
    safeArea = true,
    destroyOnClose = true,
    style,
    className = '',
    dragToClose = true // Default true for bottom popups
}) => {
    const [render, setRender] = useState(visible);
    const [active, setActive] = useState(false);
    
    // Physics State
    const [offsetY, setOffsetY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startTime = useRef(0);
    const contentRef = useRef<HTMLDivElement>(null);
    
    // Lock scroll when visible
    useScrollLock(visible);

    useEffect(() => {
        if (visible) {
            setRender(true);
            setOffsetY(0); // Reset drag
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setActive(true));
            });
        } else {
            setActive(false);
            const timer = setTimeout(() => {
                if (destroyOnClose) setRender(false);
                setOffsetY(0);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [visible, destroyOnClose]);

    // --- Gesture Logic ---
    const handleTouchStart = (e: React.TouchEvent) => {
        if (position !== 'bottom' || !dragToClose) return;
        
        // Only trigger if we are at the top of the content (to allow internal scrolling)
        if (contentRef.current && contentRef.current.scrollTop > 0) return;

        setIsDragging(true);
        startY.current = e.touches[0].clientY;
        startTime.current = Date.now();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY.current;

        if (deltaY > 0) {
            // Dragging down
            // Apply slight resistance (logarithmic) if needed, but direct 1:1 feels most responsive for sheets
            setOffsetY(deltaY);
            if (e.cancelable) e.preventDefault(); // Prevent body scroll
        } else {
            // Dragging up (Rubber band effect)
            setOffsetY(deltaY * 0.3); 
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const endTime = Date.now();
        const timeDiff = endTime - startTime.current;
        const velocity = offsetY / timeDiff;

        // Thresholds: Dragged more than 150px OR fast swipe down
        if (offsetY > 150 || (offsetY > 40 && velocity > 0.5)) {
            // Trigger Close
            if (onClose) onClose();
        } else {
            // Spring Back
            setOffsetY(0);
        }
    };

    if (!render && destroyOnClose) return null;

    // --- Style Logic ---
    const finalZIndex = zIndex !== undefined ? zIndex : 'var(--z-popup)';

    const getBaseStyle = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'fixed',
            background: 'var(--bg-card)',
            zIndex: finalZIndex as any,
            willChange: 'transform',
            ...style
        };

        const transitionStyle = isDragging 
            ? 'none' 
            : 'transform 0.3s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.3s cubic-bezier(0.33, 1, 0.68, 1)';

        if (position === 'center') {
            return {
                ...base,
                top: '50%', left: '50%',
                opacity: active ? 1 : 0,
                width: 'fit-content',
                maxWidth: '90%',
                borderRadius: round ? '16px' : '0',
                transform: active ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.9)',
                transition: transitionStyle
            };
        }

        if (position === 'bottom') {
            // Combine active state transform with drag offset
            const activeTransform = `translate3d(0, ${offsetY}px, 0)`;
            const inactiveTransform = 'translate3d(0, 100%, 0)';

            return {
                ...base,
                bottom: 0, left: 0, right: 0,
                transform: active ? activeTransform : inactiveTransform,
                borderRadius: round ? '24px 24px 0 0' : '0',
                paddingBottom: safeArea ? 'env(safe-area-inset-bottom)' : '0',
                maxHeight: '92%',
                display: 'flex',
                flexDirection: 'column',
                transition: transitionStyle
            };
        }
        
        // Other positions can be added similarly
        return base;
    };

    const handleMaskClick = () => {
        if (maskClosable && onClose) onClose();
    };

    const maskZIndex = typeof finalZIndex === 'number' ? finalZIndex - 1 : `calc(${finalZIndex} - 1)`;

    // Calculate mask opacity based on drag
    const maskOpacity = active ? Math.max(0, 1 - offsetY / 600) : 0; // Fade out as you drag down

    const content = (
        <>
            {mask && (
                <Overlay 
                    visible={active} // Overlay handles its own enter animation, but we control fade out on drag
                    onClick={handleMaskClick} 
                    zIndex={maskZIndex as any} 
                    customStyle={{ 
                        opacity: maskOpacity, 
                        transition: isDragging ? 'none' : 'opacity 0.3s' 
                    }} 
                />
            )}
            <div 
                ref={contentRef}
                className={`popup popup--${position} ${className}`} 
                style={getBaseStyle()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </>
    );

    return createPortal(content, document.body);
};
