
import React, { useEffect, useState } from 'react';
import { navigateBack } from '../../../router';
import { Platform } from '../../../platform';
import { CallService } from '../services/CallService';

export const VideoCallPage: React.FC = () => {
    const [status, setStatus] = useState('正在等待对方接受邀请...');
    
    // Simulate connection flow
    useEffect(() => {
        const timer = setTimeout(() => {
            setStatus('对方手机可能不在身边...');
        }, 8000);
        return () => clearTimeout(timer);
    }, []);

    const handleEndCall = async () => {
        Platform.device.vibrate(20);
        
        // Log the call event
        await CallService.logCall({
            type: 'video',
            targetName: 'OpenChat User',
            targetAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omni',
            direction: 'outgoing',
            status: 'missed', // Demo status
            duration: 0
        });

        navigateBack();
    };

    return (
        <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Blurred Background Simulation */}
            <div style={{ 
                position: 'absolute', inset: 0, 
                backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Omni)', 
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'blur(30px) brightness(0.6)', transform: 'scale(1.2)',
                zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 0', color: 'white' }}>
                
                {/* User Info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, paddingTop: '40px' }}>
                    <div style={{ 
                        width: '120px', height: '120px', borderRadius: '20px', marginBottom: '24px', 
                        backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Omni)', 
                        backgroundSize: 'cover', border: '2px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                    }}></div>
                    <div style={{ fontSize: '28px', fontWeight: 600, marginBottom: '12px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>OpenChat User</div>
                    <div style={{ fontSize: '16px', opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{status}</div>
                </div>
                
                {/* Pulsing Rings Animation */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: -1 }}>
                     <div className="pulse-ring" style={{ width: '300px', height: '300px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', animation: 'pulse 3s infinite' }}></div>
                     <div className="pulse-ring" style={{ width: '450px', height: '450px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%', animation: 'pulse 3s infinite 1s', position: 'absolute', top: '-75px', left: '-75px' }}></div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', padding: '0 40px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                         <div 
                            onClick={handleEndCall} 
                            style={{ 
                                width: '72px', height: '72px', borderRadius: '50%', background: '#fa5151', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(250, 81, 81, 0.4)'
                            }}
                         >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                         </div>
                         <span style={{ fontSize: '14px', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>取消</span>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
};
