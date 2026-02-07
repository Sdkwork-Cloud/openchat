
import React from 'react';
import { navigate } from '../../router';
import { useChatStore } from '../../services/store';
import { Platform } from '../../platform';
import './Tabbar.mobile.css';

// SVG Icons for professional look
const Icons = {
  chat: (active: boolean) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.5">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  agents: (active: boolean) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.5">
       <rect x="3" y="11" width="18" height="10" rx="2" />
       <circle cx="12" cy="5" r="2" />
       <path d="M12 7v4" />
       <line x1="8" y1="16" x2="8.01" y2="16" stroke={active ? "#fff" : "currentColor"} strokeWidth="2.5" strokeLinecap="round" />
       <line x1="16" y1="16" x2="16.01" y2="16" stroke={active ? "#fff" : "currentColor"} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  creation: (active: boolean) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.5">
       <circle cx="12" cy="12" r="10" />
       <path d="M12 8v8M8 12h8" stroke={active ? "#fff" : "currentColor"} strokeWidth="2" />
    </svg>
  ),
  discover: (active: boolean) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? "#fff" : "none"} stroke={active ? "none" : "currentColor"}></polygon>
    </svg>
  ),
  me: (active: boolean) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  )
};

export const Tabbar: React.FC = () => {
  const { totalUnreadCount } = useChatStore();
  
  const getHashPath = () => window.location.hash.slice(1) || '/';

  const getTabFromPath = (path: string) => {
    if (path === '/' || path === '') return 'chat';
    if (path.startsWith('/agents')) return 'agents';
    if (path.startsWith('/creation')) return 'creation';
    if (path.startsWith('/discover')) return 'discover';
    if (path.startsWith('/me')) return 'me';
    return 'chat';
  };

  const [activeTab, setActiveTab] = React.useState(getTabFromPath(getHashPath()));

  React.useEffect(() => {
    const handleHashChange = () => {
       setActiveTab(getTabFromPath(getHashPath()));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const tabs = [
    { id: 'chat', label: '对话', icon: Icons.chat, path: '/', badge: totalUnreadCount },
    { id: 'agents', label: '智能体', icon: Icons.agents, path: '/agents' },
    { id: 'creation', label: '创作', icon: Icons.creation, path: '/creation' },
    { id: 'discover', label: '发现', icon: Icons.discover, path: '/discover', badge: 0, dot: true }, // Fake 'dot' update for discovery
    { id: 'me', label: '我', icon: Icons.me, path: '/me' },
  ];

  const handleTabClick = (id: string, path: string) => {
    setActiveTab(id);
    navigate(path);
    Platform.device.vibrate(5);
  };

  return (
    <div className="tabbar safe-area-bottom">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <div 
            key={tab.id} 
            className={`tabbar__item ${isActive ? 'tabbar__item--active' : ''}`}
            onClick={() => handleTabClick(tab.id, tab.path)}
          >
            <div className="tabbar__icon-container">
                <div className="tabbar__icon" style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                    {tab.icon(isActive)}
                </div>
                
                {/* Number Badge */}
                {tab.badge && tab.badge > 0 ? (
                    <div className="tabbar__badge">{tab.badge > 99 ? '99+' : tab.badge}</div>
                ) : null}

                {/* Red Dot (only if no badge) */}
                {tab.dot && (!tab.badge || tab.badge === 0) && (
                    <div className="tabbar__dot" />
                )}
            </div>
            <div className="tabbar__label">{tab.label}</div>
          </div>
        );
      })}
    </div>
  );
};
