
import React, { useEffect, useState } from 'react';
import { AudioService, AudioStatus } from '../../core/audio';
import { navigate } from '../../router';

export const MiniPlayer: React.FC = () => {
    const [track, setTrack] = useState(AudioService.track);
    const [status, setStatus] = useState(AudioService.status);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Initial state
        setTrack(AudioService.track);
        setStatus(AudioService.status);

        const unsub = AudioService.subscribe(() => {
            setTrack(AudioService.track);
            setStatus(AudioService.status);
            
            const dur = AudioService.duration || 1;
            setProgress((AudioService.currentTime / dur) * 100);
        });

        return unsub;
    }, []);

    if (!track || status === AudioStatus.STOPPED) return null;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        AudioService.toggle();
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        AudioService.stop();
    };
    
    const isPlaying = status === AudioStatus.PLAYING;

    // We render this above the tabbar.
    // Tabbar is 50px + safe-area. We give it some margin.
    return (
        <div style={{
            position: 'fixed',
            bottom: 'calc(62px + env(safe-area-inset-bottom))',
            left: '12px',
            right: '12px',
            height: '56px',
            background: 'rgba(30, 30, 30, 0.85)', // Dark glass for high contrast
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '28px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            zIndex: 90, // Below Modals (1000) but above content
            animation: 'slideUpPanel 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
        }}>
            {/* Progress Bar Background */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, height: '2px', 
                width: `${progress}%`, background: 'var(--primary-color)',
                transition: 'width 0.2s linear', zIndex: 2
            }} />

            {/* Rotating Disc */}
            <div 
                style={{ 
                    width: '44px', height: '44px', borderRadius: '50%', 
                    overflow: 'hidden', position: 'relative', flexShrink: 0,
                    animation: isPlaying ? 'spin 10s linear infinite' : 'none',
                    border: '2px solid rgba(255,255,255,0.1)'
                }}
            >
                <img 
                    src={track.cover || 'https://api.dicebear.com/7.x/identicon/svg?seed=music'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(transparent 30%, rgba(0,0,0,0.5))' }} />
                {/* Center Hole */}
                <div style={{ 
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '10px', height: '10px', background: '#222', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)'
                }} />
            </div>

            {/* Info */}
            <div 
                onClick={() => {
                     // Navigate to context if available, for now just show toast
                     // Ideally navigate back to the creation detail page if track.id matches a creation
                }}
                style={{ flex: 1, padding: '0 12px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer' }}
            >
                <div style={{ color: 'white', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.title}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.artist || 'AI Music'}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px' }}>
                <div 
                    onClick={handleToggle}
                    style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'white'
                    }}
                >
                    {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:'2px'}}><path d="M8 5v14l11-7z"/></svg>
                    )}
                </div>
                
                <div onClick={handleClose} style={{ padding: '6px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            </div>
        </div>
    );
};
