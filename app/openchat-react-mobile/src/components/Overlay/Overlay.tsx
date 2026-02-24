
import React, { useEffect, useState } from 'react';

interface OverlayProps {
    visible: boolean;
    onClick?: () => void;
    duration?: number;
    zIndex?: number;
    blur?: boolean;
    customStyle?: React.CSSProperties;
    opacity?: number;
}

export const Overlay: React.FC<OverlayProps> = ({ 
    visible, 
    onClick, 
    duration = 350, 
    zIndex = 1000, 
    blur = true,
    opacity = 0.5,
    customStyle 
}) => {
    const [render, setRender] = useState(visible);
    const [active, setActive] = useState(false);

    useEffect(() => {
        if (visible) {
            setRender(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setActive(true));
            });
        } else {
            setActive(false);
            const timer = setTimeout(() => setRender(false), duration);
            return () => clearTimeout(timer);
        }
    }, [visible, duration]);

    if (!render) return null;

    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            style={{ 
                position: 'fixed', 
                inset: 0, 
                zIndex, 
                background: `rgba(0,0,0,${opacity})`, 
                backdropFilter: blur ? (active ? 'blur(10px) saturate(150%)' : 'blur(0px) saturate(100%)') : 'none',
                WebkitBackdropFilter: blur ? (active ? 'blur(10px) saturate(150%)' : 'blur(0px) saturate(100%)') : 'none',
                opacity: active ? 1 : 0,
                transition: `all ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`,
                touchAction: 'none',
                willChange: 'backdrop-filter, opacity',
                ...customStyle
            }} 
        />
    );
};
