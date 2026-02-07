
import React, { useState, useMemo } from 'react';
import { navigate } from '../router';
import { useChatStore } from '../services/store';
import { ChatListItem } from '../modules/chat/components/ChatListItem';

const NavIcons = {
  search: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  plus: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
};

const PlusMenu: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    if (!visible) return null;
    
    const menuItems = [
        { icon: '💬', label: '发起群聊', path: '/contacts?mode=select' },
        { icon: '👤', label: '添加朋友', path: '/contacts' },
        { icon: '📷', label: '扫一扫', path: '/scan' },
        { icon: '💰', label: '收付款', path: '/wallet' },
    ];

    return (
        <>
            <div 
                onClick={onClose}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 900 }} 
            />
            <div style={{
                position: 'absolute',
                top: '50px',
                right: '10px',
                background: 'var(--bg-card)',
                borderRadius: '8px',
                width: '140px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                zIndex: 1000,
                padding: '4px 0',
                border: '0.5px solid var(--border-color)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '14px',
                    width: '0',
                    height: '0',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '6px solid var(--bg-card)',
                }} />

                {menuItems.map((item, idx) => (
                    <div 
                        key={item.label}
                        onClick={() => {
                            onClose();
                            navigate(item.path);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 16px',
                            borderBottom: idx !== menuItems.length - 1 ? '0.5px solid var(--border-color)' : 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ marginRight: '12px', fontSize: '16px' }}>{item.icon}</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{item.label}</span>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

const HomePage: React.FC = () => {
  const { sessions } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);

  // --- Sorting Algorithm (Memoized) ---
  // 1. Split into Pinned and Unpinned
  // 2. Sort each group by lastUpdated (Desc)
  // useMemo ensures this only runs when 'sessions' array changes
  const sortedSessions = useMemo(() => {
      return [...sessions].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.lastUpdated - a.lastUpdated;
      });
  }, [sessions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--bg-body)' }}>
      {/* Navbar */}
      <div style={{ 
        height: '56px',
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 12px 0 16px',
        background: 'var(--navbar-bg)',
        color: 'var(--text-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)',
        justifyContent: 'space-between',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid var(--border-color)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.5px' }}>OpenChat</span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <div onClick={() => navigate('/search')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                {NavIcons.search}
             </div>
             
             <div 
                onClick={() => setShowMenu(!showMenu)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)', position: 'relative' }}
             >
                {NavIcons.plus}
                <PlusMenu visible={showMenu} onClose={() => setShowMenu(false)} />
             </div>
        </div>
      </div>

      {/* List Container */}
      <div style={{ flex: 1, paddingBottom: '20px' }}>
        {sortedSessions.map((session, index) => (
            <div key={session.id}>
                <ChatListItem 
                    session={session} 
                    onClick={() => navigate('/chat', { id: session.id })} 
                />
                {index !== sortedSessions.length - 1 && (
                    <div style={{ height: '0.5px', background: 'var(--border-color)', marginLeft: '76px', marginRight: '0', opacity: 0.6 }} />
                )}
            </div>
        ))}
        
        {sortedSessions.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.5 }}>💬</div>
                <div style={{ marginBottom: '8px' }}>暂无消息</div>
                <div 
                    onClick={() => navigate('/agents')}
                    style={{ color: 'var(--primary-color)', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}
                >
                    去“智能体”页面开始对话 →
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
