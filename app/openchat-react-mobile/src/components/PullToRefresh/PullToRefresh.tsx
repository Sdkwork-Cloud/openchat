
import React, { useRef, useState, useEffect } from 'react';
import { Haptic } from '../../utils/haptic';
import { useTranslation } from '../../core/i18n/I18nContext';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    const { t } = useTranslation();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const state = useRef({ startY: 0, currentY: 0, active: false, hapticTriggered: false });

    const TRIGGER_HEIGHT = 80;
    const MAX_HEIGHT = 160;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY > 0 || isRefreshing) return;
        state.current.startY = e.touches[0].clientY;
        state.current.active = true;
        state.current.hapticTriggered = false;
        if (contentRef.current) contentRef.current.style.transition = 'none';
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!state.current.active) return;
        const diff = e.touches[0].clientY - state.current.startY;
        if (diff > 0) {
            // Apply iOS-like rubber band formula
            const damping = 0.5;
            const y = Math.pow(diff, 0.85) * damping;
            state.current.currentY = Math.min(y, MAX_HEIGHT);
            
            if (state.current.currentY > TRIGGER_HEIGHT && !state.current.hapticTriggered) {
                Haptic.selection();
                state.current.hapticTriggered = true;
            }

            if (contentRef.current) {
                contentRef.current.style.transform = `translate3d(0, ${state.current.currentY}px, 0)`;
            }
        }
    };

    const handleTouchEnd = async () => {
        if (!state.current.active) return;
        state.current.active = false;
        
        if (state.current.currentY > TRIGGER_HEIGHT) {
            setIsRefreshing(true);
            Haptic.medium();
            if (contentRef.current) {
                contentRef.current.style.transition = 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
                contentRef.current.style.transform = `translate3d(0, ${TRIGGER_HEIGHT}px, 0)`;
            }
            await onRefresh();
            Haptic.success();
        }

        setIsRefreshing(false);
        if (contentRef.current) {
            contentRef.current.style.transition = 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
            contentRef.current.style.transform = 'translate3d(0, 0, 0)';
        }
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: TRIGGER_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                {isRefreshing ? <div className="loading-spinner" /> : (state.current.currentY > TRIGGER_HEIGHT ? '松开刷新' : '下拉刷新')}
            </div>
            <div ref={contentRef} style={{ background: 'var(--bg-body)', position: 'relative', zIndex: 1 }}>
                {children}
            </div>
            <style>{`
                .loading-spinner { width: 20px; height: 20px; border: 2px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
