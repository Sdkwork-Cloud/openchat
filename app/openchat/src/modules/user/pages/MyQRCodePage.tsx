
import React from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';

export const MyQRCodePage: React.FC = () => {
    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="我的二维码" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ width: '100%', maxWidth: '320px', background: 'var(--bg-card)', borderRadius: '12px', padding: '30px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', width: '100%', marginBottom: '24px', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Felix)', backgroundSize: 'cover', marginRight: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>AI User</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>上海</div>
                        </div>
                    </div>
                    
                    {/* QR Code Simulation */}
                    <div style={{ width: '240px', height: '240px', position: 'relative', marginBottom: '10px' }}>
                        {/* CSS Pattern to simulate complex QR */}
                        <div style={{ 
                            width: '100%', height: '100%', 
                            background: 'var(--text-primary)', 
                            opacity: 0.85, 
                            maskImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjwvc3ZnPg==")', 
                            maskSize: '12px 12px',
                            imageRendering: 'pixelated'
                        }} />
                        
                        {/* Corner Markers */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', border: '4px solid var(--text-primary)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', background: 'var(--text-primary)' }} />
                        </div>
                         <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', border: '4px solid var(--text-primary)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', background: 'var(--text-primary)' }} />
                        </div>
                         <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', border: '4px solid var(--text-primary)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', background: 'var(--text-primary)' }} />
                        </div>

                        {/* Center Icon */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '4px', borderRadius: '4px', boxShadow: '0 0 8px rgba(0,0,0,0.1)' }}>
                            <div style={{ width: '32px', height: '32px', backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Felix)', backgroundSize: 'cover' }}></div>
                        </div>
                    </div>
                    
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '20px' }}>
                        扫一扫上面的二维码图案，加我微信
                    </div>
                </div>
            </div>
        </div>
    );
};
