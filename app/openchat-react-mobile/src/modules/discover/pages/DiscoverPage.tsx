
import React, { useMemo, useCallback } from 'react';
import { navigate } from '../../../router';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { Grid, GridItem } from '../../../components/Grid/Grid';
import { Swiper } from '../../../components/Swiper/Swiper';
import { ArticleService, Article } from '../../content/services/ArticleService';
import { InfiniteListView } from '../../../components/InfiniteListView/InfiniteListView';
import { SmartImage } from '../../../components/SmartImage/SmartImage';
import { NoticeBar } from '../../../components/NoticeBar/NoticeBar';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { useLiveQuery } from '../../../core/hooks';
import { Icon, IconName } from '../../../components/Icon/Icon';
import { useTranslation } from '../../../core/i18n/I18nContext';
import { Page } from '../../../components/Page/Page';

const ServiceGrid = () => {
    const { t } = useTranslation();
    const services: Array<{ label: string, icon: IconName, path: string, color: string, bg: string }> = [
        { label: t('discover.moments'), icon: 'moments', path: '/moments', color: '#4080ff', bg: 'rgba(64, 128, 255, 0.08)' },
        { label: t('discover.channels'), icon: 'video-channel', path: '/video-channel', color: '#FF9C6E', bg: 'rgba(255, 156, 110, 0.08)' },
        { label: t('action.scan'), icon: 'scan', path: '/scan', color: '#2979FF', bg: 'rgba(41, 121, 255, 0.08)' },
        { label: t('discover.look'), icon: 'search', path: '/search', color: '#ffc300', bg: 'rgba(255, 195, 0, 0.08)' },
        { label: t('discover.mall'), icon: 'shop', path: '/commerce/mall', color: '#fa5151', bg: 'rgba(250, 81, 81, 0.08)' },
        { label: t('discover.gigs'), icon: 'gig', path: '/discover/gigs', color: '#07c160', bg: 'rgba(7, 193, 96, 0.08)' },
        { label: t('discover.miniapp'), icon: 'miniapp', path: '/agents', color: '#7928CA', bg: 'rgba(121, 40, 202, 0.08)' },
        { label: t('action.more'), icon: 'more', path: '/general', color: '#888', bg: 'rgba(128, 128, 128, 0.08)' },
    ];

    return (
        <div style={{ marginBottom: '16px', background: 'var(--bg-card)', borderRadius: '20px', padding: '12px 4px' }}>
            <Grid cols={4} gap={0}>
                {services.map(s => (
                    <GridItem 
                        key={s.label}
                        text={s.label}
                        icon={
                            <div style={{ 
                                width: '48px', height: '48px', borderRadius: '14px', 
                                background: s.bg, display: 'flex', alignItems: 'center', 
                                justifyContent: 'center'
                            }}>
                                <Icon name={s.icon} size={28} color={s.color} />
                            </div>
                        }
                        onClick={() => navigate(s.path)}
                    />
                ))}
            </Grid>
        </div>
    );
};

const FeedCard: React.FC<{ item: Article }> = ({ item }) => (
    <div 
        onClick={() => navigate('/article/detail', { id: item.id })}
        style={{ 
            borderRadius: '16px', overflow: 'hidden', 
            marginBottom: '12px', background: 'var(--bg-card)',
            border: '0.5px solid var(--border-color)',
            cursor: 'pointer'
        }}
    >
        <div style={{ position: 'relative', width: '100%' }}>
            <SmartImage src={item.cover} aspectRatio={item.type === 'video' ? '16/9' : '4/3'} radius="16px 16px 0 0" />
            {item.type === 'video' && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', borderRadius: '20px', padding: '2px 8px', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="video-channel" size={12} color="white" /> 视频号
                </div>
            )}
        </div>
        <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.4, marginBottom: '8px', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-body)', overflow: 'hidden' }}>
                        <img src={item.authorAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.source}`} style={{ width: '100%' }} />
                    </div>
                    <span>{item.source}</span>
                </div>
                <span>{item.reads > 999 ? (item.reads / 1000).toFixed(1) + 'k' : item.reads} 阅读</span>
            </div>
        </div>
    </div>
);

export const DiscoverPage: React.FC = () => {
    const { t } = useTranslation();

    // 锁定查询函数引用
    const fetchFeed = useCallback(() => ArticleService.getRecommendedFeed(1, 20), []);

    const { data: feedPage, viewStatus, refresh } = useLiveQuery(
        ArticleService,
        fetchFeed,
        { deps: [] }
    );

    const feed = feedPage?.content || [];

    const Header = useMemo(() => (
        <div style={{ padding: '16px 12px 0 12px' }}>
            <div style={{ marginBottom: '16px' }}>
                <SearchInput value="" onChange={() => {}} onClick={() => navigate('/search')} placeholder="大家都在搜：Sora 创作技巧" style={{ padding: 0, border: 'none', background: 'transparent' }} />
            </div>

            <Swiper height="140px" style={{ borderRadius: '20px', marginBottom: '16px' }}>
                {[
                    { id: 1, bg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', title: '数字人克隆计划', sub: '复刻你的声音与容貌' },
                    { id: 2, bg: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', title: 'AI 绘画大赏', sub: '由 Midjourney V6 全程驱动' },
                ].map(b => (
                    <div key={b.id} style={{ width: '100%', height: '100%', background: b.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', color: 'white' }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>{b.title}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>{b.sub}</div>
                    </div>
                ))}
            </Swiper>

            <ServiceGrid />
            
            <NoticeBar 
                text="🔥 全新功能：现在你可以直接在聊天室中调用 AI 搜索工具了"
                background="var(--bg-card)"
                color="var(--primary-color)"
                style={{ borderRadius: '14px', marginBottom: '24px', border: '0.5px solid var(--border-color)', height: '40px' }}
                mode="link"
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '4px' }}>
                <div style={{ width: '4px', height: '18px', background: 'var(--primary-color)', borderRadius: '2px' }} />
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('discover.feed_title')}</span>
            </div>
        </div>
    ), [t]);

    return (
        <Page noNavbar noPadding background="var(--bg-body)">
            <InfiniteListView
                data={feed}
                loading={viewStatus === 'loading'}
                onRefresh={refresh}
                header={Header}
                cols={2}
                gap={12}
                padding="0 12px 100px 12px"
                renderItem={(item: Article) => <FeedCard key={item.id} item={item} />}
                renderSkeleton={() => <Skeleton width="100%" height={220} style={{ borderRadius: '16px' }} />}
                emptyText="暂无内容"
            />
        </Page>
    );
};
