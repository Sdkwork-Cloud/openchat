
import React from 'react';
import { navigate } from '../router';
import { Cell, CellGroup } from '../components/Cell';

const Icon = ({ path, color }: { path: string, color: string }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d={path} />
    </svg>
);

export const DiscoverPage: React.FC = () => {
  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100%', paddingBottom: '20px' }}>
      {/* Header - Unified */}
      <div style={{ 
        height: '44px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--navbar-bg)', 
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        fontWeight: 600,
        fontSize: '17px',
        color: 'var(--text-primary)',
        borderBottom: '0.5px solid var(--border-color)',
        paddingTop: 'env(safe-area-inset-top)'
      }}>
        发现
      </div>

      <CellGroup>
        <Cell 
            title="朋友圈" 
            icon={<Icon color="var(--primary-color)" path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />}
            isLink
            onClick={() => navigate('/moments')} // Corrected Route
        />
      </CellGroup>

      <CellGroup>
        <Cell 
            title="AI 视频号" 
            icon={<Icon color="var(--accent-gold)" path="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />}
            label="❤ 算法推荐"
            isLink
            onClick={() => navigate('/video-channel')}
        />
        <Cell 
            title="全息直播" 
            icon={<Icon color="var(--accent-gold)" path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />}
            isLink
            onClick={() => navigate('/general', { title: '全息直播' })}
        />
      </CellGroup>

      <CellGroup>
        <Cell 
            title="扫一扫" 
            icon={<Icon color="var(--primary-color)" path="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z" />}
            isLink
            onClick={() => navigate('/scan')} // Corrected Route
        />
        <Cell 
            title="语音分析" 
            icon={<Icon color="var(--accent-blue)" path="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.16-1.75 4.43-4H15v-6h4V3h-7z" />}
            isLink
            onClick={() => navigate('/general', { title: '语音分析' })}
        />
      </CellGroup>
    </div>
  );
};
