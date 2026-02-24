
import React, { useState, useRef } from 'react';
import { CreationItem } from '../services/CreationService';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { SmartImage } from '../../../components/SmartImage/SmartImage';
import { Platform } from '../../../platform';

interface CreationCardProps {
    item: CreationItem;
    onClick: () => void;
    // Selection Props
    selectable?: boolean;
    selected?: boolean;
    onToggle?: () => void;
}

export const CreationCard: React.FC<CreationCardProps> = ({ 
    item, 
    onClick, 
    selectable = false, 
    selected = false, 
    onToggle 
}) => {
    const [likes, setLikes] = useState(item.likes);
    const [isLiked, setIsLiked] = useState(false); // Local state for immediate feedback
    const [showHeart, setShowHeart] = useState(false);
    
    const lastTap = useRef(0);

    const getFallbackBackground = () => {
        switch(item.type) {
            case 'video': return 'linear-gradient(135deg, #2b0aff, #fa5151)'; 
            case 'music': return 'linear-gradient(135deg, #1f1c2c, #928dab)'; 
            case 'text': return 'linear-gradient(135deg, #fff1eb, #ace0f9)'; 
            default: return 'var(--bg-cell-active)';
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (selectable && onToggle) {
            e.stopPropagation();
            onToggle();
            return;
        }

        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            // Double Tap Detected
            e.stopPropagation();
            handleLike();
        } else {
            // Single Tap (Wait briefly to see if it's double? No, instant navigation is better for this app)
            // We fire navigation immediately. Double tap might trigger nav too, but showing the heart overlay is the priority effect.
            onClick();
        }
        lastTap.current = now;
    };

    const handleLike = () => {
        if (!isLiked) {
            setIsLiked(true);
            setLikes(l => l + 1);
            Platform.device.vibrate(10);
        }
        // Always show animation on double tap even if already liked
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
    };

    return (
        <div 
            onClick={handleClick} 
            style={{ 
                breakInside: 'avoid', 
                marginBottom: '4px',
                cursor: 'pointer',
                background: 'var(--bg-card)', 
                borderRadius: '8px', 
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'transform 0.1s',
                transform: selected ? 'scale(0.96)' : 'scale(1)'
            }}
        >
            <div style={{ position: 'relative' }}>
                {item.url && item.type === 'image' ? (
                    <SmartImage 
                        src={item.url} 
                        style={{ width: '100%', display: 'block', minHeight: '120px', filter: selected ? 'brightness(0.8)' : 'none' }} 
                        preview={false}
                    />
                ) : (
                    <div style={{ 
                        width: '100%', 
                        aspectRatio: item.ratio === '16:9' ? '16/9' : '1/1', 
                        background: getFallbackBackground(), 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '32px', color: 'white',
                        position: 'relative',
                        filter: selected ? 'brightness(0.8)' : 'none'
                    }}>
                        {item.type === 'video' ? '🎬' : (item.type === 'music' ? '🎵' : '📝')}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />
                    </div>
                )}
                
                {/* Pop Heart Animation */}
                {showHeart && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                        zIndex: 20, pointerEvents: 'none'
                    }}>
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="#fa5151" stroke="none" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </div>
                )}

                {/* Type Badge */}
                {!selectable && item.type !== 'image' && (
                    <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', borderRadius: '4px', padding: '2px 6px', border: '0.5px solid rgba(255,255,255,0.2)' }}>
                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 600 }}>{item.type.toUpperCase()}</span>
                    </div>
                )}

                {/* Selection Overlay */}
                {selectable && (
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                        <Checkbox checked={selected} />
                    </div>
                )}
            </div>
            
            {/* Minimal Info */}
            <div style={{ padding: '10px 8px' }}>
                <div style={{ 
                    fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', 
                    lineHeight: '1.4', 
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    marginBottom: '8px'
                }}>
                    {item.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-cell-active)', overflow: 'hidden' }}>
                            <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.author}`} style={{ width: '100%', height: '100%' }} />
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.author}</span>
                    </div>
                    <div 
                        onClick={(e) => { e.stopPropagation(); handleLike(); }}
                        style={{ fontSize: '10px', color: isLiked ? '#fa5151' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px', transition: 'color 0.2s' }}
                    >
                        <span>{isLiked ? '❤️' : '🤍'}</span> 
                        <span className="font-num">{likes > 999 ? (likes/1000).toFixed(1)+'k' : likes}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
