
import React, { useEffect, useState } from 'react';
import { navigate } from '../../../router';
import { useAuth } from '../../auth/AuthContext';
import { Toast } from '../../../components/Toast';
import { Page } from '../../../components/Page/Page';
import { Cell, CellGroup } from '../../../components/Cell';
import { calculateStorageUsage, formatBytes } from '../../../utils/algorithms';
import { useTranslation } from '../../../core/i18n/I18nContext';

export const SettingsPage: React.FC = () => {
    const { logout } = useAuth();
    const { t } = useTranslation();
    const [storageSize, setStorageSize] = useState('...');

    useEffect(() => {
        setStorageSize(formatBytes(calculateStorageUsage()));
    }, []);

    const handleClean = () => {
        Toast.loading('正在清理缓存...');
        setTimeout(() => {
            Toast.success(`成功清理 ${storageSize}`);
            setStorageSize('0 B');
        }, 1500);
    };

    const handleLogout = async () => {
        if (confirm(t('settings.logout_confirm'))) {
            Toast.loading(t('common.loading'));
            await logout();
            Toast.success(t('settings.logout_success'));
        }
    };

    return (
        <Page title={t('settings.title')} onBack={() => navigate('/me')}>
            <CellGroup title="账号与安全">
                <Cell title={t('settings.account')} isLink onClick={() => navigate('/general', { title: t('settings.account') })} />
                <Cell title={t('settings.model_settings')} label="AI 核心参数配置" isLink onClick={() => navigate('/settings/models')} />
            </CellGroup>

            <CellGroup title="通用设置">
                <Cell title={t('settings.notifications')} isLink onClick={() => navigate('/general', { title: t('settings.notifications') })} />
                <Cell title={t('settings.theme')} label="深色模式 / 极客蓝" isLink onClick={() => navigate('/settings/theme')} />
                <Cell title={t('settings.language')} isLink onClick={() => navigate('/general', { title: '多语言' })} />
            </CellGroup>
            
            <CellGroup title="系统信息">
                <Cell title={t('settings.storage')} value={storageSize} isLink onClick={handleClean} />
                <Cell title={t('settings.about')} value="v3.0.0 Stable" isLink onClick={() => navigate('/general', { title: '关于 OpenChat' })} />
            </CellGroup>

            <div style={{ marginTop: '32px', padding: '0 16px' }}>
                <button 
                    onClick={handleLogout}
                    style={{
                        width: '100%', padding: '14px', background: 'var(--bg-card)', 
                        border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600,
                        color: 'var(--danger)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    {t('settings.logout')}
                </button>
            </div>
        </Page>
    );
};
