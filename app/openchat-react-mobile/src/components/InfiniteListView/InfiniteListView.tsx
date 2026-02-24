
import React, { useRef, useEffect, useState } from 'react';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import { StateView, ViewStatus } from '../StateView/StateView';
import { Spinner } from '../Spinner/Spinner';

interface InfiniteListViewProps<T> {
    data: T[];
    loading: boolean;
    hasMore?: boolean;
    error?: boolean;
    onRefresh: () => Promise<void>;
    onLoadMore?: () => Promise<void>;
    renderItem: (item: T, index: number) => React.ReactNode;
    renderSkeleton?: () => React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    onScroll?: (scrollTop: number) => void;
    emptyText?: string;
    emptyIcon?: string;
    restorationKey?: string;
    cols?: number;
    gap?: number;
    padding?: string | number;
}

export function InfiniteListView<T>({ 
    data, loading, hasMore = false, error = false,
    onRefresh, onLoadMore, renderItem, renderSkeleton, 
    header, footer, onScroll,
    emptyText, emptyIcon, restorationKey,
    cols = 1, gap = 12, padding = '16px'
}: InfiniteListViewProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');

    if (restorationKey) {
        useScrollRestoration(restorationKey, containerRef);
    }

    useEffect(() => {
        if (data.length > 0) setViewStatus('success');
        else if (loading) setViewStatus('loading');
        else if (error) setViewStatus('error');
        else setViewStatus('empty');
    }, [data.length, loading, error]);

    useEffect(() => {
        if (!onLoadMore || !hasMore || loading) return;
        
        // 优化：仅在 viewStatus 为 success 且不在加载中时观察
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !loading) {
                onLoadMore();
            }
        }, { 
            root: containerRef.current, 
            rootMargin: '400px' // 提前加载距离
        });
        
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore, data.length]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (onScroll) {
            onScroll(e.currentTarget.scrollTop);
        }
    };

    const layoutStyle: React.CSSProperties = cols > 1 ? {
        columnCount: cols,
        columnGap: `${gap}px`,
        width: '100%'
    } : {
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
        width: '100%'
    };

    return (
        <div 
            ref={containerRef} 
            onScroll={handleScroll}
            style={{ height: '100%', width: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
            {header}
            <StateView 
                status={viewStatus} 
                emptyText={emptyText} 
                emptyIcon={emptyIcon} 
                onRetry={onLoadMore}
                center={data.length === 0} // 仅在空数据时居中
                renderLoading={renderSkeleton ? () => (
                    <div style={{ ...layoutStyle, padding }}>
                        {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ marginBottom: gap }}>{renderSkeleton()}</div>)}
                    </div>
                ) : undefined}
            >
                <div style={{ ...layoutStyle, padding, boxSizing: 'border-box' }}>
                    {data.map((item, index) => (
                        <div key={index} style={cols > 1 ? { breakInside: 'avoid', marginBottom: gap } : {}}>
                            {renderItem(item, index)}
                        </div>
                    ))}
                </div>
                
                {/* Sentinel 加载占位 */}
                <div ref={sentinelRef} style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 1 : 0 }}>
                    {hasMore && <Spinner size={24} color="var(--primary-color)" />}
                </div>
                
                {footer}
            </StateView>
        </div>
    );
}
