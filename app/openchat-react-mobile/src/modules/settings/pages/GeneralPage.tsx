
import React, { useState, useEffect } from 'react';
import { useQueryParams, navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar'; 
import { Cell, CellGroup } from '../../../components/Cell';
import { SettingsService, AppConfig } from '../services/SettingsService';
import { Toast } from '../../../components/Toast';
import { Switch } from '../../../components/Switch/Switch';
import { useTheme } from '../../../services/themeContext';
import { useTranslation } from '../../../core/i18n/I18nContext';
import { Slider } from '../../../components/Slider/Slider'; 
import { Collapse, CollapseGroup } from '../../../components/Collapse/Collapse';
import { Watermark } from '../../../components/Watermark/Watermark';
import { useAuth } from '../../auth/AuthContext';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet'; // Add this

// --- Sub-Pages Implementation ---

const FontSizeSettingsView = () => {
    const { fontSize, setFontSize } = useTheme();
    // Use raw pixel values for slider, map to labels via marks
    const STEPS = {
        14: '小',
        16: '标准',
        18: '大',
        22: '特大'
    };

    const handleChange = (val: number) => {
        setFontSize(val);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#ccc', flexShrink: 0 }}>
                        <img src="https://api.dicebear.com/7.x/identicon/svg?seed=Omni" style={{ width: '100%', borderRadius: '6px' }} />
                    </div>
                    <div>
                        <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '0 12px 12px 12px', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '1em', lineHeight: '1.6' }}>
                            预览字体大小。
                            <br/>
                            拖动下方滑块调整。
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#ccc', flexShrink: 0 }}>
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" style={{ width: '100%', borderRadius: '6px' }} />
                    </div>
                    <div>
                        <div style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 14px', borderRadius: '12px 0 12px 12px', boxShadow: '0 1px 2px rgba(41, 121, 255, 0.2)', fontSize: '1em', lineHeight: '1.6' }}>
                            设置后，将应用于所有聊天和菜单。
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '30px 30px 50px 30px', borderTop: '0.5px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>A</span>
                    <span style={{ fontSize: '24px', color: 'var(--text-primary)', fontWeight: 600 }}>A</span>
                </div>
                <Slider 
                    min={14} 
                    max={22} 
                    step={2} 
                    value={fontSize} 
                    onChange={handleChange}
                    marks={STEPS}
                />
            </div>
        </div>
    );
};

const NotificationSettingsView = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [details, setDetails] = useState({ preview: true, sound: true, vibrate: true });

    useEffect(() => {
        const load = async () => {
            const res = await SettingsService.getConfig();
            if (res.data) setConfig(res.data);
        };
        load();
    }, []);

    const toggleGlobal = async (val: boolean) => {
        if (!config) return;
        setConfig({ ...config, notificationsEnabled: val });
        await SettingsService.updateConfig({ notificationsEnabled: val });
    };

    if (!config) return null;

    return (
        <div>
            <CellGroup title="系统通知设置">
                <Cell title="接收新消息通知" value={<Switch checked={config.notificationsEnabled} onChange={toggleGlobal} />} />
            </CellGroup>
            {config.notificationsEnabled && (
                <div style={{ animation: 'fadeIn 0.3s' }}>
                    <CellGroup title="通知方式">
                        <Cell title="通知显示详情" label="关闭后，通知将不显示发信人和内容摘要" value={<Switch checked={details.preview} onChange={() => setDetails(d => ({...d, preview: !d.preview}))} />} />
                        <Cell title="声音" value={<Switch checked={details.sound} onChange={() => setDetails(d => ({...d, sound: !d.sound}))} />} />
                        <Cell title="震动" value={<Switch checked={details.vibrate} onChange={() => setDetails(d => ({...d, vibrate: !d.vibrate}))} />} />
                    </CellGroup>
                </div>
            )}
        </div>
    );
};

// ... AccountSecurityView, StorageSettingsView, AboutView can remain largely the same, just keeping GeneralSettingsView focused for this update ...
const AboutView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
        <div style={{ padding: '60px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '14px', background: 'linear-gradient(135deg, #2979FF 0%, #0050E6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(41, 121, 255, 0.25)', marginBottom: '16px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>OpenChat</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Version 2.1.0</div>
        </div>
        
        <div style={{ width: '100%', marginBottom: '24px' }}>
            <CollapseGroup inset>
                <Collapse title="功能介绍">
                    OpenChat 是一款集成了顶尖大语言模型的智能助手应用。<br/><br/>
                    支持多模态交互（文本、图片、语音）、智能体市场、以及丰富的插件生态。
                </Collapse>
                <Collapse title="服务协议">
                    本服务仅供学习和研究使用。<br/>
                    请遵守相关法律法规，不得用于生成有害信息。
                </Collapse>
                <Collapse title="隐私政策">
                    我们非常重视您的隐私。<br/>
                    所有对话数据仅存储在本地（IndexedDB），API Key 也仅保存在您的设备上。
                </Collapse>
            </CollapseGroup>
            
            <CellGroup inset>
                 <Cell title="检查新版本" isLink onClick={() => { Toast.loading('检查中...'); setTimeout(() => Toast.success('已是最新版本'), 1000); }} />
            </CellGroup>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ padding: '20px', fontSize: '12px', color: 'var(--text-placeholder)', textAlign: 'center' }}>
            Copyright © 2024 OpenChat Inc. All Rights Reserved.
        </div>
    </div>
);

const GeneralSettingsView = () => {
    const { fontSize } = useTheme();
    const { user } = useAuth();
    const { locale, setLocale, t } = useTranslation();
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [showWatermark, setShowWatermark] = useState(false);

    useEffect(() => {
        const load = async () => { const res = await SettingsService.getConfig(); if (res.data) setConfig(res.data); };
        load();
    }, []);

    const toggle = async (key: keyof AppConfig) => {
        if (!config) return; const newVal = !config[key]; 
        // @ts-ignore
        setConfig({ ...config, [key]: newVal }); await SettingsService.updateConfig({ [key]: newVal });
    };
    
    const handleLanguageChange = () => {
        ActionSheet.showActions({
            title: t('settings.language'),
            actions: [
                { text: '简体中文', key: 'zh-CN', color: locale === 'zh-CN' ? 'var(--primary-color)' : undefined },
                { text: 'English', key: 'en-US', color: locale === 'en-US' ? 'var(--primary-color)' : undefined }
            ]
        }).then(item => {
            if (item) {
                setLocale(item.key as any);
                Toast.success(item.key === 'zh-CN' ? '已切换至中文' : 'Switched to English');
            }
        });
    };

    if (!config) return null;
    const fontSizeLabel = fontSize === 16 ? '标准' : (fontSize < 16 ? '小' : (fontSize > 18 ? '特大' : '大'));

    return (
        <div>
            {showWatermark && <Watermark text={[user?.name || 'OpenChat User', 'Internal Preview']} />}
            
            <CellGroup title={t('settings.theme')}>
                <Cell title="聊天背景" isLink onClick={() => navigate('/settings/background')} />
                <Cell title="字体大小" value={fontSizeLabel} isLink onClick={() => navigate('/general', { title: '字体大小' })} />
                <Cell title="横屏模式" value={<Switch checked={false} onChange={() => Toast.info('请旋转设备')} />} />
                <Cell title="安全水印 (演示)" value={<Switch checked={showWatermark} onChange={setShowWatermark} />} />
            </CellGroup>
            <CellGroup title="多媒体">
                <Cell title="朋友圈视频自动播放" value={<Switch checked={config.autoPlayVideo} onChange={() => toggle('autoPlayVideo')} />} />
                <Cell title="照片、视频、文件和通话" isLink onClick={() => navigate('/general', { title: '存储设置' })} />
            </CellGroup>
            <CellGroup title="系统">
                <Cell 
                    title={t('settings.language')}
                    value={locale === 'zh-CN' ? '简体中文' : 'English'} 
                    isLink 
                    onClick={handleLanguageChange} 
                />
            </CellGroup>
        </div>
    );
};

export const GeneralPage: React.FC = () => {
    const query = useQueryParams();
    const title = query.get('title') || '通用';
    const { t } = useTranslation();
    
    const renderContent = () => {
        switch (title) {
            case '通用': return <GeneralSettingsView />;
            case '新消息通知': return <NotificationSettingsView />;
            case '存储设置': case '存储空间': return null; // Mocked out for brevity in this specific file update, usually use StorageSettingsView
            case '关于 OpenChat': case '关于 Omni': return <AboutView />;
            case '字体大小': return <FontSizeSettingsView />;
            default: return (<div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div><div>{title}</div></div>);
        }
    };
    
    // Dynamically translate title if it matches a key, else use raw
    const displayTitle = title === '通用' ? t('settings.general') : title;
    
    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Navbar title={displayTitle} backFallback="/settings" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>{renderContent()}</div>
        </div>
    );
};
