
import React, { useEffect, useState } from 'react';
import { navigate } from '../../../router';
import { Cell, CellGroup } from '../../../components/Cell';
import { useTouchFeedback } from '../../../mobile/hooks/useTouchFeedback';
import { UserService, UserProfile } from '../services/UserService';
import { Toast } from '../../../components/Toast';

// --- Icon Definitions (Clean & Standardized) ---
const Icons = {
    Service: <svg width="22" height="22" viewBox="0 0 24 24" fill="#07c160"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>,
    Favorites: <svg width="22" height="22" viewBox="0 0 24 24" fill="#E6A23C"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>,
    Moments: <svg width="22" height="22" viewBox="0 0 24 24" fill="#4080ff"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>,
    Cards: <svg width="22" height="22" viewBox="0 0 24 24" fill="#4080ff"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>,
    Creations: <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF9C6E"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4v-4h4v4z"/></svg>,
    Agents: <svg width="22" height="22" viewBox="0 0 24 24" fill="#7928CA"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
    Settings: <svg width="22" height="22" viewBox="0 0 24 24" fill="#7585a9"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
};

const UserHeader = ({ profile }: { profile: UserProfile | null }) => {
    const { isActive, touchProps } = useTouchFeedback();
    
    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        Toast.info('状态功能：今日心情不错');
    };

    if (!profile) return <div style={{ height: '120px' }} />;

    return (
        <div 
            onClick={() => navigate('/profile/self')}
            {...touchProps}
            style={{ 
                background: isActive ? 'var(--bg-cell-active)' : 'var(--bg-card)', 
                padding: '32px 24px 32px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '10px',
                transition: 'background 0.1s',
                cursor: 'pointer'
            }}
        >
            <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '10px', 
                marginRight: '16px',
                backgroundImage: `url(${profile.avatar})`,
                backgroundSize: 'cover',
                border: '0.5px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}></div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>{profile.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>微信号：{profile.wxid}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                         <div onClick={(e) => { e.stopPropagation(); navigate('/profile/qrcode'); }} style={{ padding: '8px' }}>
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z"/></svg>
                         </div>
                         <div style={{ color: '#c5c9cf', fontSize: '16px', fontWeight: 600 }}>›</div>
                    </div>
                </div>
                
                {/* Status Pill */}
                <div 
                    onClick={handleStatusClick}
                    style={{ 
                        marginTop: '8px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        padding: '4px 10px', 
                        borderRadius: '14px', 
                        background: 'var(--bg-body)', 
                        border: '0.5px solid var(--border-color)',
                        cursor: 'pointer'
                    }}
                >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', marginRight: '6px' }}></span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {profile.status.isActive ? `+ ${profile.status.text}` : '+ 状态'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const MePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
      const load = async () => {
          const res = await UserService.getProfile();
          if (res.success && res.data) {
              setProfile(res.data);
          }
      };
      load();
  }, []);

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100%', paddingBottom: '20px' }}>
      
      <UserHeader profile={profile} />

      <CellGroup>
        <Cell 
            title="服务" 
            icon={Icons.Service}
            isLink
            onClick={() => navigate('/wallet')}
        />
      </CellGroup>

      <CellGroup>
        <Cell 
            title="收藏" 
            icon={Icons.Favorites}
            isLink
            onClick={() => navigate('/favorites')}
        />
        <Cell 
            title="朋友圈" 
            icon={Icons.Moments}
            isLink
            onClick={() => navigate('/moments')}
        />
        <Cell 
            title="卡包" 
            icon={Icons.Cards}
            isLink
            onClick={() => navigate('/general', { title: '卡包' })}
        />
        <Cell 
            title="我的作品" 
            icon={Icons.Creations}
            isLink
            onClick={() => navigate('/my-creations')}
        />
        <Cell 
            title="我的智能体" 
            icon={Icons.Agents}
            isLink
            onClick={() => navigate('/my-agents')}
        />
      </CellGroup>

      <CellGroup>
        <Cell 
            title="设置" 
            icon={Icons.Settings}
            isLink
            onClick={() => navigate('/settings')}
        />
      </CellGroup>
    </div>
  );
};
