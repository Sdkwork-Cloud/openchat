
import React, { useRef } from 'react';
import { Navbar, NavbarProps } from '../Navbar/Navbar';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import { PullToRefresh } from '../PullToRefresh/PullToRefresh';
import { StateView, ViewStatus } from '../StateView/StateView';

interface PageProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    title?: string;
    onBack?: () => void;
    rightElement?: React.ReactNode;
    navbarVariant?: NavbarProps['variant']; 
    backFallback?: string;
    noNavbar?: boolean;
    noPadding?: boolean; 
    background?: string;
    scrollKey?: string; 
    onRefresh?: () => Promise<void>; 
    status?: ViewStatus;
    onRetry?: () => void;
    loadingText?: string;
}

export const Page: React.FC<PageProps> = ({ 
    children, 
    style, 
    className = '',
    title,
    onBack,
    rightElement,
    navbarVariant = 'default',
    backFallback,
    noNavbar = false,
    noPadding = false,
    background = 'var(--bg-body)',
    scrollKey,
    onRefresh,
    status = 'success',
    onRetry,
    loadingText
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 自动滚动恢复
    if (scrollKey) {
        useScrollRestoration(scrollKey, scrollContainerRef);
    }

    const isTransparentNav = navbarVariant === 'transparent';

    const renderContent = () => {
        const inner = (
            <StateView status={status} onRetry={onRetry} center={true} loadingText={loadingText}>
                {children}
            </StateView>
        );

        const scrollWrapper = (
             <div 
                ref={scrollContainerRef}
                className="page-scroll-content"
                style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    padding: noPadding ? 0 : '16px',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                    paddingTop: isTransparentNav ? 0 : undefined,
                }}
            >
                {inner}
            </div>
        );

        if (onRefresh) {
            return (
                <PullToRefresh onRefresh={onRefresh}>
                    {scrollWrapper}
                </PullToRefresh>
            );
        }
        return scrollWrapper;
    };

    return (
        <div 
            className={`page-container ${className}`}
            style={{ 
                height: '100%',
                width: '100%',
                background: background, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                position: 'relative',
                ...style 
            }}
        >
            {!noNavbar && (
                <Navbar title={title || ''} onBack={onBack} backFallback={backFallback} rightElement={rightElement} variant={navbarVariant} />
            )}
            {renderContent()}
        </div>
    );
};
