
import React from 'react';
import { navigate } from '../router';
import { SearchInput } from '../components/SearchInput/SearchInput';
import { Grid, GridItem } from '../components/Grid/Grid';
import { Swiper } from '../components/Swiper/Swiper';
import { Widget } from '../components/Widget/Widget';
import { ArticleService, Article } from '../modules/content/services/ArticleService';
import { InfiniteListView } from '../components/InfiniteListView/InfiniteListView';
import { SmartImage } from '../components/SmartImage/SmartImage';
import { NoticeBar } from '../components/NoticeBar/NoticeBar';
import { Skeleton } from '../components/Skeleton/Skeleton';
import { useLiveQuery } from '../core/hooks';

// --- Components ---

const ServiceGrid = () => {
    const services = [
        { label: '朋友圈', icon: '🌈', path: '/moments', color: '#4080ff' },
        { label: '视频号', icon: '🎬', path: '/video-channel', color: '#FF9C6E' },
        { label: '扫一扫', icon: '📷', path: '/scan', color: '#2979FF' },
        { label: '看一看', icon: '👀', path: '/search', color: '#ffc300' },
        { label: '购物', icon: '🛍️', path: '/commerce/mall', color: '#fa5151' },
        { label: '接单', icon: '💼', path: '/discover/gigs', color: '#07c160' },
        { label: '小程序', icon: '🧩', path: '/agents', color: '#7928CA' },
        { label: '更多', icon: '⋮', path: '/general', color: '#888' },
    ];

    return (
        <Widget padding="12px 0">
            <Grid cols={4} gap={0}>
                {services.map(s => (
                    <GridItem 
                        key={s.label}
                        text={s.label}
                        icon={<div style={{ fontSize: '26px' }}>{s.icon}</div>}
                        onClick={() => navigate(s.path)}
                    />
                ))}
            </Grid>
        </Widget>
    );
};

const FeedCard: React.FC<{ item: Article }> = ({ item }) => (
    <div 
        onClick={() => navigate('/article/detail', { id: item.id })}
        style={{ 
            background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', 
            marginBottom: '8px', breakInside: 'avoid',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)', cursor: 'pointer'
        }}
    >
        <div style={{ position: 'relative' }}>
            <SmartImage src={item.cover} aspectRatio={item.type === 'video' ? '16/9' : '3/2'} />
            {item.type === 'video' && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
            )}
        </div>
        <div style={{ padding: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4, marginBottom: '6px', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {item.authorAvatar && <img src={item.authorAvatar} style={{ width: 14, height: 14, borderRadius: '50%' }} />}
                    <span>{item.source}</span>
                </div>
                <span>{item.reads > 999 ? (item.reads / 1000).toFixed(1) + 'k' : item.reads} 阅读</span>
            </div>
        </div>
    </div>
);

const BannerSection = () => (
    <Widget padding="0">
        <Swiper height="120px" style={{ borderRadius: '16px' }}>
            {[
                { id: 1, bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', title: 'OpenChat 3.0', sub: '全新架构 · 极致体验' },
                { id: 2, bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', title: '春日摄影大赛', sub: '赢取 ¥5000 奖金' },
            ].map(b => (
                <div key={b.id} style={{ width: '100%', height: '100%', background: b.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', color: 'white' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{b.title}</div>
                    <div style={{ fontSize: '13px', opacity: 0.9 }}>{b.sub}</div>
                </div>
            ))}
        </Swiper>
    </Widget>
);

export const DiscoverPage: React.FC = () => {
    // Standardized Data Fetching
    const { data: feedPage, loading, refresh } = useLiveQuery(
        ArticleService,
        () => ArticleService.getRecommendedFeed(1, 20),
        { deps: [] }
    );

    const feed = feedPage?.content || [];

    const Header = (
        <div style={{ padding: '0 12px', marginBottom: '12px' }}>
            <div style={{ paddingTop: '8px', paddingBottom: '12px' }}>
                <SearchInput value="" onChange={() => {}} onClick={() => navigate('/search')} placeholder="探索世界..." style={{ padding: 0, border: 'none', background: 'transparent' }} />
            </div>

            <ServiceGrid />
            
            <NoticeBar 
                text="🔥 热门：SpaceX 星舰试飞成功 · Sora 开放公测 · 苹果发布会定档"
                background="var(--bg-card)"
                color="var(--text-primary)"
                style={{ borderRadius: '12px', marginBottom: '12px', border: '1px solid rgba(0,0,0,0.03)' }}
                onClick={() => navigate('/search?q=hot')}
            />

            <BannerSection />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 12px 4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>推荐内容</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '12px' }}>For You</span>
            </div>
        </div>
    );

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <InfiniteListView
                    data={feed}
                    loading={loading}
                    onRefresh={refresh}
                    header={Header}
                    cols={2}
                    gap={8}
                    padding="0 12px 20px 12px"
                    renderItem={(item: Article) => <FeedCard key={item.id} item={item} />}
                    renderSkeleton={() => <Skeleton width="100%" height={200} style={{ borderRadius: '12px', marginBottom: '12px' }} />}
                />
            </div>
        </div>
    );
};
