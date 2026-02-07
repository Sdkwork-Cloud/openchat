
import React, { memo, useEffect, useState } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { ImageViewer } from '../../../components/ImageViewer/ImageViewer';
import { navigate } from '../../../router';
import { MomentsService, Moment } from '../services/MomentsService';
import { Toast } from '../../../components/Toast';

// --- Sub-Component for Performance ---
const MomentItem = memo(({ item, onImageClick, onLike }: { item: Moment, onImageClick: (url: string) => void, onLike: (id: string) => void }) => {
    return (
        <div style={{ padding: '0 16px 24px 16px', borderBottom: '0.5px solid var(--border-color)', display: 'flex', gap: '12px', marginBottom: '20px' }}> 
            <div 
                onClick={(e) => { e.stopPropagation(); navigate('/contact/profile', { name: item.author }); }}
                style={{ 
                    width: '44px', height: '44px', borderRadius: '8px', background: '#e0e0e0', flexShrink: 0, 
                    backgroundImage: `url(https://api.dicebear.com/7.x/identicon/svg?seed=${item.avatar})`, 
                    backgroundSize: 'cover', cursor: 'pointer' 
                }}
            />
            <div style={{ flex: 1 }}> 
                <div style={{ color: '#576b95', fontWeight: 600, fontSize: '17px', marginBottom: '6px' }}>{item.author}</div> 
                <div style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}> 
                    {item.content}
                </div> 
                
                {item.images && item.images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: item.images.length === 1 ? '1fr' : 'repeat(3, 1fr)', gap: '6px', maxWidth: item.images.length === 1 ? '200px' : '300px', marginBottom: '12px' }}> 
                        {item.images.map((img: string, idx: number) => ( 
                            <div 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); onImageClick(img); }}
                                style={{ 
                                    aspectRatio: '1/1', background: '#f0f0f0', borderRadius: '4px', 
                                    backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', 
                                    cursor: 'zoom-in' 
                                }}
                            /> 
                        ))} 
                    </div> 
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}> 
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span>{item.displayTime}</span>
                        {item.hasLiked && <span style={{ color: '#576b95' }}>❤️ {item.likes}</span>}
                    </div>
                    <div 
                        onClick={() => onLike(item.id)}
                        style={{ background: 'var(--bg-cell-active)', padding: '2px 10px', borderRadius: '4px', fontWeight: 'bold', color: '#576b95', cursor: 'pointer' }}
                    >
                        ••
                    </div> 
                </div> 
                
                {/* Comments Section */}
                {item.comments && item.comments.length > 0 && (
                    <div style={{ marginTop: '10px', background: 'var(--bg-cell-top)', padding: '6px 8px', borderRadius: '4px' }}>
                        {item.comments.map((c, i) => (
                            <div key={i} style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '2px' }}>
                                <span style={{ color: '#576b95', fontWeight: 500 }}>{c.user}</span>: <span style={{ color: 'var(--text-primary)' }}>{c.text}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div> 
        </div> 
    );
});

export const MomentsPage: React.FC = () => {
    const [feed, setFeed] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const res = await MomentsService.getFeed();
            if (res.success && res.data) {
                setFeed(res.data.content);
            }
            setLoading(false);
        };
        load();
    }, []);
    
    const handleImageClick = (url: string) => {
        ImageViewer.show(url);
    };

    const handleLike = async (id: string) => {
        if (navigator.vibrate) navigator.vibrate(10);
        await MomentsService.likeMoment(id);
        // Optimistic UI Update or Refetch
        setFeed(prev => prev.map(m => m.id === id ? { ...m, hasLiked: !m.hasLiked, likes: m.hasLiked ? m.likes - 1 : m.likes + 1 } : m));
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
             <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
                <Navbar title="" variant="transparent" rightElement={<div style={{padding: '8px', cursor: 'pointer'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>} />
             </div>
             
             <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}> 
                 {/* Parallax Header */}
                <div style={{ position: 'relative', height: '320px', marginBottom: '60px' }}> 
                    <div style={{ width: '100%', height: '100%', background: 'url(https://picsum.photos/800/800?grayscale) center/cover', transform: 'translateZ(0)' }}></div> 
                    <div style={{ position: 'absolute', bottom: '-40px', right: '16px', display: 'flex', alignItems: 'flex-end', gap: '16px' }}> 
                        <div style={{ color: 'white', fontWeight: 600, paddingBottom: '50px', textShadow: '0 1px 4px rgba(0,0,0,0.8)', fontSize: '20px' }}>AI User</div> 
                        <div 
                            onClick={() => navigate('/profile/self')}
                            style={{ width: '84px', height: '84px', borderRadius: '12px', backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Felix)', backgroundSize: 'cover', border: '3px solid var(--bg-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                        ></div> 
                    </div> 
                </div> 
                
                {/* Feed Items */}
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>加载中...</div>
                ) : (
                    feed.map(item => ( 
                        <MomentItem key={item.id} item={item} onImageClick={handleImageClick} onLike={handleLike} />
                    ))
                )}
            </div> 
        </div>
    );
};
