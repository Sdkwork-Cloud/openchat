import React, { useEffect, useState, useRef } from 'react';
import { navigateBack, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { SettingsService } from '../services/SettingsService';
import { useChatStore } from '../../../services/store';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';

// --- Assets ---
const COLORS = [
    '#ededed', '#ffffff', '#f5f5f5', 
    '#e3f2fd', '#e0f2f1', '#fff3e0',
    '#f3e5f5', '#ffebee', '#e8f5e9'
];

const GRADIENTS = [
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
    'linear-gradient(to top, #30cfd0 0%, #330867 100%)', 
];

const WALLPAPERS = [
    'url(https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400)',
    'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400)',
    'url(https://images.unsplash.com/photo-1557683316-973673baf926?w=400)',
    'url(https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400)',
    'url(https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400)',
    'url(https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400)'
];

const Checkmark = () => (
    <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '24px', height: '24px', background: 'var(--primary-color)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
);

export const ChatBackgroundPage: React.FC = () => {
    const query = useQueryParams();
    const sessionId = query.get('sessionId');
    const { updateSessionConfig, getSession } = useChatStore();
    
    // State
    const [currentBg, setCurrentBg] = useState('');
    const [tempBg, setTempBg] = useState(''); // For immediate preview before saving
    const [hasChanged, setHasChanged] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            let bg = '';
            if (sessionId) {
                const s = getSession(sessionId);
                if (s?.sessionConfig?.backgroundImage) {
                    bg = s.sessionConfig.backgroundImage;
                } else {
                    const res = await SettingsService.getConfig();
                    bg = res.data?.chatBackground || '';
                }
            } else {
                const res = await SettingsService.getConfig();
                bg = res.data?.chatBackground || '';
            }
            setCurrentBg(bg);
            setTempBg(bg);
        };
        load();
    }, [sessionId]);

    const handleSelect = (bg: string) => {
        setTempBg(bg);
        setHasChanged(true);
        Platform.device.vibrate(5);
    };

    const handleSave = async () => {
        if (sessionId) {
            await updateSessionConfig(sessionId, { backgroundImage: tempBg });
            Toast.success('当前聊天背景已应用');
        } else {
            await SettingsService.updateConfig({ chatBackground: tempBg });
            Toast.success('全局背景已应用');
        }
        setCurrentBg(tempBg);
        setHasChanged(false);
        setTimeout(() => navigateBack(sessionId ? `/chat/details?id=${sessionId}` : '/settings'), 500);
    };

    const handleRestoreDefault = async () => {
        setTempBg(''); 
        setHasChanged(true);
        Platform.device.vibrate(10);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                handleSelect(`url(${result})`);
            };
            reader.readAsDataURL(file);
        }
    };

    // Components
    const PreviewCard = () => (
        <div style={{ 
            width: '180px', height: '320px', margin: '0 auto', 
            borderRadius: '16px', border: '4px solid var(--bg-card)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            background: tempBg || 'var(--bg-body)', 
            backgroundSize: 'cover', backgroundPosition: 'center',
            position: 'relative', overflow: 'hidden',
            transition: 'background 0.3s'
        }}>
            <div style={{ height: '40px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }} />
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '0 8px 8px 8px', fontSize: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    预览效果
                </div>
                <div style={{ alignSelf: 'flex-end', background: 'var(--primary-color)', color: 'white', padding: '6px 10px', borderRadius: '8px 0 8px 8px', fontSize: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    文字是否清晰？
                </div>
            </div>
        </div>
    );

    const navTitle = sessionId ? '设置当前聊天背景' : '通用聊天背景';
    const fallback = sessionId ? `/chat/details?id=${sessionId}` : '/settings';

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Navbar 
                title={navTitle} 
                onBack={() => navigateBack(fallback)} 
                rightElement={
                    hasChanged ? (
                        <div onClick={handleSave} style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '15px', cursor: 'pointer', padding: '0 12px' }}>
                            完成
                        </div>
                    ) : null
                }
            />
            
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', minHeight: 0, overscrollBehaviorY: 'contain' }}>
                <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center', background: 'var(--bg-body)' }}>
                    <PreviewCard />
                </div>

                <div style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            style={{ 
                                flex: 1, height: '60px', background: 'var(--bg-card)', borderRadius: '12px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid var(--border-color)', cursor: 'pointer'
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>🖼️</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px' }}>从相册选择</span>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                        </div>
                        <div 
                            onClick={() => { Platform.camera.takePhoto().then(url => handleSelect(`url(${url})`)) }}
                            style={{ 
                                flex: 1, height: '60px', background: 'var(--bg-card)', borderRadius: '12px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid var(--border-color)', cursor: 'pointer'
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>📷</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px' }}>拍一张</span>
                        </div>
                    </div>

                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>基础</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                        <div 
                            onClick={handleRestoreDefault}
                            style={{ 
                                aspectRatio: '1/1', background: 'var(--bg-body)', borderRadius: '8px', 
                                border: tempBg === '' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative'
                            }}
                        >
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>默认</span>
                            {tempBg === '' && <Checkmark />}
                        </div>
                        {COLORS.map(color => (
                            <div 
                                key={color}
                                onClick={() => handleSelect(color)}
                                style={{ 
                                    aspectRatio: '1/1', background: color, borderRadius: '8px', 
                                    border: '1px solid rgba(0,0,0,0.1)', 
                                    cursor: 'pointer', boxSizing: 'border-box', position: 'relative'
                                }}
                            >
                                {tempBg === color && <Checkmark />}
                            </div>
                        ))}
                    </div>

                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>流光渐变</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                        {GRADIENTS.map((grad, idx) => (
                            <div 
                                key={idx}
                                onClick={() => handleSelect(grad)}
                                style={{ 
                                    aspectRatio: '16/9', background: grad, borderRadius: '8px', 
                                    border: '1px solid rgba(0,0,0,0.1)', 
                                    cursor: 'pointer', boxSizing: 'border-box', position: 'relative'
                                }}
                            >
                                {tempBg === grad && <Checkmark />}
                            </div>
                        ))}
                    </div>

                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>精选插画</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                        {WALLPAPERS.map((img, idx) => (
                            <div 
                                key={idx}
                                onClick={() => handleSelect(img)}
                                style={{ 
                                    aspectRatio: '9/16', background: img, backgroundSize: 'cover', backgroundPosition: 'center',
                                    borderRadius: '8px', 
                                    border: '1px solid rgba(0,0,0,0.1)', 
                                    cursor: 'pointer', boxSizing: 'border-box', position: 'relative'
                                }}
                            >
                                {tempBg === img && <Checkmark />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ 
                padding: '16px', background: 'var(--bg-card)', 
                borderTop: '0.5px solid var(--border-color)',
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                zIndex: 10
            }}>
                <button 
                    onClick={handleRestoreDefault}
                    style={{ 
                        width: '100%', padding: '14px', background: 'var(--bg-body)', 
                        border: 'none', borderRadius: '12px',
                        color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    {sessionId ? '恢复为全局背景' : '恢复系统默认'}
                </button>
            </div>
        </div>
    );
};