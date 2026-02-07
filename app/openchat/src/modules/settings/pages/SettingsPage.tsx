
import React, { useEffect, useState } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';
import { Toast } from '../../../components/Toast';
import { Navbar } from '../../../components/Navbar/Navbar';
import { calculateStorageUsage, formatBytes } from '../../../utils/algorithms';

const Cell = ({ label, value, onClick, isLink = true }: { label: string, value?: string, onClick?: () => void, isLink?: boolean }) => (
  <div 
    onClick={onClick}
    style={{
      padding: '16px',
      background: 'var(--bg-card)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: onClick ? 'pointer' : 'default',
      borderBottom: '0.5px solid var(--border-color)'
    }}
  >
    <div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {value && <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{value}</div>}
      {isLink && <div style={{ color: '#c5c9cf', fontSize: '16px', fontWeight: 600 }}>›</div>}
    </div>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { clearStore } = useChatStore();
  const [storageSize, setStorageSize] = useState('...');

  useEffect(() => {
      // Calculate storage asynchronously to avoid blocking UI
      setTimeout(() => {
          const bytes = calculateStorageUsage();
          setStorageSize(formatBytes(bytes));
      }, 100);
  }, []);

  const handleLogout = () => {
      if (window.confirm('确定要退出登录吗？')) {
         Toast.loading('正在退出...');
         setTimeout(() => {
             clearStore();
             Toast.success('已安全退出');
         }, 800);
      }
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
      <Navbar title="设置" onBack={() => navigate('/me')} />
      
      <div style={{ marginTop: '12px' }}>
        <Cell label="账号与安全" onClick={() => navigate('/general', { title: '账号与安全' })} />
      </div>

      <div style={{ marginTop: '12px' }}>
        <Cell label="新消息通知" onClick={() => navigate('/general', { title: '新消息通知' })} />
        <Cell label="通用" onClick={() => navigate('/general', { title: '通用' })} />
        <Cell label="外观" value="Tech Blue / 深色" onClick={() => navigate('/settings/theme')} />
      </div>
      
      <div style={{ marginTop: '12px' }}>
        <Cell label="存储空间" value={storageSize} onClick={() => Toast.info('清理功能开发中')} />
      </div>

      <div style={{ marginTop: '12px' }}>
        <Cell label="关于 OpenChat" value="v2.1.0" onClick={() => navigate('/general', { title: '关于 OpenChat' })} />
      </div>

      <div style={{ marginTop: '24px', padding: '0 16px' }}>
         <button 
             onClick={handleLogout}
             style={{
                 width: '100%',
                 padding: '14px',
                 background: 'var(--bg-card)',
                 border: 'none',
                 borderRadius: '8px',
                 fontSize: '16px',
                 fontWeight: 600,
                 color: 'var(--text-primary)',
                 cursor: 'pointer',
                 boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
             }}
         >
             退出登录
         </button>
      </div>
    </div>
  );
};
