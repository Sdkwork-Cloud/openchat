
import React, { useState, useRef } from 'react';
import { navigate, navigateBack } from '../../../router';
import { ProductService, Product, ProductCategory } from '../services/ProductService';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { CartService } from '../services/CartService';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { Platform } from '../../../platform';
import { SmartImage } from '../../../components/SmartImage/SmartImage';
import { InfiniteListView } from '../../../components/InfiniteListView/InfiniteListView';
import { Swiper } from '../../../components/Swiper/Swiper'; 
import { useLiveQuery } from '../../../core/hooks';
import { useTranslation } from '../../../core/i18n/I18nContext';

// --- Components ---
interface FlyingBall {
    id: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    image: string;
}

const ProductCard: React.FC<{ product: Product, onAdd: (rect: DOMRect, img: string) => void }> = ({ product, onAdd }) => {
    const imgRef = useRef<HTMLDivElement>(null); 

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (imgRef.current) {
            const rect = imgRef.current.getBoundingClientRect();
            onAdd(rect, product.cover);
        }
    };

    return (
        <div 
            onClick={() => navigate('/commerce/item', { id: product.id })}
            style={{ 
                background: 'var(--bg-card)', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
        >
            <div ref={imgRef} style={{ aspectRatio: '1/1', position: 'relative' }}>
                <SmartImage src={product.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />
            </div>
            <div style={{ padding: '10px' }}>
                <div style={{ 
                    fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', 
                    lineHeight: 1.4, marginBottom: '6px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                }}>
                    {product.title}
                </div>
                
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {product.tags.slice(0, 2).map(tag => (
                        <span key={tag} style={{ fontSize: '10px', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.3)', padding: '1px 3px', borderRadius: '4px' }}>
                            {tag}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#fa5151', fontWeight: 700, fontSize: '16px', fontFamily: 'DIN Alternate' }}>
                        <span style={{ fontSize: '11px' }}>¥</span>{product.price}
                    </div>
                    <div 
                        onClick={handleAdd}
                        style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            background: 'var(--bg-cell-active)', color: 'var(--primary-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CategoryItem: React.FC<{ icon: string, label: string, onClick: () => void, isActive: boolean }> = ({ icon, label, onClick, isActive }) => (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: isActive ? 1 : 0.7, transform: isActive ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: isActive ? 'var(--primary-color)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: isActive ? '0 4px 12px rgba(41, 121, 255, 0.3)' : 'none', color: isActive ? 'white' : 'inherit' }}>
            {icon}
        </div>
        <span style={{ fontSize: '12px', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400 }}>{label}</span>
    </div>
);

// Generic Banner Content using Swiper
const BannerCarousel = () => {
    const banners = [
        { id: 1, bg: 'linear-gradient(135deg, #2979FF 0%, #00d2ff 100%)', title: 'OpenChat 自营商城', sub: '官方正品 · 极速发货' },
        { id: 2, bg: 'linear-gradient(135deg, #FF9C6E 0%, #fa5151 100%)', title: '限时秒杀专区', sub: '低至5折 · 手慢无' },
        { id: 3, bg: 'linear-gradient(135deg, #7928CA 0%, #FF0080 100%)', title: '数码极客节', sub: '领券满减 · 12期免息' },
    ];

    return (
        <Swiper height="160px" style={{ marginBottom: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {banners.map(b => (
                <div key={b.id} style={{ width: '100%', height: '100%', background: b.bg, display: 'flex', alignItems: 'center', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: -20, bottom: -20, fontSize: '120px', opacity: 0.1 }}>🛍️</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>{b.title}</div>
                        <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '12px' }}>{b.sub}</div>
                        <div style={{ background: 'white', color: 'black', padding: '6px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: 600, display: 'inline-block' }}>
                            Go ›
                        </div>
                    </div>
                </div>
            ))}
        </Swiper>
    );
};

export const MallPage: React.FC = () => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
    
    // Animation State
    const [balls, setBalls] = useState<FlyingBall[]>([]);
    const [cartBump, setCartBump] = useState(false);
    const cartIconRef = useRef<HTMLDivElement>(null);

    // Live Data
    const { data: productPage, loading: productsLoading, refresh } = useLiveQuery(
        ProductService,
        () => ProductService.getFeed(activeCategory),
        { deps: [activeCategory] }
    );
    const products = productPage?.content || [];

    const { data: cartCount = 0 } = useLiveQuery(
        CartService,
        () => CartService.getCartCount().then(c => ({ success: true, data: c })),
        { deps: [] }
    );

    const handleAddToCart = async (startRect: DOMRect, image: string, product: Product) => {
        Platform.device.vibrate(5);
        await CartService.addToCart(product);
        
        if (cartIconRef.current) {
            const endRect = cartIconRef.current.getBoundingClientRect();
            const ball: FlyingBall = {
                id: Date.now(),
                startX: startRect.left + startRect.width / 2 - 15, 
                startY: startRect.top + startRect.height / 2 - 15,
                endX: endRect.left + endRect.width / 2 - 15,
                endY: endRect.top + endRect.height / 2 - 15,
                image: image
            };
            setBalls(prev => [...prev, ball]);

            setTimeout(() => {
                setBalls(prev => prev.filter(b => b.id !== ball.id));
                setCartBump(true);
                setTimeout(() => setCartBump(false), 300);
                Platform.device.vibrate(10);
            }, 600);
        }
    };

    const filtered = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

    const categories: { id: ProductCategory | 'all', label: string, icon: string }[] = [
        { id: 'all', label: '全部', icon: '🛍️' },
        { id: 'tech', label: '数码', icon: '📱' },
        { id: 'clothing', label: '服饰', icon: '👕' },
        { id: 'home', label: '家居', icon: '🛋️' },
        { id: 'beauty', label: '美妆', icon: '💄' },
        { id: 'food', label: '食品', icon: '🍔' },
    ];

    const Header = (
        <div style={{ paddingBottom: '12px' }}>
            <BannerCarousel />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', padding: '0 8px' }}>
                {categories.map(cat => (
                    <CategoryItem 
                        key={cat.id} 
                        icon={cat.icon} 
                        label={cat.label} 
                        isActive={activeCategory === cat.id}
                        onClick={() => setActiveCategory(cat.id)} 
                    />
                ))}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '0px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔥</span>
                <span>{activeCategory === 'all' ? t('commerce.guess_like') : categories.find(c => c.id === activeCategory)?.label}</span>
            </div>
        </div>
    );

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            
            {balls.map(ball => (
                <div 
                    key={ball.id} 
                    className="fly-ball"
                    style={{ 
                        width: '30px', height: '30px',
                        '--start-x': `${ball.startX}px`,
                        '--start-y': `${ball.startY}px`,
                        '--end-x': `${ball.endX}px`,
                        '--end-y': `${ball.endY}px`,
                    } as React.CSSProperties}
                >
                    <div className="fly-ball-inner" style={{ backgroundImage: `url(${ball.image})` }} />
                </div>
            ))}

            <div style={{ 
                padding: '8px 12px', background: 'var(--navbar-bg)', 
                display: 'flex', alignItems: 'center', gap: '12px',
                paddingTop: 'calc(8px + env(safe-area-inset-top))',
                borderBottom: '0.5px solid var(--border-color)',
                zIndex: 100
            }}>
                <div onClick={() => navigateBack('/discover')} style={{ padding: '4px', cursor: 'pointer' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </div>
                
                {/* Category Menu Entry */}
                <div onClick={() => navigate('/commerce/category')} style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </div>

                <div style={{ flex: 1 }}>
                    <SearchInput value={search} onChange={setSearch} placeholder={t('commerce.search_placeholder')} style={{ padding: 0, borderBottom: 'none', background: 'transparent' }} />
                </div>
                <div 
                    ref={cartIconRef}
                    onClick={() => navigate('/commerce/cart')} 
                    className={cartBump ? 'cart-bump' : ''}
                    style={{ position: 'relative', padding: '4px', cursor: 'pointer' }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    {cartCount > 0 && (
                        <div style={{ position: 'absolute', top: -2, right: -4, background: '#fa5151', color: 'white', fontSize: '10px', height: '16px', minWidth: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                            {cartCount > 99 ? '99+' : cartCount}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                <InfiniteListView
                    data={filtered}
                    loading={productsLoading}
                    hasMore={false} // Demo data is static
                    onRefresh={refresh}
                    header={Header}
                    cols={2}
                    gap={8}
                    padding="8px"
                    restorationKey="mall_feed"
                    renderItem={(p: Product) => <ProductCard product={p} onAdd={(rect) => handleAddToCart(rect, p.cover, p)} />}
                    renderSkeleton={() => <Skeleton width="100%" style={{ aspectRatio: '1/1', borderRadius: '12px' }} variant="rect" />}
                    emptyText="暂无相关商品"
                />
            </div>
        </div>
    );
};
