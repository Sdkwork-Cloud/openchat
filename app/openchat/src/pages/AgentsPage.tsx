
import React, { useState } from 'react';
import { navigate } from '../router';
import { useChatStore } from '../services/store';
import { AGENT_REGISTRY } from '../services/agentRegistry';
import { Platform } from '../platform';

// Enhanced Categories with IDs
const categories = [
    { id: 'all', label: '推荐' },
    { id: 'prod', label: '生产力' },
    { id: 'img', label: '图像' },
    { id: 'study', label: '学习' },
    { id: 'fun', label: '娱乐' }
];

export const AgentsPage: React.FC = () => {
  const { createSession } = useChatStore();
  const [activeCategory, setActiveCategory] = useState('all');

  const handleAgentClick = async (agentId: string) => {
    const sessionId = await createSession(agentId);
    navigate('/chat', { id: sessionId });
    Platform.device.vibrate(10);
  };

  // Algorithm: Filter based on Agent's internal tags (High Cohesion)
  const agentsList = Object.values(AGENT_REGISTRY).filter(agent => {
      // Hide core from list usually, but show here for demo if matched
      if (agent.id === 'omni_core') return false; 
      
      const tags = agent.tags || ['all'];
      return tags.includes(activeCategory);
  });

  return (
    <div style={{ paddingBottom: '20px', minHeight: '100%', background: 'var(--bg-body)' }}>
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
        padding: '12px 16px 12px 16px', 
        gap: '24px', 
        overflowX: 'auto',
        fontSize: '15px',
        color: 'var(--text-secondary)',
        borderBottom: '0.5px solid rgba(0,0,0,0.05)',
        background: 'var(--navbar-bg)',
        scrollbarWidth: 'none'
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
                        transition: 'color 0.2s'
                    }}
                >
                    {cat.label}
                    {isActive && (
                        <span style={{ 
                            position: 'absolute', 
                            bottom: '-8px', 
                            left: '50%', 
                            transform: 'translateX(-50%)', 
                            width: '16px', 
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

      {/* Banner */}
      {activeCategory === 'all' && (
          <div style={{ padding: '16px' }}>
            <div 
              onClick={() => navigate('/creation')}
              style={{ 
                height: '100px', 
                background: 'var(--primary-gradient)', 
                borderRadius: '12px', 
                padding: '20px',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)',
                cursor: 'pointer'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>构建你的专属 AI</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>0 代码，一句话创建智能体 →</div>
            </div>
          </div>
      )}

      {/* Agents Grid */}
      <div style={{ padding: '0 16px', marginTop: activeCategory !== 'all' ? '16px' : '0' }}>
        <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '16px', color: 'var(--text-primary)' }}>
            {activeCategory === 'all' ? '热门推荐' : categories.find(c => c.id === activeCategory)?.label}
        </div>
        
        {agentsList.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {agentsList.map(agent => (
                <div 
                  key={agent.id} 
                  onClick={() => handleAgentClick(agent.id)}
                  style={{ 
                    background: 'var(--bg-card)', 
                    borderRadius: '12px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ fontSize: '32px' }}>{agent.avatar}</div>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '15px', color: 'var(--text-primary)' }}>{agent.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{agent.description}</div>
                </div>
            ))}
            </div>
        ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                该分类下暂无智能体
            </div>
        )}
      </div>
    </div>
  );
};
