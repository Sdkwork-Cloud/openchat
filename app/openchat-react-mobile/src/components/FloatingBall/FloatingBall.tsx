
import React, { useRef, useState, useEffect } from 'react';
import { navigate } from '../../router';
import { Platform } from '../../platform';
import { ActionSheet } from '../ActionSheet';

export const FloatingBall: React.FC = () => {
    const ballRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: window.innerWidth - 60, y: window.innerHeight - 200 });
    const [isDragging, setIsDragging] = useState(false);
    const [opacity, setOpacity] = useState(0.8);
    const offset = useRef({ x: 0, y: 0 });
    const idleTimer = useRef<any>(null);

    // Initial positioning safe area check
    useEffect(() => {
        setPos({ x: window.innerWidth - 60, y: window.innerHeight - 200 });
        resetIdleTimer();
    }, []);

    const resetIdleTimer = () => {
        setOpacity(1);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => {
            setOpacity(0.5); // Fade out when idle
        }, 3000);
    };

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        setIsDragging(true);
        resetIdleTimer();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        offset.current = {
            x: clientX - pos.x,
            y: clientY - pos.y
        };
        // Disable transition during drag
        if (ballRef.current) ballRef.current.style.transition = 'none';
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        let newX = clientX - offset.current.x;
        let newY = clientY - offset.current.y;
        
        // Boundaries
        const maxX = window.innerWidth - 50;
        const maxY = window.innerHeight - 100;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(60, Math.min(newY, maxY));

        setPos({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (ballRef.current) ballRef.current.style.transition = 'all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';

        // Snap to edge
        const mid = window.innerWidth / 2;
        const snapX = pos.x < mid ? 8 : window.innerWidth - 58;
        setPos(p => ({ ...p, x: snapX }));
        
        resetIdleTimer();
    };

    const handleClick = () => {
        if (isDragging) return; // Prevent click after drag
        Platform.device.vibrate(10);
        
        // Show Quick Menu via Global ActionSheet
        ActionSheet.showActions({
            title: "OpenChat AI 助手",
            actions: [
                { text: '💬 新建对话', key: 'chat', color: '#2979FF' },
                { text: '📷 拍照识别', key: 'scan', color: '#07c160' },
                { text: '🎨 AI 绘画', key: 'creation', color: '#FF9C6E' },
                { text: '🔍 全局搜索', key: 'search' }
            ]
        }).then(item => {
            if (!item) return;
            switch(item.key) {
                case 'chat': navigate('/chat', { id: 'omni_core' }); break;
                case 'scan': navigate('/scan'); break;
                case 'creation': navigate('/creation'); break;
                case 'search': navigate('/search'); break;
            }
        });
    };

    return (
        <div 
            ref={ballRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onClick={handleClick}
            style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(30, 30, 30, 0.85)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2)',
                zIndex: 2100, // Above content, below modal masks
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: opacity,
                transition: isDragging ? 'none' : 'opacity 0.3s',
                touchAction: 'none' // Important for drag
            }}
        >
            <div style={{ fontSize: '24px' }}>🤖</div>
            {/* Status Dot */}
            <div style={{ position: 'absolute', top: 12, right: 10, width: '8px', height: '8px', background: '#07c160', borderRadius: '50%', border: '1px solid #333' }} />
        </div>
    );
};
