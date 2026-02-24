
import React from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell, CellGroup } from '../../../components/Cell';
import { useTranslation } from '../../../core/i18n/I18nContext';

const IconWrapper: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <div style={{
        width: '28px', height: '28px', borderRadius: '6px',
        background: color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px'
    }}>
        {children}
    </div>
);

export const ModelSettingsPage: React.FC = () => {
  const { t } = useTranslation();

  const handleNav = (domain: string, title: string) => {
      navigate('/settings/models/detail', { domain, title });
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
      <Navbar title={t('settings.model_settings')} onBack={() => navigateBack('/settings')} />
      
      <div style={{ padding: '16px 16px 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {t('settings.model_desc')}
      </div>

      <CellGroup>
        <Cell 
            title={t('settings.models.llm')}
            label={t('settings.models.llm_desc')}
            icon={<IconWrapper color="#2979FF">💬</IconWrapper>}
            isLink 
            onClick={() => handleNav('text', t('settings.models.llm'))} 
        />
        <Cell 
            title={t('settings.models.image')} 
            label={t('settings.models.image_desc')}
            icon={<IconWrapper color="#FF9C6E">🎨</IconWrapper>}
            isLink 
            onClick={() => handleNav('image', t('settings.models.image'))} 
        />
        <Cell 
            title={t('settings.models.video')} 
            label={t('settings.models.video_desc')}
            icon={<IconWrapper color="#95DE64">🎬</IconWrapper>}
            isLink 
            onClick={() => handleNav('video', t('settings.models.video'))} 
        />
        <Cell 
            title={t('settings.models.tts')} 
            label={t('settings.models.tts_desc')}
            icon={<IconWrapper color="#FF85C0">🎙️</IconWrapper>}
            isLink 
            onClick={() => handleNav('speech', t('settings.models.tts'))} 
        />
        <Cell 
            title={t('settings.models.music')} 
            label={t('settings.models.music_desc')}
            icon={<IconWrapper color="#B37FEB">🎵</IconWrapper>}
            isLink 
            onClick={() => handleNav('music', t('settings.models.music'))} 
        />
      </CellGroup>

      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
          {t('settings.footer_copyright')}
      </div>
    </div>
  );
};
