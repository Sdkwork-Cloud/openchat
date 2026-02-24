
import React, { useState } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { navigate } from '../../../router';
import { FavoritesService, FavoriteItem } from '../services/FavoritesService';
import { useDebounce } from '../../../hooks/useDebounce';
import { Empty } from '../../../components/Empty/Empty';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';

const CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: 'image', label: '图片与视频' },
    { id: 'link', label: '链接' },
    { id: 'file', label: '文件' },
    { id: 'chat', label: '聊天记录' },
    { id: 'note', label: '笔记' },
];

const FavoriteListItem: React.FC<{ item: FavoriteItem }> = ({ item }) => {
    const getIcon = (type: string) => {
        switch(type) {
            case 'file': return <div style={{width: 40, height: 40, background: '#f56c6c', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 10}}>PDF</div>;
            case 'link': return <div style={{width: 40, height: 40, background: '#409EFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>🔗</div>;
            case 'doc': return <div style={{width: 40, height: 40, background: '#67C23A', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>📑</div>;
            case 'chat': return <div style={{width: 40, height: 40, background: '#E6A23C', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>💬</div>;
            case 'image': return <div style={{width: 40, height: 40, backgroundImage: `url(${item.url})`, backgroundSize: 'cover', borderRadius: 6}} />;
            default: return <div style={{width: 40, height: 40, background: '#909399', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>📝</div>;
        }
    };

    const formatDate = (ts: number) => {
        const date = new Date(ts);
        return date.toLocaleDateString();
    };

    return (
        <div style={{ 
            padding: '16px', 
            background: 'var(--bg-card)', 
            marginBottom: '1px',
            display: 'flex', 
            gap: '12px',
            cursor: 'pointer'
        }}
        onClick={() => navigate('/general', { title: '收藏详情' })}
        >
            {getIcon(item.type)}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ maxWidth: '70%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content || item.size || item.source}</span>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>{formatDate(item.createTime)}</span>
                </div>
            </div>
        </div>
    );
};

export const FavoritesPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);

    const { data: pageData, viewStatus, refresh } = useLiveQuery(
        FavoritesService,
        () => FavoritesService.getFavorites(activeCategory, debouncedQuery),
        { deps: [activeCategory, debouncedQuery] }
    );

    const items = pageData?.content || [];

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="我的收藏" rightElement={<div style={{ padding: '0 8px', fontSize: '20px', cursor: 'pointer' }}>+</div>} />
            
            {/* Search Bar */}
            <div style={{ padding: '10px 16px', background: 'var(--bg-body)' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: '8px', height: '36px', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        placeholder="搜索收藏内容" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '15px', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>

            {/* Categories */}
            <div style={{ display: 'flex', overflowX: 'auto', padding: '0 16px 12px 16px', gap: '8px', scrollbarWidth: 'none', flexShrink: 0 }}>
                {CATEGORIES.map(cat => (
                    <div 
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            background: activeCategory === cat.id ? 'var(--primary-color)' : 'var(--bg-card)',
                            color: activeCategory === cat.id ? 'white' : 'var(--text-secondary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        {cat.label}
                    </div>
                ))}
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <StateView
                    status={viewStatus}
                    onRetry={refresh}
                    emptyText="无相关收藏"
                    emptyIcon="📭"
                >
                    <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                        {items.map((item) => (
                            <FavoriteListItem key={item.id} item={item} />
                        ))}
                    </div>
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {items.length} 条内容
                    </div>
                </StateView>
            </div>
        </div>
    );
};
