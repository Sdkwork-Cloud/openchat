
import React, { useRef, useEffect } from 'react';
import { ProductData, ProductItemCard } from './ProductItemCard';
import { Platform } from '../../../../platform';
import { navigate } from '../../../../router';
import { CartService } from '../../../commerce/services/CartService';
import { Toast } from '../../../../components/Toast';
import { Product } from '../../../commerce/services/ProductService';

interface ProductSwiperProps {
    items: ProductData[];
    onInteract?: (action: string, payload: any) => void;
}

export const ProductSwiper: React.FC<ProductSwiperProps> = ({ items, onInteract }) => {
    
    const handleDetail = (item: ProductData) => {
        // Use sessionStorage to pass data since we are using hash routing
        const key = `temp_product_${item.id}`;
        sessionStorage.setItem(key, JSON.stringify(item));
        navigate('/commerce/product', { id: item.id });
    };

    const handleBuy = async (item: ProductData) => {
        Platform.device.vibrate(10);
        
        // Map ProductData (Chat) to Product (Commerce)
        const productForCart: any = {
            id: item.id,
            title: item.name,
            price: item.price,
            cover: item.image,
            shopName: item.shopName || 'OpenChat 自营',
            subTitle: item.desc || '',
            // Minimum required fields for type satisfaction
            images: [item.image],
            tags: item.tags || [],
            category: 'tech',
            sales: 0,
            rating: item.rating || 5
        };

        await CartService.addToCart(productForCart as Product);
        Toast.success('已加入购物车');
    };

    const isSingle = items.length === 1;
    
    // Config
    const CARD_WIDTH_MULTI = '240px'; 
    const CARD_GAP = 12;    

    const containerStyle: React.CSSProperties = {
        width: '100%', 
        position: 'relative',
        marginTop: '0px',
        marginBottom: '0px',
        touchAction: 'pan-x'
    };

    // --- Mouse Drag Scroll Logic (Enhanced) ---
    const scrollRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        // Only trigger for left click
        if (e.button !== 0) return;

        isDragging.current = true;
        scrollRef.current.style.cursor = 'grabbing';
        
        // Store initial position
        startX.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft.current = scrollRef.current.scrollLeft;

        // Attach global listeners to handle dragging outside the component
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleGlobalMouseUp = () => {
        isDragging.current = false;
        if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
        
        // Clean up global listeners
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !scrollRef.current) return;
        e.preventDefault();
        
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 2; // Scroll speed multiplier (2x for faster feel)
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, []);

    return (
        <div style={containerStyle}>
            <div 
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                style={{ 
                    display: 'flex', 
                    gap: `${CARD_GAP}px`, 
                    overflowX: 'auto', 
                    overflowY: 'hidden',
                    
                    // Physics
                    scrollSnapType: (isSingle || isDragging.current) ? 'none' : 'x mandatory', 
                    // Padding adjustment: Left 0 to align flush with text
                    paddingLeft: '0px', 
                    paddingRight: '16px',
                    paddingBottom: '20px', 
                    paddingTop: '4px',
                    
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none', 
                    WebkitOverflowScrolling: 'touch',
                    
                    alignItems: 'stretch',
                    cursor: 'grab', // Default cursor
                    userSelect: 'none' // Prevent text selection during drag
                }}
            >
                {items.map((item, idx) => (
                    <ProductItemCard 
                        key={item.id || idx} 
                        item={item} 
                        onClick={handleDetail} 
                        onBuy={handleBuy} 
                        width={isSingle ? '100%' : CARD_WIDTH_MULTI}
                        isHero={isSingle}
                        rank={idx} // Pass index for "Top Pick" logic
                    />
                ))}
                
                {/* Spacer for right-side padding in scroll view */}
                {!isSingle && <div style={{ width: '4px', flexShrink: 0 }} />}
            </div>
            
            <style>{`
                div::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};
