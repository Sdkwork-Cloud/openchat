
import React, { useState, useRef } from 'react';
import { navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Toast } from '../../../components/Toast';
import { Avatar } from '../../../components/Avatar';

const THEMES = [
    { id: 'blue', bg: 'linear-gradient(135deg, #2979FF 0%, #00d2ff 100%)', color: 'white', accent: 'rgba(255,255,255,0.2)' },
    { id: 'dark', bg: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)', color: '#ffd700', accent: 'rgba(255,215,0,0.2)' },
    { id: 'orange', bg: 'linear-gradient(135deg, #FF9C6E 0%, #fa5151 100%)', color: 'white', accent: 'rgba(255,255,255,0.2)' },
    { id: 'purple', bg: 'linear-gradient(135deg, #7928CA 0%, #FF0080 100%)', color: 'white', accent: 'rgba(255,255,255,0.2)' },
];

export const SharePosterPage: React.FC = () => {
    const [themeIndex, setThemeIndex] = useState(0);
    const [customBg, setCustomBg] = useState<string | null>(null);
    const [slogan, setSlogan] = useState('未来电商\n触手可及');
    const [isEditing, setIsEditing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const theme = THEMES[themeIndex];

    const handleSave = () => {
        Toast.loading('正在生成图片...');
        setTimeout(() => {
            Toast.success('已保存到相册');
        }, 1500);
    };

    const toggleTheme = () => {
        if (!isEditing && !customBg) setThemeIndex((prev) => (prev + 1) % THEMES.length);
    };

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setCustomBg(url);
        }
        e.target.value = '';
    };

    const clearCustomBg = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCustomBg(null);
    };

    // Derived style for poster background
    const posterStyle: React.CSSProperties = customBg ? {
        backgroundImage: `url(${customBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    } : {
        background: theme.bg
    };

    const textColor = customBg ? '#ffffff' : theme.color;
    const textShadow = customBg ? '0 2px 8px rgba(0,0,0,0.8)' : '0 4px 12px rgba(0,0,0,0.1)';

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="邀请海报" onBack={() => navigateBack('/commerce/distribution')} />
            
            <input type="file" ref={fileInputRef} accept="image/*" style={{display: 'none'}} onChange={handleBgUpload} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                {/* Poster Container */}
                <div 
                    onClick={toggleTheme}
                    style={{ 
                        width: '100%', maxWidth: '300px', 
                        aspectRatio: '3/5', 
                        borderRadius: '20px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                        padding: '30px',
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between',
                        color: textColor,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'background 0.5s',
                        cursor: 'pointer',
                        ...posterStyle
                    }}
                >
                    {/* Custom BG Overlay */}
                    {customBg && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6))', pointerEvents: 'none' }} />}

                    {/* Decorative Circles (Only if not custom bg) */}
                    {!customBg && (
                        <>
                            <div style={{ position: 'absolute', top: -100, right: -100, width: '300px', height: '300px', background: theme.accent, borderRadius: '50%', filter: 'blur(40px)' }} />
                            <div style={{ position: 'absolute', bottom: -50, left: -50, width: '200px', height: '200px', background: theme.accent, borderRadius: '50%', filter: 'blur(30px)' }} />
                        </>
                    )}
                    
                    <div style={{ zIndex: 1, position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                            <div style={{ border: `2px solid ${textColor}`, borderRadius: '50%', padding: '2px', opacity: 0.9 }}>
                                <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" size={44} shape="circle" border={false} />
                            </div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px', textShadow }}>AI User</div>
                                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', textShadow }}>邀请您加入 OpenChat</div>
                            </div>
                        </div>
                        
                        {isEditing ? (
                            <textarea 
                                value={slogan}
                                onChange={e => setSlogan(e.target.value)}
                                onBlur={() => setIsEditing(false)}
                                autoFocus
                                style={{ 
                                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '8px',
                                    color: 'inherit', fontSize: '32px', fontWeight: 800, width: '100%', height: '120px',
                                    resize: 'none', outline: 'none', lineHeight: 1.15
                                }}
                            />
                        ) : (
                            <div 
                                onClick={(e) => { e.stopPropagation(); setIsEditing(true); Toast.info('点击文字可编辑'); }}
                                style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.15, textShadow, whiteSpace: 'pre-wrap', border: '1px dashed transparent', padding: '4px', margin: '-4px' }}
                            >
                                {slogan}
                            </div>
                        )}
                        
                        <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '16px', lineHeight: 1.6, maxWidth: '80%', textShadow }}>
                            加入我们，利用 AI 技术轻松开启副业。
                        </div>
                    </div>

                    {/* Bottom White Card */}
                    <div style={{ 
                        background: 'rgba(255,255,255,0.95)', 
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        color: '#333',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                        zIndex: 1
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Invitation Code</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '2px', fontFamily: 'DIN Alternate' }}>AI888</div>
                        </div>
                        <div style={{ width: '60px', height: '60px', position: 'relative' }}>
                            {/* QR Mock */}
                            <div style={{ width: '100%', height: '100%', background: '#333', maskImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjwvc3ZnPg==")', maskSize: '10px 10px' }} />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {!customBg && THEMES.map((t, idx) => (
                        <div 
                            key={t.id}
                            onClick={() => setThemeIndex(idx)}
                            style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', 
                                background: t.bg, border: themeIndex === idx ? '2px solid var(--text-primary)' : '2px solid transparent',
                                cursor: 'pointer', transition: 'all 0.2s', transform: themeIndex === idx ? 'scale(1.1)' : 'scale(1)'
                            }} 
                        />
                    ))}
                    
                    {/* Upload Custom BG Button */}
                    <div 
                        onClick={() => customBg ? null : fileInputRef.current?.click()}
                        style={{ 
                            width: customBg ? 'auto' : '32px', height: '32px', borderRadius: customBg ? '16px' : '50%',
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)',
                            padding: customBg ? '0 12px' : '0'
                        }}
                    >
                        {customBg ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={clearCustomBg}>
                                <span style={{ fontSize: '12px' }}>清除背景</span>
                                <span style={{ fontSize: '14px' }}>✕</span>
                            </div>
                        ) : (
                            <span>📷</span>
                        )}
                    </div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {customBg ? '已应用自定义背景' : '点击上方圆点切换风格，点击文字可修改'}
                </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
                <button 
                    onClick={handleSave}
                    style={{ 
                        width: '100%', padding: '14px', borderRadius: '14px', 
                        background: 'var(--primary-gradient)', color: 'white', 
                        border: 'none', fontSize: '16px', fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    保存海报
                </button>
            </div>
        </div>
    );
};
