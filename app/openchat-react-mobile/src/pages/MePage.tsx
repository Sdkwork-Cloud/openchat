
import React from 'react';
import { navigate } from '../router';
import { Cell, CellGroup } from '../components/Cell';
import { useTouchFeedback } from '../mobile/hooks/useTouchFeedback';

const Icon = ({ path, color }: { path: string, color?: string }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color || "currentColor"}>
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d={path} />
    </svg>
);

const UserHeader = () => {
    const { isActive, touchProps } = useTouchFeedback();
    
    return (
        <div 
            onClick={() => navigate('/profile/self')}
            {...touchProps}
            style={{ 
                background: isActive ? 'var(--bg-cell-active)' : 'var(--bg-card)', 
                padding: '44px 24px 44px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '10px',
                transition: 'background 0.1s',
                borderBottom: '0.5px solid var(--border-color)',
                cursor: 'pointer'
            }}
        >
            <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '12px', 
                marginRight: '16px',
                backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Felix)',
                backgroundSize: 'cover',
                border: '0.5px solid var(--border-color)'
            }}></div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>AI User</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <span>ID：ai_88888888</span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                    onClick={(e) => { e.stopPropagation(); navigate('/profile/qrcode'); }}
                    style={{ padding: '8px', marginRight: '-8px' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)">
                        <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v2h-1v-2zm-3 2h2v2h-2v-2zm3 2h1v2h-1v-2zm0-4h1v2h-1v-2zm3 2h1v2h-1v-2zm-6 2h2v2h-2v-2zm3 2h1v2h-1v-2z" />
                    </svg>
                </div>
                <div style={{ color: '#c5c9cf', fontSize: '16px', fontWeight: 600 }}>›</div>
            </div>
        </div>
    );
};

export const MePage: React.FC = () => {
  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100%', paddingBottom: '20px' }}>
      
      <UserHeader />

      <CellGroup>
        <Cell 
            title="支付与服务" 
            icon={<Icon color="#07c160" path="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />}
            isLink
            onClick={() => navigate('/wallet')}
        />
      </CellGroup>

      <CellGroup>
        <Cell 
            title="我的收藏" 
            icon={<Icon color="#E6A23C" path="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />}
            isLink
            onClick={() => navigate('/favorites')}
        />
        <Cell 
            title="我的作品" 
            icon={<Icon color="#FF9C6E" path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />}
            isLink
            onClick={() => navigate('/creation')}
        />
        <Cell 
            title="我的智能体" 
            icon={<Icon color="#7928CA" path="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />}
            isLink
            onClick={() => navigate('/agents')}
        />
        <Cell 
            title="卡包/票券" 
            icon={<Icon color="#4080ff" path="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />}
            isLink
            onClick={() => navigate('/general', { title: '卡包' })}
        />
      </CellGroup>

      <CellGroup>
        <Cell 
            title="设置" 
            icon={<Icon color="#7585a9" path="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />}
            isLink
            onClick={() => navigate('/settings')}
        />
      </CellGroup>
    </div>
  );
};
