
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { navigate } from '../router';
import { useChatStore } from '../services/store';
import { ChatListItem } from '../modules/chat/components/ChatListItem';
import { PullToRefresh } from '../components/PullToRefresh/PullToRefresh';
import { NotificationService } from '../modules/notification/services/NotificationService';
import { AppEvents, EVENTS } from '../core/events';
import { Badge } from '../components/Badge/Badge';
import { Icon, IconName } from '../components/Icon/Icon';
import { useTranslation } from '../core/i18n/I18nContext';

const PlusMenu: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const { t } = useTranslation();
    
    if (!visible) return null;
    
    const menuItems: { icon: IconName; label: string; path: string }[] = [
        { icon: 'chat', label: t('menu.group_chat'), path: '/contacts?mode=select' },
        { icon: 'add-circle', label: t('menu.add_friend'), path: '/contacts' },
        { icon: 'scan', label: t('menu.scan'), path: '/scan' },
        { icon: 'wallet', label: t('menu.money'), path: '/wallet' },
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
                animation: 'fadeIn 0.2s ease-out',
                transformOrigin: 'top right'
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
                            padding: '12px 16px',
                            borderBottom: idx !== menuItems.length - 1 ? '0.5px solid var(--border-color)' : 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ marginRight: '12px', display: 'flex', alignItems: 'center' }}>
                            <Icon name={item.icon} size={20} />
                        </span>
                        <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{item.label}</span>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
};

const DrawerContent = () => {
    const { t } = useTranslation();
    return (
        <div style={{ display: 'flex', gap: '30px', marginTop: '20px', color: 'var(--text-secondary)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-card)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>🕒</div>
                <div style={{ fontSize: 11 }}>{t('home.recent')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg-card)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>🤖</div>
                <div style={{ fontSize: 11 }}>{t('home.agents')}</div>
            </div>
        </div>
    );
};

const HomePage: React.FC = () => {
  const { sessions } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);
  const [notifyCount, setNotifyCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // --- Sorting Algorithm (Memoized) ---
  const sortedSessions = useMemo(() => {
      return [...sessions].sort((a, b) => {
          // Pinned Check
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          // Time Check
          const timeA = typeof a.lastMessageTime === 'number' ? a.lastMessageTime : 0;
          const timeB = typeof b.lastMessageTime === 'number' ? b.lastMessageTime : 0;
          return timeB - timeA;
      });
  }, [sessions]);

  useEffect(() => {
      const updateCount = async () => {
          const count = await NotificationService.getUnreadCount();
          setNotifyCount(count);
      };
      updateCount();

      // Listen for notification updates
      const unsub = AppEvents.on(EVENTS.DATA_CHANGE, (payload) => {
          if (payload.key === 'sys_notifications_v1') {
              updateCount();
          }
      });
      return unsub;
  }, []);

  const handleRefresh = async () => {
      // Simulate network refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <PullToRefresh 
        onRefresh={handleRefresh}
        backgroundContent={<DrawerContent />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--bg-body)' }}>
          {/* Navbar */}
          <div style={{ 
            height: '44px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '0 12px',
            background: 'var(--navbar-bg)',
            color: 'var(--text-primary)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            paddingTop: 'env(safe-area-inset-top)',
            backdropFilter: 'blur(20px)',
            borderBottom: '0.5px solid var(--border-color)'
          }}>
            <div style={{ position: 'absolute', left: '16px', bottom: 0, height: '44px', display: 'flex', alignItems: 'center' }}>
                <Badge content={notifyCount} offset={[0, 5]}>
                    <div onClick={() => navigate('/notifications')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                        <Icon name="bell" size={24} />
                    </div>
                </Badge>
            </div>

            <span style={{ fontSize: '17px', fontWeight: 600 }}>{t('home.title')}</span>
            
            <div style={{ position: 'absolute', right: '12px', bottom: 0, height: '44px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div onClick={() => navigate('/search')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                    <Icon name="search" size={24} />
                </div>
                
                <div 
                    onClick={() => setShowMenu(!showMenu)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)', position: 'relative' }}
                >
                    <Icon name="plus" size={24} />
                    <PlusMenu visible={showMenu} onClose={() => setShowMenu(false)} />
                </div>
            </div>
          </div>

          {/* List Container */}
          <div 
            ref={containerRef}
            style={{ flex: 1, paddingBottom: '20px' }}
          >
            {sortedSessions.map((session, index) => (
                <div key={session.id}>
                    <ChatListItem 
                        session={session} 
                        onClick={() => navigate('/chat', { id: session.id })} 
                    />
                    {/* Separator: Only show if NOT last item */}
                    {index !== sortedSessions.length - 1 && (
                        <div style={{ height: '0.5px', background: 'var(--border-color)', marginLeft: '76px', marginRight: '0', opacity: 0.6 }} />
                    )}
                </div>
            ))}
            
            {sortedSessions.length === 0 && (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>💬</div>
                    <div style={{ marginBottom: '8px', fontSize: '15px' }}>{t('home.no_messages')}</div>
                    <div 
                        onClick={() => navigate('/agents')}
                        style={{ color: 'var(--primary-color)', fontSize: '14px', cursor: 'pointer', fontWeight: 500, padding: '8px 16px', background: 'var(--bg-card)', borderRadius: '20px', marginTop: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    >
                        {t('home.go_agents')}
                    </div>
                </div>
            )}
          </div>
      </div>
    </PullToRefresh>
  );
};

export default HomePage;
