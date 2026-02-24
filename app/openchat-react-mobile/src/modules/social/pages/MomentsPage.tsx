
import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { ImageViewer } from '../../../components/ImageViewer/ImageViewer';
import { navigate } from '../../../router';
import { MomentsService, Moment } from '../services/MomentsService';
import { Toast } from '../../../components/Toast';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { SmartImage } from '../../../components/SmartImage/SmartImage'; 
import { Haptic } from '../../../utils/haptic';
import { InfiniteListView } from '../../../components/InfiniteListView/InfiniteListView';
import { StateView } from '../../../components/StateView/StateView';
import { useTranslation } from '../../../core/i18n/I18nContext';

const MomentItem = memo(({ item, onImageClick, onLike }: { item: Moment, onImageClick: (urls: string[], idx: number) => void, onLike: (id: string) => void }) => {
    
    const renderImages = () => {
        if (!item.images || item.images.length === 0) return null;

        if (item.images.length === 1) {
            return (
                <div style={{ marginTop: '8px', marginBottom: '12px', maxWidth: '240px' }}>
                    <SmartImage
                        src={item.images[0]}
                        aspectRatio="3/4"
                        radius={6}
                        onClick={(e) => { e.stopPropagation(); onImageClick(item.images, 0); }}
                        preview={false} 
                    />
                </div>
            );
        }

        return (
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '6px', 
                maxWidth: '300px', 
                marginBottom: '12px', marginTop: '8px'
            }}> 
                {item.images.map((img: string, idx: number) => ( 
                    <div key={idx} onClick={(e) => { e.stopPropagation(); onImageClick(item.images, idx); }}>
                        <SmartImage 
                            src={img}
                            aspectRatio="1/1"
                            radius={4}
                            preview={false}
                        />
                    </div>
                ))} 
            </div> 
        );
    };

    return (
        <div style={{ padding: '0 0 24px 0', borderBottom: '0.5px solid var(--border-color)', display: 'flex', gap: '12px', marginBottom: '20px' }}> 
            <div onClick={(e) => { e.stopPropagation(); navigate('/contact/profile', { name: item.author }); }}>
                <SmartImage 
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.avatar}`}
                    containerStyle={{ width: '44px', height: '44px' }}
                    radius={8}
                    skeletonVariant="rect"
                />
            </div>
            <div style={{ flex: 1 }}> 
                <div style={{ color: '#576b95', fontWeight: 600, fontSize: '17px', marginBottom: '6px' }}>{item.author}</div> 
                <div style={{ fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}> 
                    {item.content}
                </div> 
                
                {renderImages()}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}> 
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span>{item.displayTime}</span>
                        {item.hasLiked && <span style={{ color: '#576b95' }}>❤️ {item.likes}</span>}
                    </div>
                    <div 
                        onClick={() => onLike(item.id)}
                        style={{ background: 'var(--bg-cell-active)', padding: '2px 10px', borderRadius: '4px', fontWeight: 'bold', color: '#576b95', cursor: 'pointer' }}
                    >
                        ••
                    </div> 
                </div> 
                
                {item.comments && item.comments.length > 0 && (
                    <div style={{ marginTop: '10px', background: 'var(--bg-cell-top)', padding: '6px 8px', borderRadius: '4px' }}>
                        {item.comments.map((c, i) => (
                            <div key={i} style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '2px' }}>
                                <span style={{ color: '#576b95', fontWeight: 500 }}>{c.user}</span>: <span style={{ color: 'var(--text-primary)' }}>{c.text}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div> 
        </div> 
    );
});

const MomentsSkeleton = () => (
    <div style={{ padding: '0 0 24px 0', display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <Skeleton width={44} height={44} variant="rect" style={{borderRadius: 8}} />
        <div style={{ flex: 1, paddingTop: '4px' }}>
            <Skeleton width="40%" height={18} style={{ marginBottom: '12px' }} />
            <Skeleton width="100%" height={16} style={{ marginBottom: '8px' }} />
            <Skeleton width="90%" height={16} style={{ marginBottom: '16px' }} />
            <Skeleton width={200} height={200} variant="rect" style={{ marginBottom: '12px', borderRadius: 6 }} />
        </div>
    </div>
);

export const MomentsPage: React.FC = () => {
    const { t } = useTranslation();
    const [feed, setFeed] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isError, setIsError] = useState(false);
    
    // Direct DOM manipulation refs for 60fps parallax
    const headerBgRef = useRef<HTMLDivElement>(null);
    const headerContentRef = useRef<HTMLDivElement>(null);

    const loadData = async (page = 1) => {
        if (page === 1) setLoading(true);
        setIsError(false);
        
        try {
            const res = await MomentsService.getFeed(page);
            if (res.success && res.data) {
                if (page === 1) {
                    setFeed(res.data.content);
                } else {
                    setFeed(prev => [...prev, ...res.data!.content]);
                }
                // Mock pagination end
                if (res.data.content.length < 10) setHasMore(false);
            } else {
                setIsError(true);
            }
        } catch (e) {
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);
    
    const handleImageClick = (urls: string[], idx: number) => {
        ImageViewer.show(urls, idx);
    };

    const handleLike = async (id: string) => {
        Haptic.light();
        await MomentsService.likeMoment(id);
        setFeed(prev => prev.map(m => m.id === id ? { ...m, hasLiked: !m.hasLiked, likes: m.hasLiked ? m.likes - 1 : m.likes + 1 } : m));
    };

    const handlePublish = async () => {
        Haptic.medium();
        const content = prompt(t('moments.publish_placeholder'), "今天天气真好 🌞");
        if (content) {
            Toast.loading(t('moments.sending'));
            await MomentsService.publish(content);
            setTimeout(() => {
                Toast.success(t('moments.publish_success'));
                loadData(1); 
            }, 800);
        }
    };

    // Performance Critical: Direct DOM manipulation for parallax
    const handleScroll = useCallback((scrollTop: number) => {
        if (headerBgRef.current) {
            if (scrollTop < 0) {
                // Pull down: Scale Effect
                const scale = 1 + Math.abs(scrollTop) / 320;
                headerBgRef.current.style.transform = `translateY(${scrollTop}px) scale(${scale})`;
            } else {
                // Scroll up: Parallax
                headerBgRef.current.style.transform = `translateY(${scrollTop * 0.5}px)`;
            }
        }
        
        if (headerContentRef.current) {
             const opacity = Math.max(0, 1 - scrollTop / 200);
             headerContentRef.current.style.opacity = String(opacity);
        }
    }, []);

    // --- Header Component ---
    const ParallaxHeader = (
        <div style={{ position: 'relative', height: '320px', marginBottom: '40px' }}>
            <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, height: '100%', 
                overflow: 'hidden', zIndex: 0 
            }}>
                <div 
                    ref={headerBgRef}
                    style={{ 
                        width: '100%', height: '100%', 
                        transformOrigin: 'top center',
                        willChange: 'transform' // Hint to browser for composition
                    }}
                >
                    <SmartImage 
                        src="https://picsum.photos/800/800?grayscale" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
            </div>
            
            <div 
                ref={headerContentRef}
                style={{ 
                    position: 'absolute', bottom: '-40px', right: '16px', 
                    display: 'flex', alignItems: 'flex-end', gap: '16px', zIndex: 2,
                    willChange: 'opacity'
                }}
            > 
                <div style={{ color: 'white', fontWeight: 600, paddingBottom: '50px', textShadow: '0 1px 4px rgba(0,0,0,0.8)', fontSize: '20px' }}>AI User</div> 
                <div onClick={() => navigate('/profile/self')}>
                    <SmartImage 
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                        containerStyle={{ width: '84px', height: '84px', border: '3px solid var(--bg-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        radius={12}
                    />
                </div> 
            </div> 
        </div>
    );

    // Initial View Status (Simplified for Infinite List context)
    const initialStatus = loading && feed.length === 0 ? 'loading' : (isError ? 'error' : 'success');

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
             <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
                <Navbar 
                    title="" 
                    variant="transparent"
                    backFallback="/discover"
                    rightElement={
                        <div onClick={handlePublish} style={{padding: '8px', cursor: 'pointer'}}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                    } 
                />
             </div>
             
             {initialStatus === 'error' ? (
                 <StateView status="error" onRetry={() => loadData(1)}>
                     <div />
                 </StateView>
             ) : (
                 <div style={{ flex: 1, overflow: 'hidden' }}>
                     <InfiniteListView
                        data={feed}
                        loading={loading}
                        hasMore={hasMore}
                        error={isError}
                        onRefresh={() => loadData(1)}
                        onLoadMore={() => loadData(Math.ceil(feed.length / 10) + 1)}
                        onScroll={handleScroll}
                        header={ParallaxHeader}
                        restorationKey="moments_feed"
                        padding="0 16px 40px 16px"
                        renderItem={(item: Moment, idx) => (
                            <MomentItem key={item.id} item={item} onImageClick={handleImageClick} onLike={handleLike} />
                        )}
                        renderSkeleton={() => <MomentsSkeleton />}
                     />
                </div>
             )}
        </div>
    );
};
