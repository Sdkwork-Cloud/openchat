
import React, { useEffect, useState, useMemo } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { CartService, CartItem } from '../services/CartService';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { Empty } from '../../../components/Empty/Empty';
import { Toast } from '../../../components/Toast';
import { Stepper } from '../../../components/Stepper/Stepper';
import { SmartImage } from '../../../components/SmartImage/SmartImage';
import { useTranslation } from '../../../core/i18n/I18nContext';

export const ShoppingCartPage: React.FC = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState<CartItem[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        const res = await CartService.getCartItems();
        if (res.success && res.data) setItems(res.data);
    };

    const handleQuantity = async (id: string, newVal: number) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const delta = newVal - item.quantity;
        if (delta !== 0) {
            await CartService.updateQuantity(id, delta);
            loadCart();
        }
    };

    const handleSelect = async (id: string) => {
        await CartService.toggleSelection(id);
        loadCart();
    };

    const handleSelectAll = async () => {
        const allSelected = items.length > 0 && items.every(i => i.selected);
        await CartService.toggleAll(!allSelected);
        loadCart();
    };

    const handleDelete = async () => {
        const selectedIds = items.filter(i => i.selected).map(i => i.id);
        if (selectedIds.length === 0) return;
        
        if (window.confirm(t('common.delete') + ` ${selectedIds.length} ?`)) {
            await CartService.removeItems(selectedIds);
            Toast.success(t('common.delete'));
            loadCart();
        }
    };

    const handleCheckout = () => {
        const selectedCount = items.filter(i => i.selected).length;
        if (selectedCount === 0) {
            Toast.info(t('commerce.select_all'));
            return;
        }
        navigate('/commerce/checkout');
    };

    const totalPrice = useMemo(() => {
        return items
            .filter(i => i.selected)
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [items]);

    const isAllSelected = items.length > 0 && items.every(i => i.selected);

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                title={`${t('commerce.cart')}(${items.length})`} 
                onBack={() => navigateBack('/me')}
                rightElement={
                    <div onClick={() => setIsEditMode(!isEditMode)} style={{ fontSize: '15px', color: 'var(--text-primary)', cursor: 'pointer', padding: '0 12px' }}>
                        {isEditMode ? t('common.complete') : t('common.manage')}
                    </div>
                }
            />

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', paddingBottom: '100px' }}>
                {items.length === 0 ? (
                    <Empty 
                        icon="🛒" text={t('commerce.cart_empty')} 
                        action={<button onClick={() => navigate('/commerce/mall')} style={{ padding: '8px 20px', borderRadius: '16px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', background: 'transparent', cursor: 'pointer' }}>{t('commerce.go_shopping')}</button>}
                    />
                ) : (
                    items.map(item => (
                        <div key={item.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Checkbox checked={item.selected} onChange={() => handleSelect(item.id)} />
                            <SmartImage 
                                src={item.image} 
                                containerStyle={{ width: '80px', height: '80px', flexShrink: 0 }}
                                radius={8}
                                preview={false}
                            />
                            <div style={{ flex: 1, minWidth: 0, height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {item.title}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-body)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                                        {item.sku}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ color: '#fa5151', fontWeight: 700, fontFamily: 'DIN Alternate' }}>
                                        ¥{item.price}
                                    </div>
                                    <Stepper 
                                        value={item.quantity} 
                                        onChange={(val) => handleQuantity(item.id, val)}
                                        max={99}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Bar */}
            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)',
                padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                zIndex: 100
            }}>
                <div onClick={handleSelectAll} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Checkbox checked={isAllSelected} size={20} />
                    {t('commerce.select_all')}
                </div>

                {isEditMode ? (
                    <button 
                        onClick={handleDelete}
                        style={{ padding: '8px 24px', borderRadius: '20px', border: '1px solid #fa5151', background: 'transparent', color: '#fa5151', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        {t('common.delete')}
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{t('commerce.total')}: </span>
                            <span style={{ fontSize: '18px', color: '#fa5151', fontWeight: 700, fontFamily: 'DIN Alternate' }}>¥{totalPrice.toFixed(2)}</span>
                        </div>
                        <button 
                            onClick={handleCheckout}
                            style={{ 
                                padding: '8px 24px', borderRadius: '20px', border: 'none', 
                                background: 'var(--primary-gradient)', color: 'white', 
                                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            {t('commerce.checkout')}({items.filter(i => i.selected).reduce((acc, i) => acc + i.quantity, 0)})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
