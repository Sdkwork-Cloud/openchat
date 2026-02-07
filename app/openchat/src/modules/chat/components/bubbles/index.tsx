
import React, { useState } from 'react';
import { Toast } from '../../../../components/Toast';

// --- Voice Bubble ---
export const VoiceBubble: React.FC<{ duration: string; isUser: boolean }> = ({ duration, isUser }) => {
    const [playing, setPlaying] = useState(false);
    
    const play = () => {
        if (playing) return;
        setPlaying(true);
        const sec = parseInt(duration) || 3;
        setTimeout(() => setPlaying(false), sec * 1000);
    };

    return (
        <div 
            onClick={(e) => { e.stopPropagation(); play(); }}
            style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                minWidth: '60px', justifyContent: isUser ? 'flex-end' : 'flex-start', cursor: 'pointer',
                userSelect: 'none'
            }}
        >
            <span style={{ fontSize: '15px', fontWeight: 500, opacity: 0.9 }}>{duration}</span>
            <div style={{ position: 'relative', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ transform: isUser ? 'rotate(180deg)' : 'none', opacity: playing ? 0.8 : 1 }}>
                    <path d="M12 16C12.5 16 13 15.5 13 15C13 14.5 12.5 14 12 14C11.5 14 11 14.5 11 15C11 15.5 11.5 16 12 16Z" fill="currentColor" className={playing ? 'voice-dot-anim' : ''} />
                    <path d="M8.5 11.5C9.5 10.5 10.7 10 12 10C13.3 10 14.5 10.5 15.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={playing ? 'voice-arc-1' : ''} opacity={playing ? 1 : 0.6} />
                    <path d="M5.5 8.5C7.2 6.8 9.5 5.8 12 5.8C14.5 5.8 16.8 6.8 18.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={playing ? 'voice-arc-2' : ''} opacity={playing ? 1 : 0.4} />
                </svg>
            </div>
            <style>{`
                .voice-arc-1 { animation: voice-fade 1s infinite 0.2s; }
                .voice-arc-2 { animation: voice-fade 1s infinite 0.4s; }
                @keyframes voice-fade { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
            `}</style>
        </div>
    );
};

// --- Image Bubble ---
export const ImageBubble: React.FC<{ isUser: boolean }> = ({ isUser }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div 
            onClick={(e) => { e.stopPropagation(); Toast.info('查看大图'); }}
            style={{ 
                borderRadius: '8px', 
                overflow: 'hidden', 
                cursor: 'pointer', 
                maxWidth: '100%',
                position: 'relative',
                background: '#e0e0e0',
                minWidth: '120px',
                minHeight: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img 
                src={`https://picsum.photos/400/300?random=${Math.random()}`} 
                alt="Sent Image" 
                onLoad={() => setLoaded(true)}
                style={{ 
                    display: 'block', 
                    maxWidth: '240px', 
                    height: 'auto',
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.4s ease-in'
                }} 
            />
            {!loaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.5)', borderTopColor: 'rgba(0,0,0,0.4)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            )}
        </div>
    );
};

// --- Location Bubble ---
export const LocationBubble: React.FC<{ label: string }> = ({ label }) => (
    <div style={{ width: '230px', cursor: 'pointer', overflow: 'hidden', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} onClick={(e) => { e.stopPropagation(); Toast.info('查看位置'); }}>
        <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label || '我的位置'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>上海市 · 浦东新区</div>
        </div>
        <div style={{ height: '90px', background: '#f2f2f2', position: 'relative' }}>
            <div style={{ width: '100%', height: '100%', opacity: 0.7, background: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/2000px-World_map_blank_without_borders.svg.png) center/cover' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -80%)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#fa5151" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
            </div>
        </div>
    </div>
);

// --- Red Packet Bubble ---
export const RedPacketBubble: React.FC<{ text: string }> = ({ text }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); Toast.success('领取成功'); }}
        style={{ width: '230px', background: 'linear-gradient(135deg, #fa9d3b 0%, #f76b1c 100%)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(250, 157, 59, 0.2)' }}
    >
        <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '38px', height: '38px', background: '#fcd692', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', color: '#fa9d3b', fontSize: '22px' }}>🧧</div>
            <div style={{ color: 'white', fontSize: '15px', fontWeight: 500, lineHeight: 1.2 }}>{text || '恭喜发财，大吉大利'}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.95)', padding: '6px 14px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            WeChat Red Packet
        </div>
    </div>
);
