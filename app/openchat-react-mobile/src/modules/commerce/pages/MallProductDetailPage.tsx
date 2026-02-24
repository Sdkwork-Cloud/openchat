
import React, { useEffect, useState } from 'react';
import { navigate, navigateBack, useQueryParams } from '../../../router';
import { ProductService, Product } from '../services/ProductService';
import { CartService } from '../services/CartService';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';
import { Avatar } from '../../../components/Avatar';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';

export const MallProductDetailPage: React.FC = () => {
    const query = useQueryParams();
    const id = query.get('id');
    const [product, setProduct] = useState<Product | null>(null);
    const [cartCount, setCartCount] = useState(0);
    const [showSkuSheet, setShowSkuSheet] = useState(false);
    const [buyMode, setBuyMode] = useState<'cart' | 'buy'>('cart');

    useEffect(() => {
        if (id) {
            ProductService.getProductById(id).then(res => {
                if (res.data) setProduct(res.data);
            });
        }
        updateCartCount();
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
        
        // Mock SKU: Default
        await CartService.addToCart(product, 1, '默认规格');
        
        if (buyMode === 'cart') {
            Toast.success('已加入购物车');
            setShowSkuSheet(false);
            updateCartCount();
        } else {
            setShowSkuSheet(false);
            // Navigate to checkout immediately (select just added item logic omitted for simplicity, goes to full cart checkout flow or separate direct buy logic)
            // For now, redirect to cart to checkout
            navigate('/commerce/cart'); 
        }
        Platform.device.vibrate(10);
    };

    if (!product) return <div style={{height: '100%', background: 'var(--bg-body)'}} />;

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="商品详情" variant="transparent" onBack={() => navigateBack('/commerce/mall')} />
            
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px', marginTop: '-44px' }}>
                {/* Image */}
                <div style={{ width: '100%', aspectRatio: '1/1', background: '#fff' }}>
                    <img src={product.cover} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                {/* Price & Title */}
                <div style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ color: '#fa5151', fontWeight: 700, fontSize: '24px', fontFamily: 'DIN Alternate' }}>
                            <span style={{ fontSize: '14px' }}>¥</span>{product.price}
                        </div>
                        {product.originalPrice && (
                            <div style={{ textDecoration: 'line-through', color: 'var(--text-placeholder)', fontSize: '13px' }}>
                                ¥{product.originalPrice}
                            </div>
                        )}
                        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            月销 {product.sales}+
                        </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '8px' }}>
                        {product.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {product.subTitle}
                    </div>
                </div>

                {/* Specs */}
                <div onClick={() => handleAction('cart')} style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>选择</span>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>规格 / 颜色 / 数量</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>›</div>
                </div>

                {/* Shop */}
                <div style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar src={product.shopAvatar} size={48} shape="square" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>{product.shopName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>官方认证 · 综合评分 {product.rating}</div>
                    </div>
                    <button style={{ padding: '6px 14px', borderRadius: '16px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', background: 'transparent', fontSize: '13px' }}>进店</button>
                </div>

                {/* Detail Images Mock */}
                <div style={{ padding: '16px', background: 'var(--bg-card)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>—— 商品详情 ——</div>
                    {product.images.map((img, i) => (
                        <img key={i} src={img} style={{ width: '100%', display: 'block', marginBottom: '8px' }} />
                    ))}
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)',
                padding: '8px 16px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
                display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100
            }}>
                <div style={{ display: 'flex', gap: '20px', marginRight: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        客服
                    </div>
                    <div 
                        onClick={() => navigate('/commerce/cart')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        购物车
                        {cartCount > 0 && <div style={{ position: 'absolute', top: -4, right: -4, background: '#fa5151', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</div>}
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
                            <img src={product.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
