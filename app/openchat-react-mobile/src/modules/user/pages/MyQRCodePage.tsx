
import React, { useState } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { QRCodeActionSheet } from '../components/QRCodeActionSheet';
import { useQueryParams } from '../../../router';

type QRStyle = 'classic' | 'dot' | 'liquid';

export const MyQRCodePage: React.FC = () => {
    const query = useQueryParams();
    const type = query.get('type') || 'user'; // 'user' or 'group'
    const name = query.get('name') || 'AI User';
    
    const [showSheet, setShowSheet] = useState(false);
    const [style, setStyle] = useState<QRStyle>('classic');

    const handleStyleChange = (newStyle: QRStyle) => {
        if (newStyle === 'dot') {
            setStyle(prev => prev === 'classic' ? 'dot' : (prev === 'dot' ? 'liquid' : 'classic'));
        } else {
            setStyle(newStyle);
        }
    };

    // Style Configurations
    const getPattern = () => {
        switch(style) {
            case 'liquid': return 'radial-gradient(circle, var(--text-primary) 30%, transparent 31%)';
            case 'dot': return 'radial-gradient(var(--text-primary) 2px, transparent 0)';
            case 'classic': default: return 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjwvc3ZnPg==")';
        }
    };

    const getSize = () => {
        switch(style) {
            case 'liquid': return '16px 16px';
            case 'dot': return '8px 8px';
            case 'classic': default: return '12px 12px';
        }
    };

    const getCornerRadius = () => style === 'liquid' ? '50%' : '0';

    const avatarUrl = type === 'group' 
        ? 'https://api.dicebear.com/7.x/initials/svg?seed=GP' 
        : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

    const title = type === 'group' ? '群二维码' : '我的二维码';
    const desc = type === 'group' ? '邀请好友扫码加入群聊' : '扫一扫上面的二维码图案，加我好友';

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title={title} backFallback="/me" rightElement={<div onClick={() => setShowSheet(true)} style={{padding: '0 12px', fontWeight: 900, cursor: 'pointer'}}>···</div>} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ width: '100%', maxWidth: '320px', background: 'var(--bg-card)', borderRadius: '12px', padding: '30px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', width: '100%', marginBottom: '24px', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', marginRight: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{type === 'group' ? 'OpenChat Group' : '上海'}</div>
                        </div>
                    </div>
                    
                    {/* QR Code Simulation */}
                    <div style={{ width: '240px', height: '240px', position: 'relative', marginBottom: '10px' }}>
                        <div style={{ 
                            width: '100%', height: '100%', 
                            background: style === 'classic' ? 'var(--text-primary)' : 'transparent', 
                            backgroundImage: style === 'dot' || style === 'liquid' ? getPattern() : undefined,
                            opacity: 0.85, 
                            maskImage: style === 'classic' ? getPattern() : undefined,
                            maskSize: getSize(),
                            backgroundSize: getSize(),
                            imageRendering: 'pixelated',
                            transition: 'all 0.3s ease-in-out'
                        }} />
                        
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', border: '4px solid var(--text-primary)', borderRadius: getCornerRadius(), background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', background: 'var(--text-primary)', borderRadius: style === 'liquid' ? '50%' : '0' }} />
                        </div>
                         <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', border: '4px solid var(--text-primary)', borderRadius: getCornerRadius(), background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', background: 'var(--text-primary)', borderRadius: style === 'liquid' ? '50%' : '0' }} />
                        </div>
                         <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', border: '4px solid var(--text-primary)', borderRadius: getCornerRadius(), background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', background: 'var(--text-primary)', borderRadius: style === 'liquid' ? '50%' : '0' }} />
                        </div>

                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', padding: '4px', borderRadius: '4px', boxShadow: '0 0 8px rgba(0,0,0,0.1)' }}>
                            <div style={{ width: '32px', height: '32px', backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover' }}></div>
                        </div>
                    </div>
                    
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '20px', textAlign: 'center' }}>
                        {desc}
                    </div>
                </div>
            </div>
            
            <QRCodeActionSheet 
                visible={showSheet} 
                onClose={() => setShowSheet(false)} 
                onStyleChange={handleStyleChange}
            />
        </div>
    );
};
