import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar/Navbar'; 

const MOCK_VIDEOS = [
  { id: 1, title: 'Neural Network Dreaming', author: 'Omni Vision', likes: '10.2w', comments: '882', type: 'neural' },
  { id: 2, title: 'Data Stream Flow', author: 'Tech Core', likes: '5.6w', comments: '341', type: 'matrix' },
  { id: 3, title: 'Aurora AI', author: 'Nature Bot', likes: '21.8w', comments: '1.2k', type: 'aurora' },
  { id: 4, title: 'Generative Art', author: 'Creative AI', likes: '8.9w', comments: '556', type: 'neural' },
  { id: 5, title: 'System Core', author: 'Admin', likes: '99.9w', comments: '9999', type: 'matrix' }
];

const VideoItem = ({ data, isActive }: { data: typeof MOCK_VIDEOS[0], isActive: boolean }) => {
    const [liked, setLiked] = useState(false);
    const [paused, setPaused] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const lastClick = useRef(0);

    const handleClick = (e: React.MouseEvent) => {
        const now = Date.now();
        if (now - lastClick.current < 300) {
            setLiked(true);
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        } else {
            setPaused(p => !p);
        }
        lastClick.current = now;
    };

    const renderVisuals = () => {
        const animState = isActive && !paused ? 'running' : 'paused';
        
        if (data.type === 'neural') {
            return (
                <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
                    <div className="neural-gradient" style={{ animationPlayState: animState }} />
                    <div className="particles" style={{ animationPlayState: animState }} />
                </div>
            );
        }
        if (data.type === 'matrix') {
             return (
                <div style={{ width: '100%', height: '100%', background: '#0d0d0d', position: 'relative', overflow: 'hidden' }}>
                    <div className="matrix-rain" style={{ animationPlayState: animState }} />
                </div>
            );
        }
        return (
            <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
                <div className="aurora-glow" style={{ animationPlayState: animState }} />
            </div>
        );
    };

    return (
        <div 
            onClick={handleClick}
            style={{ 
                height: '100%', 
                width: '100%', 
                position: 'relative', 
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                overflow: 'hidden'
            }}
        >
            {renderVisuals()}

            {paused && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.7 }}>
                     <svg width="60" height="60" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
            )}

            {showHeart && (
                <div className="pop-heart" style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="#fa5151" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
            )}

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none' }} />

            <div style={{ position: 'absolute', bottom: '60px', left: '16px', right: '80px', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fff', marginRight: '10px' }}>
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${data.author}`} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '17px' }}>@{data.author}</span>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.4', marginBottom: '8px' }}>
                    {data.title} <span style={{ opacity: 0.8 }}>#AI #Generative #Future</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{ marginRight: '6px' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '150px' }}>
                        <div style={{ animation: isActive && !paused ? 'scrollText 5s linear infinite' : 'none', fontSize: '13px' }}>
                             Original Audio - AI Symphony Orchestra • Tech Blue 
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '60px', right: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', zIndex: 20 }}>
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid white', overflow: 'hidden' }}>
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${data.author}`} style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '20px', background: '#fa5151', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </div>
                </div>

                <div onClick={(e) => { e.stopPropagation(); setLiked(!liked); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill={liked ? "#fa5151" : "white"} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', transition: 'transform 0.2s', transform: liked ? 'scale(1.1)' : 'scale(1)' }}>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span style={{ color: 'white', fontSize: '12px', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{liked ? parseInt(data.likes) + 1 + 'w' : data.likes}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <svg width="34" height="34" viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                     </svg>
                     <span style={{ color: 'white', fontSize: '12px', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{data.comments}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <svg width="34" height="34" viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                        <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                     </svg>
                     <span style={{ color: 'white', fontSize: '12px', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>分享</span>
                </div>

                <div style={{ marginTop: '20px', width: '48px', height: '48px', borderRadius: '50%', background: '#222', border: '8px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: isActive && !paused ? 'spin 5s linear infinite' : 'none', position: 'relative' }}>
                     <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundImage: `url(https://api.dicebear.com/7.x/identicon/svg?seed=${data.author})`, backgroundSize: 'cover' }}></div>
                     {isActive && !paused && (
                         <>
                            <div className="music-note" style={{ animationDelay: '0s' }}>♪</div>
                            <div className="music-note" style={{ animationDelay: '1.2s' }}>♫</div>
                         </>
                     )}
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '0', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ 
                    height: '100%', 
                    background: 'white', 
                    width: isActive && !paused ? '100%' : '0%', 
                    transition: isActive && !paused ? 'width 10s linear' : 'none' 
                }} />
            </div>
        </div>
    );
};