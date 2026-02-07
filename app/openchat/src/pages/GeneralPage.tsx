
import React from 'react';
import { useQueryParams, navigate } from '../router';
import { Navbar } from '../components/Navbar/Navbar'; 
import { Cell, CellGroup } from '../components/Cell';
import { Toast } from '../components/Toast';

// --- Dynamic Mock Views to prevent "Dead End" feeling ---

const MapView = () => (
    <div style={{ width: '100%', height: '100%', background: '#e0e0e0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/2000px-World_map_blank_without_borders.svg.png)', backgroundSize: 'cover' }}></div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)' }}>
             <svg width="40" height="40" viewBox="0 0 24 24" fill="#fa5151" stroke="white" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
        </div>
        <div style={{ position: 'absolute', bottom: '40px', left: '20px', right: '20px', background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>当前位置</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>上海市浦东新区...</div>
        </div>
    </div>
);

const DefaultView = ({ title }: { title: string }) => ( 
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', opacity: 0.7 }}> 
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div> 
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '18px' }}>{title}</h3> 
        <p style={{ margin: 0, color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px', lineHeight: '1.6' }}>该功能模块正在接入 OpenChat 智能核心。<br/>Tech Blue 架构正在初始化...</p> 
        <button 
            onClick={() => navigate('/')}
            style={{ marginTop: '30px', padding: '10px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '14px', color: 'var(--text-primary)' }}
        >
            返回首页
        </button>
    </div> 
);

export const GeneralPage: React.FC = () => {
  const query = useQueryParams();
  const title = query.get('title') || '详情';

  // Simple routing for mock views
  const renderContent = () => {
      if (title.includes('位置') || title.includes('地图')) return <MapView />;
      return <DefaultView title={title} />;
  };

  return (
    <div style={{ 
        minHeight: '100%', 
        background: 'var(--bg-body)', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        position: 'relative'
    }}>
      <div style={{ width: '100%', zIndex: 100, top: 0, position: 'relative' }}>
        <Navbar title={title} backFallback="/" />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderContent()}
      </div>
    </div>
  );
};
