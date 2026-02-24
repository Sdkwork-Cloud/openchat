
import React, { useEffect, useState } from 'react';
import { useQueryParams, navigateBack, navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { CreationService, CreationItem } from '../services/CreationService';
import { ImageCreationPanel } from '../components/ImageCreationPanel';
import { VideoCreationPanel } from '../components/VideoCreationPanel';
import { MusicCreationPanel } from '../components/MusicCreationPanel';
import { Avatar } from '../../../components/Avatar';
import { CreationCard } from '../components/CreationCard';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';
import { AudioService, AudioStatus } from '../../../core/audio'; // Import Global Audio

// --- Media Player Components ---

const VinylPlayer: React.FC<{ item: CreationItem; }> = ({ item }) => {
    // Local state syncing with global service
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Check global state on mount
    useEffect(() => {
        const checkState = () => {
            const current = AudioService.track;
            const status = AudioService.status;
            // Matches ID?
            if (current?.id === item.id && status === AudioStatus.PLAYING) {
                setIsPlaying(true);
            } else {
                setIsPlaying(false);
            }
        };

        checkState();
        const unsub = AudioService.subscribe(checkState);
        return unsub;
    }, [item.id]);

    const handleToggle = () => {
        if (isPlaying) {
            AudioService.pause();
        } else {
            // Start playing this track
            // Use mock URL if real one is missing for demo
            const src = item.url && item.url.endsWith('.mp3') ? item.url : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; 
            
            AudioService.play({
                id: item.id,
                title: item.title,
                artist: item.author,
                cover: 'https://api.dicebear.com/7.x/shapes/svg?seed=Music', // Mock cover for vinyl center
                src: src
            });
        }
    };

    // Generate bars for waveform
    const bars = Array.from({ length: 20 });
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            {/* Turntable Area */}
            <div style={{ position: 'relative', width: '280px', height: '280px', marginBottom: '40px' }}>
                {/* Disc */}
                <div 
                    className={isPlaying ? 'playing-disk' : 'paused-disk'}
                    onClick={handleToggle}
                    style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        background: 'conic-gradient(#1a1a1a 0%, #000 25%, #1a1a1a 50%, #000 75%, #1a1a1a 100%)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', cursor: 'pointer',
                        border: '4px solid #111'
                    }}
                >
                    {/* Vinyl Grooves */}
                    <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }} />
                    <div style={{ position: 'absolute', inset: '20px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }} />
                    <div style={{ position: 'absolute', inset: '35px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }} />
                    
                    {/* Label Cover */}
                    <div style={{ width: '40%', height: '40%', borderRadius: '50%', overflow: 'hidden', border: '6px solid #111', position: 'relative', zIndex: 2 }}>
                        <div style={{ width: '100%', height: '100%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>🎵</div>
                    </div>
                </div>

                {/* Tone Arm */}
                <div style={{
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '80px', height: '140px',
                    borderRight: '8px solid #d1d1d6', borderTop: '8px solid #d1d1d6',
                    borderRadius: '0 20px 0 0',
                    transformOrigin: 'top right',
                    transform: isPlaying ? 'rotate(25deg)' : 'rotate(0deg)',
                    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    zIndex: 10, pointerEvents: 'none',
                    filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))'
                }} />
            </div>

            {/* Controls & Waveform */}
            <div style={{ width: '100%', padding: '0 40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '40px', marginBottom: '20px' }}>
                    {/* Play Button */}
                    <div onClick={handleToggle} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,255,255,0.2)' }}>
                        {isPlaying ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z"/></svg>
                        )}
                    </div>
                    
                    {/* Visualizer */}
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '24px' }}>
                        {bars.map((_, i) => (
                            <div 
                                key={i} 
                                className="equalizer-bar" 
                                style={{ 
                                    animationPlayState: isPlaying ? 'running' : 'paused',
                                    animationDelay: `${i * 0.05}s`,
                                    height: isPlaying ? undefined : '10%'
                                }} 
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const VideoPlayer: React.FC<{ cover?: string; isPlaying: boolean; onToggle: () => void }> = ({ cover, isPlaying, onToggle }) => (
    <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
        {!isPlaying && (
            <>
                {cover && <img src={cover} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}
                <div 
                    onClick={onToggle}
                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
                >
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            </>
        )}
        {isPlaying && (
            <div 
                onClick={onToggle}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
            >
                {/* Simulated Video Content */}
                <div style={{ fontSize: '48px', opacity: 0.5 }}>🎬</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '10px', fontSize: '12px' }}>Playing Demo...</div>
            </div>
        )}
    </div>
);

export const CreationDetailPage: React.FC = () => {
    const query = useQueryParams();
    const id = query.get('id');
    
    const [item, setItem] = useState<CreationItem | null>(null);
    const [related, setRelated] = useState<CreationItem[]>([]);
    const [showRemixPanel, setShowRemixPanel] = useState(false);
    
    // Video State (Local is fine for video as it usually stops on scroll away)
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [liked, setLiked] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (id) {
                const res = await CreationService.getById(id);
                if (res.success && res.data) {
                    setItem(res.data);
                    setLiked(false);
                    const relRes = await CreationService.getRelatedCreations(id);
                    if (relRes.success && relRes.data) {
                        setRelated(relRes.data);
                    }
                }
            }
        };
        load();
        setIsVideoPlaying(false);
    }, [id]);

    const handleCopyPrompt = () => {
        if (item?.prompt) {
            Platform.clipboard.write(item.prompt);
            Toast.success('提示词已复制');
        }
    };

    const handleRemix = () => {
        setShowRemixPanel(true);
    };

    const handleLike = () => {
        setLiked(!liked);
        Platform.device.vibrate(10);
    };

    if (!item) return <div style={{height: '100%', background: 'var(--bg-body)'}} />;

    const bgUrl = item.url && item.url.startsWith('http') ? item.url : undefined;

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {/* Immersive Background Blur */}
            {bgUrl && (
                <div style={{ 
                    position: 'absolute', inset: 0, zIndex: 0,
                    backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'blur(60px) brightness(0.5) saturate(1.5)', opacity: 0.6, transform: 'scale(1.2)'
                }} />
            )}

            <Navbar title="作品详情" variant="transparent" onBack={() => navigateBack('/creation')} />
            
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px', position: 'relative', zIndex: 1 }}>
                
                {/* 1. Media Stage */}
                <div style={{ width: '100%', padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 'calc(100% - 32px)', maxWidth: '500px' }}>
                        {item.type === 'music' ? (
                            <VinylPlayer 
                                item={item}
                            />
                        ) : item.type === 'video' ? (
                            <VideoPlayer 
                                cover={item.url} 
                                isPlaying={isVideoPlaying} 
                                onToggle={() => setIsVideoPlaying(!isVideoPlaying)} 
                            />
                        ) : (
                            <div style={{ 
                                borderRadius: '16px', overflow: 'hidden', 
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                                background: '#000', position: 'relative'
                            }}>
                                <img src={item.url || ''} style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '65vh', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Info Card (Glassmorphism) */}
                <div style={{ padding: '0 12px', marginTop: '16px' }}>
                    <div className="glass-panel" style={{ borderRadius: '16px', padding: '20px', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                            <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.2 }}>{item.title}</div>
                            <div 
                                onClick={handleLike}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '4px', 
                                    background: liked ? 'rgba(250, 81, 81, 0.1)' : 'rgba(255,255,255,0.1)', 
                                    padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '14px', transform: liked ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.2s' }}>{liked ? '❤️' : '🤍'}</span>
                                <span className="font-num" style={{ fontSize: '14px', color: liked ? '#fa5151' : 'inherit' }}>{item.likes + (liked ? 1 : 0)}</span>
                            </div>
                        </div>

                        {/* Author */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                            <Avatar fallbackText={item.author} size={36} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.author}</div>
                                <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(item.createTime).toLocaleDateString()}</div>
                            </div>
                            <button style={{ padding: '6px 14px', borderRadius: '18px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', background: 'transparent', fontSize: '12px', fontWeight: 600 }}>关注</button>
                        </div>

                        {/* Prompt Section */}
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Prompt</div>
                            <div 
                                onClick={handleCopyPrompt}
                                style={{ 
                                    fontSize: '14px', lineHeight: '1.6', opacity: 0.9, 
                                    background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '8px',
                                    border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer',
                                    position: 'relative'
                                }}
                            >
                                {item.prompt}
                                <div style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.5 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '6px 12px', background: 'rgba(255, 255, 255, 0.1)', fontSize: '12px', borderRadius: '8px', fontWeight: 500, textTransform: 'uppercase' }}>
                                {item.type}
                            </span>
                            {item.style && <span style={{ padding: '6px 12px', background: 'rgba(41, 121, 255, 0.1)', color: 'var(--primary-color)', fontSize: '12px', borderRadius: '8px', fontWeight: 500 }}>#{item.style}</span>}
                            {item.ratio && <span style={{ padding: '6px 12px', background: 'rgba(128,128,128,0.1)', fontSize: '12px', borderRadius: '8px' }}>{item.ratio}</span>}
                        </div>
                    </div>
                </div>

                {/* 3. Related Works */}
                {related.length > 0 && (
                    <div style={{ padding: '24px 12px 0 12px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', paddingLeft: '4px' }}>更多相似灵感</div>
                        <div style={{ columnCount: 2, columnGap: '8px' }}>
                            {related.map(rel => (
                                <div key={rel.id} style={{ marginBottom: '8px', breakInside: 'avoid' }}>
                                    <CreationCard item={rel} onClick={() => navigate('/creation/detail', { id: rel.id })} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="glass-panel" style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                padding: '12px 20px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                borderTop: '0.5px solid rgba(255,255,255,0.1)',
                display: 'flex', gap: '16px', zIndex: 100,
                background: 'rgba(var(--navbar-bg-rgb), 0.9)'
            }}>
                <div style={{ flex: 1, display: 'flex', gap: '24px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span className="font-num">{item.likes}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>下载</span>
                    </div>
                </div>
                <button 
                    onClick={handleRemix}
                    style={{ 
                        flex: 1.5, background: 'var(--primary-gradient)', border: 'none', 
                        borderRadius: '24px', color: 'white', fontSize: '15px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)', cursor: 'pointer'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    做同款
                </button>
            </div>

            {/* Panels mounted here to support quick creation */}
            <ImageCreationPanel visible={showRemixPanel && item.type === 'image'} onClose={() => setShowRemixPanel(false)} initialData={item} />
            <VideoCreationPanel visible={showRemixPanel && item.type === 'video'} onClose={() => setShowRemixPanel(false)} />
            <MusicCreationPanel visible={showRemixPanel && item.type === 'music'} onClose={() => setShowRemixPanel(false)} />
        </div>
    );
};
