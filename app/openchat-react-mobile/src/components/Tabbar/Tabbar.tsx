
import React from 'react';
import { navigate } from '../../router';
import { useChatStore } from '../../services/store';
import { Platform } from '../../platform';
import { Sound } from '../../utils/sound';
import { Badge } from '../Badge/Badge';
import { useTranslation } from '../../core/i18n/I18nContext';
import { Icon, IconName } from '../Icon/Icon';
import './Tabbar.mobile.css';

export const Tabbar: React.FC = () => {
  const { totalUnreadCount } = useChatStore();
  const { t } = useTranslation();
  
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

  const tabs: Array<{id: string, label: string, icon: IconName, path: string, badge?: number, dot?: boolean}> = [
    { id: 'chat', label: t('tab.chat'), icon: 'chat', path: '/', badge: totalUnreadCount },
    { id: 'agents', label: t('tab.agents'), icon: 'agents', path: '/agents' },
    { id: 'creation', label: t('tab.creation'), icon: 'creation', path: '/creation' },
    { id: 'discover', label: t('tab.discover'), icon: 'discover', path: '/discover', badge: 0, dot: true },
    { id: 'me', label: t('tab.me'), icon: 'me', path: '/me' },
  ];

  const handleTabClick = (id: string, path: string) => {
    if (id !== activeTab) {
        Sound.click();
        Platform.device.vibrate(5);
    }
    setActiveTab(id);
    navigate(path);
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
                <Badge content={tab.badge} dot={!!tab.dot && (!tab.badge || tab.badge === 0)} offset={[-5, 5]}>
                    <div className="tabbar__icon" style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                        <Icon 
                            name={tab.icon} 
                            size={28} 
                            style={{ 
                                fill: isActive ? 'currentColor' : 'none', 
                                stroke: isActive ? 'none' : 'currentColor',
                                strokeWidth: isActive ? 0 : 1.5
                            }}
                        />
                    </div>
                </Badge>
            </div>
            <div className="tabbar__label">{tab.label}</div>
          </div>
        );
      })}
    </div>
  );
};
