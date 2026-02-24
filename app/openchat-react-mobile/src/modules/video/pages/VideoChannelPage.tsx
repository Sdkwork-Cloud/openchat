
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar'; 
import { navigateBack } from '../../../router';
import { Toast } from '../../../components/Toast';
import { VideoService, Video } from '../services/VideoService';
import { Icon } from '../../../components/Icon/Icon';
import { useTranslation } from '../../../core/i18n/I18nContext';

interface Heart {
    id: number;
    x: number;
    y: number;
    angle: number;
    scale: number;
}

const VideoItem = ({ data, isActive }: { data: Video, isActive: boolean }) => {
    const { t } = useTranslation();
    const [liked, setLiked] = useState(data.hasLiked);
    const [paused, setPaused] = useState(false);
    const [hearts, setHearts] = useState<Heart[]>([]);
    const lastClick = useRef(0);

    // Reset paused state when becoming active/inactive
    useEffect(() => {
        if (!isActive) setPaused(false);
    }, [isActive]);

    const handleClick = (e: React.MouseEvent) => {
        const now = Date.now();
        if (now - lastClick.current < 300) {
            // Double Click
            handleLike(true, e.clientX, e.clientY);
        } else {
            // Single Click
            setPaused(p => !p);
        }
        lastClick.current = now;
    };

    const handleLike = (fromDoubleClick = false, x = 0, y = 0) => {
        if (!liked || fromDoubleClick) {
            if (fromDoubleClick) {
                // Add multiple hearts for effect
                const count = 3 + Math.floor(Math.random() * 3);
                const newHearts: Heart[] = [];
                for(let i=0; i<count; i++) {
                    newHearts.push({
                        id: Date.now() + i,
                        x: x + (Math.random() * 60 - 30),
                        y: y + (Math.random() * 60 - 30),
                        angle: Math.random() * 40 - 20,
                        scale: 0.8 + Math.random() * 0.6
                    });
                }
                setHearts(prev => [...prev, ...newHearts]);
                
                // Cleanup hearts
                setTimeout(() => {
                    setHearts(prev => prev.filter(h => !newHearts.find(nH => nH.id === h.id)));
                }, 1000);
            }
            if (!liked) {
                setLiked(true);
                VideoService.toggleLike(data.id);
                if (navigator.vibrate) navigator.vibrate(10);
            }
        } else if (!fromDoubleClick) {
            setLiked(false);
            VideoService.toggleLike(data.id);
        }
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
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.7, color: 'white' }}>
                     <Icon name="arrow-right" size={60} />
                </div>
            )}

            {/* Dynamic Hearts Layer */}
            {hearts.map(heart => (
                <div 
                    key={heart.id}
                    className="floating-heart"
                    style={{ 
                        position: 'absolute', 
                        left: heart.x, 
                        top: heart.y,
                        transform: `rotate(${heart.angle}deg) scale(${heart.scale})`,
                        pointerEvents: 'none',
                        zIndex: 20
                    }}
                >
                    <Icon name="heart-fill" size={80} color="#fa5151" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
                </div>
            ))}

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
                    <div style={{ marginRight: '6px' }}>
                        <Icon name="music" size={14} color="white" />
                    </div>
                    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '150px' }}>
                        <div style={{ animation: isActive && !paused ? 'scrollText 5s linear infinite' : 'none', fontSize: '13px' }}>
                             Original Audio - AI Symphony Orchestra • Tech Blue 
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '60px', right: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', zIndex: 20 }}>
                {/* Avatar with Follow */}
                <div style={{ position: 'relative', marginBottom: '10px' }} onClick={(e) => { e.stopPropagation(); Toast.success('已关注'); }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid white', overflow: 'hidden' }}>
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${data.author}`} style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '20px', background: '#fa5151', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="plus" size={12} color="white" />
                    </div>
                </div>

                {/* Like */}
                <div onClick={(e) => { e.stopPropagation(); handleLike(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Icon name={liked ? "heart-fill" : "heart"} size={36} color={liked ? "#fa5151" : "white"} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', transition: 'transform 0.2s', transform: liked ? 'scale(1.1)' : 'scale(1)' }} />
                    <span style={{ color: 'white', fontSize: '12px', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{liked ? '10w+' : data.likes}</span>
                </div>

                {/* Comments */}
                <div onClick={(e) => { e.stopPropagation(); Toast.info('评论功能开发中'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <Icon name="comment" size={34} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                     <span style={{ color: 'white', fontSize: '12px', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{data.comments}</span>
                </div>

                {/* Share */}
                <div onClick={(e) => { e.stopPropagation(); Toast.info('已复制链接'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <Icon name="share" size={34} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                     <span style={{ color: 'white', fontSize: '12px', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{t('video.share')}</span>
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

            <div style={{ position: 'absolute', bottom: '0', left: 0, right: 0, height: '1.5px', background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ 
                    height: '100%', 
                    background: 'white', 
                    width: isActive && !paused ? '100%' : '0%', 
                    transition: isActive && !paused ? 'width 15s linear' : 'none' 
                }} />
            </div>
            <style>{`
                .floating-heart {
                    animation: floatUp 0.8s ease-out forwards;
                }
                @keyframes floatUp {
                    0% { transform: scale(0) translateY(0); opacity: 0; }
                    20% { transform: scale(1.2) translateY(-20px); opacity: 1; }
                    100% { transform: scale(1.5) translateY(-100px); opacity: 0; }
                }
                /* Existing animations ... */
                .neural-gradient {
                    position: absolute; inset: 0;
                    background: radial-gradient(circle at 50% 50%, #2b0aff, #000);
                    opacity: 0.6;
                    animation: pulse 4s infinite alternate;
                }
                .particles {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(#fff 1px, transparent 1px);
                    background-size: 30px 30px;
                    opacity: 0.3;
                    animation: float 10s linear infinite;
                }
                .matrix-rain {
                    position: absolute; inset: 0;
                    background: linear-gradient(180deg, rgba(0,255,0,0), rgba(0,255,0,0.5));
                    background-size: 100% 200%;
                    animation: rain 2s linear infinite;
                    opacity: 0.2;
                }
                .aurora-glow {
                    position: absolute; inset: -50%;
                    background: linear-gradient(45deg, #00ffcc, #ff00ff, #0000ff);
                    filter: blur(60px);
                    animation: aurora 8s ease-in-out infinite alternate;
                    opacity: 0.5;
                }
                .music-note {
                    position: absolute;
                    font-size: 16px;
                    color: white;
                    opacity: 0;
                    animation: noteFloat 2s linear infinite;
                }
                @keyframes pulse { 0% { opacity: 0.4; transform: scale(1); } 100% { opacity: 0.8; transform: scale(1.1); } }
                @keyframes float { 0% { transform: translateY(0); } 100% { transform: translateY(-100px); } }
                @keyframes rain { 0% { background-position: 0% 0%; } 100% { background-position: 0% 200%; } }
                @keyframes aurora { 0% { transform: rotate(0deg); } 100% { transform: rotate(30deg); } }
                @keyframes scrollText { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes noteFloat { 0% { transform: translate(0, 0) rotate(0deg); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(20px, -40px) rotate(20deg); opacity: 0; } }
            `}</style>
        </div>
    );
};

export const VideoChannelPage: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const load = async () => {
            const res = await VideoService.getRecommendedVideos();
            if (res.success && res.data) {
                setVideos(res.data.content);
            }
        };
        load();
    }, []);

    // Smart Intersection Observer for Active State
    useEffect(() => {
        const options = {
            root: containerRef.current,
            threshold: 0.6, // Trigger when 60% visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.getAttribute('data-index'));
                    if (!isNaN(index)) {
                        setActiveIndex(index);
                    }
                }
            });
        }, options);

        itemRefs.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [videos]);

    return (
        <div style={{ height: '100%', background: 'black', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                <Navbar title="" variant="transparent" onBack={() => navigateBack('/discover')} />
            </div>
            
            <div 
                ref={containerRef}
                style={{ 
                    height: '100%', 
                    overflowY: 'scroll', 
                    scrollSnapType: 'y mandatory',
                    scrollbarWidth: 'none'
                }}
            >
                {videos.map((video, index) => (
                    <div 
                        key={video.id} 
                        data-index={index}
                        ref={(el) => itemRefs.current[index] = el}
                        style={{ height: '100%', width: '100%', scrollSnapAlign: 'start' }}
                    >
                        <VideoItem data={video} isActive={index === activeIndex} />
                    </div>
                ))}
            </div>
        </div>
    );
};
