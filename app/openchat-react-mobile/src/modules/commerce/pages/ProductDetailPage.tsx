
import React, { useEffect, useState } from 'react';
import { navigateBack, navigate, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { ProductData } from '../../chat/components/bubbles/ProductItemCard';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';
import { CartService } from '../services/CartService';
import { Product, ProductService } from '../services/ProductService';
import { Avatar } from '../../../components/Avatar';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { SmartImage } from '../../../components/SmartImage/SmartImage';
import { Rate } from '../../../components/Rate/Rate';
import { StateView } from '../../../components/StateView/StateView';

export const ProductDetailPage: React.FC = () => {
    const query = useQueryParams();
    const id = query.get('id');
    const [product, setProduct] = useState<ProductData | null>(null);
    const [cartCount, setCartCount] = useState(0);
    const [showSkuSheet, setShowSkuSheet] = useState(false);
    const [buyMode, setBuyMode] = useState<'cart' | 'buy'>('cart');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (id) {
                // Try cache first for instant load
                const cached = sessionStorage.getItem(`temp_product_${id}`);
                if (cached) {
                    setProduct(JSON.parse(cached));
                    setLoading(false);
                } else {
                    setLoading(true);
                    // Fetch full data
                    const res = await ProductService.getProductById(id);
                    if (res.data) {
                        const p = res.data;
                        setProduct({
                            id: p.id,
                            name: p.title,
                            price: p.price,
                            originalPrice: p.originalPrice,
                            image: p.cover,
                            shopName: p.shopName,
                            shopLogo: p.shopAvatar,
                            desc: p.subTitle,
                            tags: p.tags,
                            rating: p.rating,
                            images: p.images
                        } as any);
                    }
                    setLoading(false);
                }
            }
            updateCartCount();
        };
        load();
    }, [id]);

    const updateCartCount = async () => {
        const count = await CartService.getCartCount();
        setCartCount(count);
    };

    const handleAction = (mode: 'cart' | 'buy') => {
        setBuyMode(mode);
        setShowSkuSheet(true);
    };

    const confirmSku = async () => {
        if (!product) return;
        
        // Map ProductData (Chat) to Product (Commerce)
        const productForCart: any = {
            id: product.id,
            title: product.name,
            price: product.price,
            cover: product.image,
            shopName: product.shopName || 'OpenChat 自营',
            subTitle: product.desc || '',
            images: [product.image],
            tags: product.tags || [],
            category: 'tech',
            sales: 0,
            rating: product.rating || 5
        };

        await CartService.addToCart(productForCart, 1, '默认规格');
        
        if (buyMode === 'cart') {
            Toast.success('已加入购物车');
            setShowSkuSheet(false);
            updateCartCount();
        } else {
            setShowSkuSheet(false);
            navigate('/commerce/cart'); 
        }
        Platform.device.vibrate(10);
    };

    if (loading) {
        return (
            <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
                <Navbar title="商品详情" variant="transparent" onBack={() => navigateBack('/')} />
                <StateView status="loading" renderLoading={() => (
                    <div style={{ flex: 1, marginTop: '-44px' }}>
                        <Skeleton width="100%" style={{ aspectRatio: '1/1' }} variant="rect" />
                        <div style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: '12px' }}>
                            <Skeleton width={120} height={32} style={{ marginBottom: '12px' }} />
                            <Skeleton width="90%" height={24} style={{ marginBottom: '8px' }} />
                            <Skeleton width="60%" height={16} />
                        </div>
                    </div>
                )}>
                    <div />
                </StateView>
            </div>
        );
    }

    if (!product) {
        return (
             <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
                <Navbar title="商品详情" onBack={() => navigateBack('/')} />
                <StateView status="error" errorText="商品不存在或已下架">
                    <div />
                </StateView>
            </div>
        );
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(price);
    };

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Navbar title="商品详情" variant="transparent" onBack={() => navigateBack('/')} rightElement={<div style={{padding:'0 12px'}}>···</div>} />
            
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px', marginTop: '-44px' }}>
                {/* Hero Image */}
                <div style={{ width: '100%', aspectRatio: '1/1', background: '#fff', position: 'relative' }}>
                    <SmartImage src={product.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} preview />
                </div>

                {/* Main Info Card */}
                <div style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#fa5151', fontFamily: 'DIN Alternate' }}>
                            {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && (
                            <span style={{ fontSize: '14px', color: 'var(--text-placeholder)', textDecoration: 'line-through' }}>
                                {formatPrice(product.originalPrice)}
                            </span>
                        )}
                        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            月销 999+
                        </div>
                    </div>
                    
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '8px' }}>
                        {product.name}
                    </div>

                    {product.desc && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {product.desc}
                        </div>
                    )}

                    {product.tags && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            {product.tags.map(tag => (
                                <span key={tag} style={{ 
                                    fontSize: '11px', color: '#ff6b00', 
                                    background: 'rgba(255, 107, 0, 0.08)',
                                    padding: '2px 6px', borderRadius: '4px' 
                                }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Recommendation Reason */}
                {product.reason && (
                    <div style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: '12px', display: 'flex', gap: '12px' }}>
                        <div style={{ fontSize: '20px' }}>💡</div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>AI 推荐理由</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {product.reason}
                            </div>
                        </div>
                    </div>
                )}

                {/* Specs */}
                <div onClick={() => handleAction('cart')} style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>选择</span>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>规格 / 颜色 / 数量</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>›</div>
                </div>

                {/* Shop Info */}
                <div style={{ padding: '16px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar src={product.shopLogo} size={48} shape="square" fallbackText="Shop" />
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 600 }}>{product.shopName || '官方旗舰店'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <Rate value={product.rating || 4.9} size={10} readonly color="#fa5151" allowHalf />
                                <span style={{ fontSize: '11px', color: '#fa5151' }}>{product.rating || 4.9}</span>
                            </div>
                        </div>
                    </div>
                    <button style={{ padding: '6px 14px', borderRadius: '16px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', background: 'transparent', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>进店</button>
                </div>

                {/* Detail Images Mock */}
                {(product as any).images && (
                    <div style={{ padding: '16px', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>—— 商品详情 ——</div>
                        {(product as any).images.map((img: string, i: number) => (
                            <SmartImage key={i} src={img} style={{ width: '100%', display: 'block', marginBottom: '8px' }} />
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)',
                padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
                display: 'flex', alignItems: 'center', gap: '16px', zIndex: 100
            }}>
                <div style={{ display: 'flex', gap: '20px', paddingLeft: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        客服
                    </div>
                    <div 
                        onClick={() => navigate('/commerce/cart')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontSize: '10px', color: 'var(--text-secondary)', position: 'relative', cursor: 'pointer' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        购物车
                        {cartCount > 0 && <div style={{ position: 'absolute', top: -4, right: -4, background: '#fa5151', color: 'white', fontSize: '10px', borderRadius: '50%', minWidth: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</div>}
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', borderRadius: '24px', overflow: 'hidden', height: '40px' }}>
                    <button 
                        onClick={() => handleAction('cart')}
                        style={{ flex: 1, border: 'none', background: 'linear-gradient(90deg, #ffd01e, #ff8917)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        加入购物车
                    </button>
                    <button 
                        onClick={() => handleAction('buy')}
                        style={{ flex: 1, border: 'none', background: 'linear-gradient(90deg, #ff6034, #ee0a24)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        立即购买
                    </button>
                </div>
            </div>

            <ActionSheet visible={showSkuSheet} onClose={() => setShowSkuSheet(false)}>
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#f5f5f5' }}>
                            <SmartImage src={product.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                            <div style={{ color: '#fa5151', fontSize: '20px', fontWeight: 600 }}>¥{product.price}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>已选: 默认规格</div>
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>规格</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <span style={{ padding: '6px 16px', borderRadius: '16px', background: 'rgba(255, 107, 0, 0.1)', color: '#ff6b00', border: '1px solid #ff6b00', fontSize: '13px' }}>默认规格</span>
                        </div>
                    </div>

                    <button 
                        onClick={confirmSku}
                        style={{ width: '100%', padding: '12px', borderRadius: '24px', border: 'none', background: 'var(--primary-gradient)', color: 'white', fontSize: '16px', fontWeight: 600 }}
                    >
                        确定
                    </button>
                </div>
            </ActionSheet>
        </div>
    );
};
