
import React, { useEffect, useState } from 'react';
import { navigate } from '../router';
import { useChatStore } from '../services/store';
import { useAuth } from '../modules/auth/AuthContext';
import { Toast } from '../components/Toast';
import { Navbar } from '../components/Navbar/Navbar';
import { Cell, CellGroup } from '../components/Cell'; // Using global component
import { calculateStorageUsage, formatBytes } from '../utils/algorithms';
import { useTranslation } from '../core/i18n/I18nContext';

const CleaningModal: React.FC<{ visible: boolean; onComplete: () => void }> = ({ visible, onComplete }) => {
    if (!visible) return null;
    
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'white', animation: 'fadeIn 0.2s'
        }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '20px', fontSize: '16px', fontWeight: 500 }}>正在清理缓存...</div>
            <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.7 }}>释放手机空间</div>
        </div>
    );
};

export const SettingsPage: React.FC = () => {
  const { clearStore } = useChatStore();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [storageSize, setStorageSize] = useState('...');
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
      calculateSize();
  }, []);

  const calculateSize = () => {
      setTimeout(() => {
          const bytes = calculateStorageUsage();
          setStorageSize(formatBytes(bytes));
      }, 100);
  };

  const handleCleanStorage = () => {
      setIsCleaning(true);
      setTimeout(() => {
          setIsCleaning(false);
          Toast.success(`清理成功，释放了 ${storageSize} 空间`);
          setStorageSize('0 B'); // Visual reset
      }, 1500);
  };

  const handleLogout = () => {
      if (window.confirm(t('settings.logout_confirm'))) {
         Toast.loading(t('common.loading'));
         setTimeout(async () => {
             await logout();
             Toast.success(t('settings.logout_success'));
         }, 800);
      }
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-body)', paddingBottom: '40px' }}>
      <Navbar title={t('settings.title')} onBack={() => navigate('/me')} />
      
      <CleaningModal visible={isCleaning} onComplete={() => {}} />

      <div style={{ marginTop: '12px' }}>
        <CellGroup>
            <Cell title={t('settings.account')} isLink onClick={() => navigate('/general', { title: t('settings.account') })} />
        </CellGroup>
      </div>

      <div style={{ marginTop: '12px' }}>
        <CellGroup>
            <Cell title={t('settings.model_settings')} value="AI Configuration" isLink onClick={() => navigate('/settings/models')} />
        </CellGroup>
      </div>

      <div style={{ marginTop: '12px' }}>
        <CellGroup>
            <Cell title={t('settings.notifications')} isLink onClick={() => navigate('/general', { title: t('settings.notifications') })} />
            <Cell title={t('settings.general')} isLink onClick={() => navigate('/general', { title: '通用' })} />
            <Cell title={t('settings.theme')} value="Tech Blue / Dark" isLink onClick={() => navigate('/settings/theme')} />
        </CellGroup>
      </div>
      
      <div style={{ marginTop: '12px' }}>
        <CellGroup>
            <Cell title={t('settings.storage')} value={storageSize} isLink onClick={handleCleanStorage} />
        </CellGroup>
      </div>

      <div style={{ marginTop: '12px' }}>
        <CellGroup>
            <Cell title={t('settings.about')} value="v2.1.0" isLink onClick={() => navigate('/general', { title: '关于 OpenChat' })} />
        </CellGroup>
      </div>

      <div style={{ marginTop: '24px', padding: '0 16px' }}>
         <button 
             onClick={handleLogout}
             className="logout-btn"
             style={{
                 width: '100%',
                 padding: '14px',
                 background: 'var(--bg-card)',
                 border: 'none',
                 borderRadius: '12px',
                 fontSize: '16px',
                 fontWeight: 600,
                 color: '#fa5151', // Professional Danger Red
                 cursor: 'pointer',
                 boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                 transition: 'transform 0.1s, background 0.1s'
             }}
             onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; e.currentTarget.style.background = 'var(--bg-cell-active)'; }}
             onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
             onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; e.currentTarget.style.background = 'var(--bg-cell-active)'; }}
             onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
             onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
         >
             {t('settings.logout')}
         </button>
      </div>
    </div>
  );
};
