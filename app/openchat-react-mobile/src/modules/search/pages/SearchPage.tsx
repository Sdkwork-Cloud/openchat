
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { navigate, navigateBack, useQueryParams } from '../../../router';
import { SearchService, SearchResultItem } from '../services/SearchService';
import { useChatStore } from '../../../services/store';
import { getAgent } from '../../../services/agentRegistry';
import { useDebounce } from '../../../hooks/useDebounce';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { Toast } from '../../../components/Toast';
import { Cell, CellGroup } from '../../../components/Cell'; // Import Cell

// --- Highlighter Component ---
const HighlightText = React.memo(({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim() || !text) return <>{text}</>;
    const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${safeHighlight})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{part}</span>
                ) : part
            )}
        </span>
    );
});

// --- Main Page ---
export const SearchPage: React.FC = () => {
  const queryParams = useQueryParams();
  const contextSessionId = queryParams.get('sessionId');
  
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  
  const [results, setResults] = useState<{ 
      agents: SearchResultItem[], 
      chats: SearchResultItem[], 
      others: SearchResultItem[] 
  }>({ agents: [], chats: [], others: [] });
  
  const [history, setHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { createSession, getSession } = useChatStore();
  
  const contextSession = contextSessionId ? getSession(contextSessionId) : null;
  const contextAgent = contextSession ? getAgent(contextSession.agentId) : null;
  const contextName = contextSession?.type === 'group' ? (contextSession.groupName || '群聊') : (contextAgent?.name || '会话');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
      const h = await SearchService.getHistory();
      setHistory(h);
  };

  useEffect(() => {
      const performSearch = async () => {
          if (!debouncedQuery.trim()) {
              setResults({ agents: [], chats: [], others: [] });
              return;
          }
          setIsSearching(true);
          const res = await SearchService.search(debouncedQuery, contextSessionId || undefined);
          setResults(res);
          setIsSearching(false);
      };
      performSearch();
  }, [debouncedQuery, contextSessionId]);

  const handleItemClick = async (item: SearchResultItem) => {
      await SearchService.addHistory(query);
      
      switch(item.type) {
          case 'agent':
              const sessionId = await createSession(item.id);
              navigate('/chat', { id: sessionId });
              break;
          case 'chat':
              navigate('/chat', { id: item.sessionId, msgId: item.messageId });
              break;
          case 'file':
              navigate('/drive', { folderId: null }); 
              Toast.info(`定位文件: ${item.title}`);
              break;
          case 'article':
              navigate('/article/detail', { id: item.id });
              break;
          case 'creation':
              navigate('/creation/detail', { id: item.id });
              break;
      }
  };

  const handleClearHistory = async () => {
      if (window.confirm('确定清空历史记录？')) {
          await SearchService.clearHistory();
          setHistory([]);
      }
  };

  const getIcon = (item: SearchResultItem) => {
      if (typeof item.avatar === 'string' && (item.avatar.startsWith('http') || item.avatar.length < 5)) {
           // Emoji or URL
           if (item.avatar.startsWith('http')) {
               return <img src={item.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
           }
           return item.avatar; 
      }
      
      // Type-based Fallback
      switch(item.type) {
          case 'file': return '📂';
          case 'article': return '📰';
          case 'creation': return '🎨';
          case 'chat': return '💬';
          case 'agent': return '🤖';
          default: return '🔍';
      }
  };

  const renderIconContainer = (item: SearchResultItem) => (
      <div style={{ 
          width: '40px', height: '40px', borderRadius: '8px', 
          background: 'var(--bg-cell-active)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '20px', flexShrink: 0,
          overflow: 'hidden'
      }}>
          {getIcon(item)}
      </div>
  );

  const placeholder = contextName ? `搜索“${contextName}”聊天记录` : "搜索";

  return (
    <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
      
      <SearchInput 
          value={query}
          onChange={setQuery}
          onCancel={() => navigateBack()}
          placeholder={placeholder}
          autoFocus={true}
      />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {!query ? (
            // --- Empty State ---
            <div style={{ padding: '24px 16px' }}>
                {history.length > 0 && (
                    <div style={{ marginBottom: '30px', animation: 'fadeIn 0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>最近搜索</span>
                            <div onClick={handleClearHistory} style={{ color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {history.map((t, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setQuery(t)} 
                                    style={{ 
                                        padding: '6px 12px', background: 'var(--bg-card)', 
                                        borderRadius: '16px', fontSize: '14px', color: 'var(--text-primary)', 
                                        cursor: 'pointer', border: '0.5px solid rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {t}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {!contextSessionId && (
                    <div style={{ textAlign: 'center', marginTop: '60px', opacity: 0.8 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>搜索指定内容</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', color: 'var(--primary-color)', fontSize: '14px', fontWeight: 500 }}>
                            <span onClick={() => navigate('/agents')} style={{cursor:'pointer'}}>智能体</span>
                            <span onClick={() => navigate('/moments')} style={{cursor:'pointer'}}>朋友圈</span>
                            <span onClick={() => navigate('/drive')} style={{cursor:'pointer'}}>文件</span>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            // --- Search Results ---
            <div style={{ animation: 'fadeIn 0.2s', padding: '12px' }}>
                {isSearching && (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        搜索中...
                    </div>
                )}

                {!isSearching && results.agents.length > 0 && (
                    <CellGroup title="智能体" inset>
                        {results.agents.map(item => (
                            <Cell 
                                key={item.id} 
                                onClick={() => handleItemClick(item)}
                                icon={renderIconContainer(item)}
                                title={<HighlightText text={item.title} highlight={debouncedQuery} />}
                                label={item.subTitle}
                                center
                            />
                        ))}
                    </CellGroup>
                )}

                {!isSearching && results.chats.length > 0 && (
                    <CellGroup title={contextSessionId ? `找到 ${results.chats.length} 条相关记录` : '聊天记录'} inset>
                        {results.chats.map((item, idx) => (
                            <Cell 
                                key={item.messageId || idx}
                                onClick={() => handleItemClick(item)}
                                icon={renderIconContainer(item)}
                                title={<HighlightText text={item.title} highlight={debouncedQuery} />}
                                label={<HighlightText text={item.subTitle} highlight={debouncedQuery} />}
                                value={<span style={{fontSize: '11px'}}>{new Date(item.timestamp).toLocaleDateString()}</span>}
                                center
                            />
                        ))}
                    </CellGroup>
                )}

                {!isSearching && results.others && results.others.length > 0 && (
                    <CellGroup title="内容 (文件/文章/作品)" inset>
                        {results.others.map((item, idx) => (
                            <Cell 
                                key={item.id || idx}
                                onClick={() => handleItemClick(item)}
                                icon={renderIconContainer(item)}
                                title={<HighlightText text={item.title} highlight={debouncedQuery} />}
                                label={item.subTitle}
                                value={<span style={{fontSize: '11px'}}>{new Date(item.timestamp).toLocaleDateString()}</span>}
                                center
                            />
                        ))}
                    </CellGroup>
                )}

                {!isSearching && results.agents.length === 0 && results.chats.length === 0 && (!results.others || results.others.length === 0) && (
                    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>🔍</div>
                        <div style={{ fontSize: '14px' }}>未找到 "{query}" 相关结果</div>
                    </div>
                )}
                
                {!contextSessionId && !isSearching && (
                    <CellGroup inset>
                        <Cell 
                            icon={
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                </div>
                            }
                            title={<span>搜一搜 <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>"{query}"</span></span>}
                            label="网络搜索、百科、视频"
                            onClick={() => { Toast.loading('搜索中...'); setTimeout(() => Toast.hide(), 1000); }}
                            center
                        />
                    </CellGroup>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
