
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { navigate } from '../router';
import { useChatStore } from '../services/store';
import { AGENT_REGISTRY, getAgent } from '../services/agentRegistry';
import { Toast } from '../components/Toast';

// Highlighting Component
const HighlightText = ({ text, highlight, color = '#2979FF' }: { text: string, highlight: string, color?: string }) => {
    if (!highlight.trim()) return <>{text}</>;
    
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} style={{ color: color, fontWeight: 600 }}>{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { sessions, createSession } = useChatStore();

  useEffect(() => {
    const timer = setTimeout(() => {
        inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return { agents: [], chats: [] };
    const lowerQuery = query.toLowerCase();
    
    // Search Agents
    const matchedAgents = Object.values(AGENT_REGISTRY).filter(agent => 
        agent.name.toLowerCase().includes(lowerQuery) || 
        agent.description.toLowerCase().includes(lowerQuery)
    );
    
    // Search Chats
    const matchedChats = sessions.filter(session => {
        const agent = getAgent(session.agentId);
        const nameMatch = agent.name.toLowerCase().includes(lowerQuery);
        const msgMatch = session.messages.some(m => m.content.toLowerCase().includes(lowerQuery));
        return nameMatch || msgMatch;
    });
    
    return { agents: matchedAgents, chats: matchedChats };
  }, [query, sessions]);

  const handleAgentClick = (agentId: string) => {
      const sessionId = createSession(agentId);
      navigate('/chat', { id: sessionId });
  };

  const handleChatClick = (sessionId: string, messageId?: string) => {
      // Pass messageId for deep linking highlight
      navigate('/chat', { id: sessionId, msgId: messageId || '' });
  };

  const handleSearchWeb = () => {
      Toast.loading('正在连接全网搜索...');
      setTimeout(() => {
          Toast.hide();
          navigate('/general', { title: '全网搜索结果' });
      }, 1000);
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
      {/* Search Header */}
      <div style={{
        padding: '8px 12px 12px 12px',
        background: 'var(--navbar-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        borderBottom: '0.5px solid var(--border-color)'
      }}>
        <div style={{
          flex: 1,
          background: 'var(--bg-body)', 
          borderRadius: '8px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索智能体、聊天记录..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '16px',
              flex: 1,
              color: 'var(--text-primary)',
              height: '100%'
            }}
          />
          {query.length > 0 && (
             <div onClick={() => setQuery('')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
             </div>
          )}
        </div>
        
        <div 
          onClick={() => navigate('/')}
          style={{ fontSize: '16px', color: 'var(--primary-color)', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          取消
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {!query && (
            <div style={{ padding: '40px 24px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>搜索指定内容</div>
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', color: 'var(--primary-color)', fontSize: '15px', fontWeight: 500 }}>
                    <span onClick={() => navigate('/agents')}>智能体</span>
                    <span>聊天记录</span>
                    <span>文件</span>
                </div>
            </div>
        )}

        {query && (
            <div>
                {/* Local Results */}
                {results.agents.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', marginBottom: '12px' }}>
                        <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border-color)' }}>智能体</div>
                        {results.agents.map(agent => (
                            <div 
                                key={agent.id}
                                onClick={() => handleAgentClick(agent.id)}
                                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', borderBottom: '0.5px solid var(--border-color)', cursor: 'pointer' }}
                            >
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-cell-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '12px' }}>{agent.avatar}</div>
                                <div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '16px' }}>
                                        <HighlightText text={agent.name} highlight={query} />
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{agent.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {results.chats.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', marginBottom: '12px' }}>
                        <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border-color)' }}>聊天记录</div>
                        {results.chats.map(session => {
                            const agent = getAgent(session.agentId);
                            // Find the first matching message
                            const matchMsg = session.messages.slice().reverse().find(m => m.content.toLowerCase().includes(query.toLowerCase())) || session.messages[session.messages.length - 1];
                            
                            return (
                                <div 
                                    key={session.id}
                                    onClick={() => handleChatClick(session.id, matchMsg.id)}
                                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', borderBottom: '0.5px solid var(--border-color)', cursor: 'pointer' }}
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-cell-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '12px' }}>{agent.avatar}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-primary)', fontSize: '16px' }}>
                                                <HighlightText text={agent.name} highlight={query} />
                                            </span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(session.lastUpdated).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <HighlightText text={matchMsg.content} highlight={query} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Web Search Fallback */}
                <div style={{ background: 'var(--bg-card)' }}>
                     <div 
                        onClick={handleSearchWeb}
                        style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                     >
                         <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                         </div>
                         <div>
                             <div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>搜一搜 <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>"{query}"</span></div>
                             <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>网络搜索、百科、视频</div>
                         </div>
                     </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
