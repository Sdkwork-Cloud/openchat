
import React, { useState, useEffect } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';
import { AgentService } from '../services/AgentService';
import { Agent } from '../../../types/core';

// Enhanced Categories with IDs
const categories = [
    { id: 'all', label: '全部' },
    { id: 'prod', label: '生产力' },
    { id: 'img', label: '图像创意' },
    { id: 'study', label: '语言学习' },
    { id: 'fun', label: '生活娱乐' }
];

const AgentListItem: React.FC<{ agent: Agent; onClick: () => void }> = ({ agent, onClick }) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
        <div 
            onClick={onClick}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            style={{ 
                display: 'flex', 
                padding: '16px', 
                background: isPressed ? 'var(--bg-cell-active)' : 'var(--bg-card)', 
                alignItems: 'center',
                borderBottom: '0.5px solid var(--border-color)',
                transition: 'background 0.1s',
                cursor: 'pointer'
            }}
        >
            {/* Avatar */}
            <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '10px', 
                background: 'var(--bg-cell-top)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '28px', 
                marginRight: '16px',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}>
                {agent.avatar}
            </div>

            {/* Content Info */}
            <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                <div style={{ 
                    fontSize: '17px', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)', 
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    {agent.name}
                    {agent.id === 'omni_core' && (
                        <span style={{ 
                            marginLeft: '6px', 
                            fontSize: '10px', 
                            background: 'var(--primary-color)', 
                            color: 'white', 
                            padding: '2px 4px', 
                            borderRadius: '4px',
                            fontWeight: 500 
                        }}>OFFICIAL</span>
                    )}
                </div>
                <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {agent.description}
                </div>
            </div>

            {/* Action Button */}
            <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'rgba(41, 121, 255, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--primary-color)'
            }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>
        </div>
    );
};

export const AgentsPage: React.FC = () => {
  const { createSession } = useChatStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [agentsList, setAgentsList] = useState<Agent[]>([]);

  useEffect(() => {
      const load = async () => {
          const res = await AgentService.getAgentsByCategory(activeCategory);
          if (res.success && res.data) {
              setAgentsList(res.data);
          }
      };
      load();
  }, [activeCategory]);

  const handleAgentClick = (agentId: string) => {
    const sessionId = createSession(agentId);
    navigate('/chat', { id: sessionId });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        height: '44px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--navbar-bg)',
        fontWeight: 600,
        fontSize: '17px',
        color: 'var(--text-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '0.5px solid var(--border-color)',
        backdropFilter: 'blur(10px)',
        paddingTop: 'env(safe-area-inset-top)'
      }}>
        <span>智能体广场</span>
        <div 
            onClick={() => navigate('/search')}
            style={{ position: 'absolute', right: '16px', bottom: 0, height: '44px', display: 'flex', alignItems: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
        </div>
      </div>

      {/* Interactive Categories */}
      <div style={{ 
        display: 'flex', 
        padding: '12px 16px', 
        gap: '24px', 
        overflowX: 'auto',
        fontSize: '15px',
        color: 'var(--text-secondary)',
        borderBottom: '0.5px solid rgba(0,0,0,0.05)',
        background: 'var(--navbar-bg)',
        scrollbarWidth: 'none',
        flexShrink: 0
      }}>
        {categories.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
                <span 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    style={{ 
                        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', 
                        fontWeight: isActive ? 600 : 400, 
                        position: 'relative',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'color 0.2s',
                        paddingBottom: '6px'
                    }}
                >
                    {cat.label}
                    {isActive && (
                        <span style={{ 
                            position: 'absolute', 
                            bottom: '0', 
                            left: '50%', 
                            transform: 'translateX(-50%)', 
                            width: '20px', 
                            height: '3px', 
                            background: 'var(--primary-color)', 
                            borderRadius: '2px',
                            transition: 'all 0.2s'
                        }}></span>
                    )}
                </span>
            );
        })}
      </div>

      {/* Agents List (Rows) */}
      <div style={{ flex: 1, paddingBottom: '20px' }}>
        {activeCategory !== 'all' && (
            <div style={{ padding: '12px 16px 8px 16px', fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>
                {categories.find(c => c.id === activeCategory)?.label}
            </div>
        )}
        
        {agentsList.length > 0 ? (
            <div style={{ 
                background: 'var(--bg-card)', 
                borderTop: activeCategory === 'all' ? 'none' : '0.5px solid var(--border-color)', 
                borderBottom: '0.5px solid var(--border-color)' 
            }}>
                {agentsList.map(agent => (
                    <AgentListItem 
                        key={agent.id} 
                        agent={agent} 
                        onClick={() => handleAgentClick(agent.id)} 
                    />
                ))}
            </div>
        ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>🍃</div>
                <div style={{ fontSize: '14px' }}>该分类下暂无智能体</div>
            </div>
        )}
      </div>
    </div>
  );
};
