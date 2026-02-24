
import React, { useState } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';
import { AgentService, CustomAgent } from '../services/AgentService';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { useLiveQuery } from '../../../core/hooks';
import { Page } from '../../../components/Page/Page';
import { Icon } from '../../../components/Icon/Icon';
import { Haptic } from '../../../utils/haptic';

const categories = [
    { id: 'all', label: '全部', icon: 'sparkles' },
    { id: 'prod', label: '生产力', icon: 'briefcase' },
    { id: 'img', label: '图像', icon: 'palette' },
    { id: 'study', label: '学习', icon: 'book' },
    { id: 'fun', label: '生活', icon: 'coffee' }
];

// --- 内部组件：精美智能体卡片 ---
const AgentPremiumCard: React.FC<{ agent: CustomAgent; onClick: () => void }> = ({ agent, onClick }) => {
    return (
        <div 
            onClick={onClick}
            style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '18px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                border: '0.5px solid var(--border-color)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.background = 'var(--bg-cell-active)'; }}
            onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
        >
            <div style={{ 
                width: '56px', height: '56px', borderRadius: '14px', 
                background: 'var(--bg-body)', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', fontSize: '30px', flexShrink: 0,
                position: 'relative', zIndex: 1,
                border: '1px solid var(--border-color)'
            }}>
                {agent.avatar}
            </div>

            <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{agent.name}</span>
                    {agent.isSystem && (
                        <div style={{ background: 'var(--primary-gradient)', color: 'white', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>Pro</div>
                    )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {agent.description}
                </div>
            </div>

            <div style={{ color: 'var(--text-placeholder)', opacity: 0.5 }}>
                <Icon name="arrow-right" size={18} strokeWidth={3} />
            </div>
        </div>
    );
};

// --- 骨架屏组件 ---
const AgentsSkeleton = () => (
    <div style={{ padding: '0px', width: '100%' }}>
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ padding: '18px', background: 'var(--bg-card)', borderRadius: '16px', marginBottom: '12px', display: 'flex', gap: '16px', border: '0.5px solid var(--border-color)' }}>
                <Skeleton width={56} height={56} style={{ borderRadius: '14px' }} />
                <div style={{ flex: 1 }}>
                    <Skeleton width="40%" height={20} style={{ marginBottom: '8px' }} />
                    <Skeleton width="100%" height={14} style={{ marginBottom: '6px' }} />
                    <Skeleton width="80%" height={14} />
                </div>
            </div>
        ))}
    </div>
);

export const AgentsPage: React.FC = () => {
    const { createSession } = useChatStore();
    const [activeCategory, setActiveCategory] = useState('all');

    const { data: agentsList, viewStatus, refresh } = useLiveQuery(
        AgentService,
        () => AgentService.getAgentsByCategory(activeCategory),
        { deps: [activeCategory] }
    );

    const handleAgentClick = async (agentId: string) => {
        Haptic.light();
        const sessionId = await createSession(agentId);
        navigate('/chat', { id: sessionId });
    };

    return (
        <Page
            title="发现智能体"
            rightElement={<div onClick={() => navigate('/search')} style={{ padding: '0 8px' }}><Icon name="search" size={24} /></div>}
            noPadding
            background="var(--bg-body)"
        >
            {/* 分类滚动条 */}
            <div style={{ 
                position: 'sticky', top: 0, zIndex: 10, 
                background: 'rgba(var(--navbar-bg-rgb), 0.8)', 
                backdropFilter: 'blur(20px)',
                borderBottom: '0.5px solid var(--border-color)',
                padding: '10px 0'
            }}>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                    {categories.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <div 
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); Haptic.selection(); }}
                                style={{
                                    padding: '6px 14px', borderRadius: '10px', whiteSpace: 'nowrap',
                                    background: isActive ? 'var(--primary-color)' : 'var(--bg-card)',
                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                    fontSize: '14px', fontWeight: isActive ? 600 : 400,
                                    transition: 'all 0.3s', border: '0.5px solid var(--border-color)',
                                    boxShadow: isActive ? '0 4px 12px rgba(41, 121, 255, 0.2)' : 'none'
                                }}
                            >
                                {cat.label}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 列表主体 */}
            <div style={{ padding: '16px', width: '100%', boxSizing: 'border-box' }}>
                <div 
                    onClick={() => navigate('/creation')}
                    style={{ 
                        height: '110px', background: 'var(--primary-gradient)', borderRadius: '18px', 
                        padding: '24px', color: 'white', marginBottom: '24px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(41, 121, 255, 0.25)', position: 'relative', overflow: 'hidden'
                    }}
                >
                    <div style={{ position: 'absolute', right: '-15px', bottom: '-20px', fontSize: '90px', opacity: 0.15 }}>🧠</div>
                    <div style={{ fontSize: '19px', fontWeight: 800, marginBottom: '6px' }}>构建你的专属 AI</div>
                    <div style={{ fontSize: '13px', opacity: 0.9 }}>无需代码，点击这里开启创作之旅 →</div>
                </div>

                {viewStatus === 'loading' ? (
                    <AgentsSkeleton />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {agentsList?.map((agent) => (
                            <AgentPremiumCard 
                                key={agent.id} 
                                agent={agent} 
                                onClick={() => handleAgentClick(agent.id)} 
                            />
                        ))}
                    </div>
                )}

                {viewStatus === 'success' && agentsList?.length === 0 && (
                    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-placeholder)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📡</div>
                        <div>当前分类暂无智能体</div>
                    </div>
                )}
            </div>
        </Page>
    );
};
