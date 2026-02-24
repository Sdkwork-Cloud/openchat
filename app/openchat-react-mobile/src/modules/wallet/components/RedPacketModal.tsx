
import React, { useState } from 'react';
import { Toast } from '../../../components/Toast';

interface RedPacketModalProps {
    visible: boolean;
    onClose: () => void;
    senderName?: string;
    senderAvatar?: string;
    message?: string;
}

export const RedPacketModal: React.FC<RedPacketModalProps> = ({ visible, onClose, senderName = '好友', senderAvatar, message = '恭喜发财，大吉大利' }) => {
    const [status, setStatus] = useState<'closed' | 'opening' | 'opened'>('closed');
    const [amount, setAmount] = useState('0.00');

    if (!visible) return null;

    const handleOpen = () => {
        setStatus('opening');
        // Simulate network
        setTimeout(() => {
            setAmount((Math.random() * 100 + 0.01).toFixed(2));
            setStatus('opened');
        }, 1000);
    };

    const handleClose = () => {
        setStatus('closed');
        onClose();
    };

    // --- RENDER: OPENED STATE (Result View) ---
    if (status === 'opened') {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s' }}>
                {/* Top Section */}
                <div style={{ background: '#d95940', height: '120px', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ 
                        position: 'absolute', bottom: '-40px', 
                        width: '800px', height: '800px', background: 'var(--bg-body)', 
                        borderRadius: '50%', zIndex: 0 
                    }} />
                    <div 
                        onClick={handleClose}
                        style={{ position: 'absolute', top: '16px', left: '16px', color: '#fbe2b5', fontSize: '16px', fontWeight: 500, cursor: 'pointer', zIndex: 10 }}
                    >
                        关闭
                    </div>
                    
                    <div style={{ position: 'absolute', bottom: '-24px', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '4px', backgroundImage: `url(${senderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=RP'})`, backgroundSize: 'cover', border: '1px solid rgba(0,0,0,0.1)' }}></div>
                        <div style={{ marginTop: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>{senderName}的红包</div>
                    </div>
                </div>

                {/* Amount */}
                <div style={{ marginTop: '50px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{message}</div>
                    <div style={{ marginTop: '16px', fontSize: '48px', fontWeight: 600, color: '#cfb583', fontFamily: 'DIN Alternate, sans-serif' }}>
                        <span style={{ fontSize: '24px' }}>¥</span>{amount}
                    </div>
                    <div 
                        onClick={() => Toast.info('已存入零钱')}
                        style={{ marginTop: '12px', color: '#576b95', fontSize: '12px', cursor: 'pointer' }}
                    >
                        已存入零钱，直接提现 &gt;
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: CLOSED STATE (Cover View) ---
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', animation: 'fadeIn 0.2s' }}>
            <div style={{ 
                width: '300px', height: '480px', background: '#d95940', 
                borderRadius: '16px', overflow: 'hidden', position: 'relative',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                {/* Top Curve */}
                <div style={{ 
                    position: 'absolute', top: '-400px', left: '-50%', width: '200%', height: '600px', 
                    background: '#d05038', borderRadius: '50%',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }} />

                <div 
                    onClick={handleClose}
                    style={{ position: 'absolute', top: '12px', right: '12px', color: 'rgba(0,0,0,0.3)', fontSize: '24px', cursor: 'pointer', zIndex: 10 }}
                >
                    ×
                </div>

                {/* Content Info */}
                <div style={{ position: 'absolute', top: '60px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fbe2b5', zIndex: 2 }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', backgroundImage: `url(${senderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=RP'})`, backgroundSize: 'cover', marginBottom: '12px', border: '2px solid #fbe2b5' }}></div>
                    <div style={{ fontSize: '18px', fontWeight: 500 }}>{senderName}</div>
                    <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.8 }}>发了一个红包</div>
                    <div style={{ fontSize: '20px', marginTop: '24px', fontWeight: 600, padding: '0 30px', textAlign: 'center', lineHeight: 1.4 }}>{message}</div>
                </div>

                {/* Open Button */}
                <div style={{ position: 'absolute', bottom: '80px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 5 }}>
                    <div 
                        onClick={handleOpen}
                        style={{ 
                            width: '100px', height: '100px', borderRadius: '50%', background: '#ebcd99',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '48px', color: '#333', fontWeight: 600,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer',
                            transition: 'transform 0.1s',
                            animation: status === 'opening' ? 'coinSpin 1s infinite linear' : 'none'
                        }}
                    >
                        开
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes coinSpin { 
                    0% { transform: rotateY(0deg); } 
                    100% { transform: rotateY(360deg); } 
                }
            `}</style>
        </div>
    );
};
