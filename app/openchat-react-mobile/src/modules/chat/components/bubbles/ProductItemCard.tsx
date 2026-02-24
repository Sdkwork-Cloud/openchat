
import React, { useRef } from 'react';
import { SmartImage } from '../../../../components/SmartImage/SmartImage';

export interface ProductData {
    id: string;
    name: string; 
    price: number;
    originalPrice?: number;
    image: string;
    reason?: string; 
    tags?: string[]; 
    shopName?: string; 
    shopLogo?: string;
    rating?: number; 
    platform?: string; 
    link?: string;
    desc?: string;
}

interface ProductItemCardProps {
    item: ProductData;
    onClick: (item: ProductData) => void;
    onBuy: (item: ProductData) => void;
    width: number | string;
    isHero?: boolean;
    rank?: number; // 0 = Best Match
}

export const ProductItemCard: React.FC<ProductItemCardProps> = ({ item, onClick, onBuy, width, isHero = false, rank }) => {
    // Touch tracking refs
    const startPos = useRef({ x: 0, y: 0 });
    const isDrag = useRef(false);

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        startPos.current = { x: clientX, y: clientY };
        isDrag.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const dx = Math.abs(clientX - startPos.current.x);
        const dy = Math.abs(clientY - startPos.current.y);
        
        // If moved more than 10px, consider it a scroll/drag operation
        if (dx > 10 || dy > 10) {
            isDrag.current = true;
        }
    };

    const handleTouchEnd = () => {
        // Interaction logic moved to onClick but gated by isDrag
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!isDrag.current) {
            onClick(item);
        }
    };
    
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(price);
    };

    const isTopPick = rank === 0;

    return (
        <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            className="product-card-hover"
            draggable={false} // Prevent native drag
            style={{ 
                width: width, 
                minWidth: typeof width === 'string' ? width : undefined,
                flexShrink: 0,
                background: 'var(--bg-card)', // Inner card background
                borderRadius: '12px', 
                overflow: 'hidden', 
                // Border logic: Top pick gets color border, others subtle
                border: isTopPick ? '1.5px solid rgba(41, 121, 255, 0.15)' : '1px solid var(--border-color)',
                // Shadow: Top pick gets subtle glow
                boxShadow: isTopPick ? '0 4px 12px rgba(41, 121, 255, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                scrollSnapAlign: 'start', 
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                marginTop: '2px', // Space for shadow
                marginBottom: '4px',
                userSelect: 'none'
            }}
        >
            {/* Top Pick Badge */}
            {isTopPick && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, zIndex: 10,
                    background: 'linear-gradient(90deg, #2979FF, #4B9FFF)',
                    color: 'white', fontSize: '10px', fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px 0 8px 0',
                    boxShadow: '1px 1px 4px rgba(0,0,0,0.2)'
                }}>
                    AI 首选
                </div>
            )}

            {/* 1. Image Area with SmartImage */}
            <div style={{ 
                position: 'relative', 
                width: '100%', 
                aspectRatio: '4/3', 
                backgroundColor: 'var(--bg-cell-active)',
                overflow: 'hidden'
            }}>
                <SmartImage 
                    src={item.image} 
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    preview={false} // Click handled by card
                />
            </div>

            {/* 2. Content Area */}
            <div style={{ padding: '10px 12px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {/* Title */}
                <div style={{ 
                    fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', 
                    lineHeight: '1.4', marginBottom: '6px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    height: '40px' 
                }}>
                    {item.name}
                </div>

                {/* AI Reason (Compact) */}
                {item.reason && (
                    <div style={{ 
                        marginBottom: '8px', 
                        display: 'flex', gap: '6px', alignItems: 'flex-start'
                    }}>
                        <span style={{ fontSize: '12px', marginTop: '1px' }}>💡</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.reason}
                        </span>
                    </div>
                )}

                <div style={{ flex: 1 }} /> 

                {/* Tags & Price Row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '17px', fontWeight: 700, color: '#fa5151', fontFamily: 'DIN Alternate, sans-serif' }}>
                                {formatPrice(item.price)}
                            </span>
                            {item.originalPrice && (
                                <span style={{ fontSize: '10px', color: 'var(--text-placeholder)', textDecoration: 'line-through' }}>
                                    {formatPrice(item.originalPrice)}
                                </span>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onBuy(item); }}
                        style={{ 
                            background: 'var(--bg-cell-active)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', padding: 0
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><path d="M12 9V15"/><path d="M9 12H15"/></svg>
                    </button>
                </div>
            </div>
            
            <style>{`
                .product-card-hover:active { transform: scale(0.98); }
            `}</style>
        </div>
    );
};
