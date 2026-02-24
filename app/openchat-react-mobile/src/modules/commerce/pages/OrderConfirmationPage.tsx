
import React, { useState, useEffect, useMemo } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { CartService, CartItem } from '../services/CartService';
import { AddressService, Address } from '../../user/services/AddressService';
import { OrderService } from '../services/OrderService';
import { Toast } from '../../../components/Toast';
import { AddressEditSheet } from '../../user/components/AddressEditSheet';
import { CashierModal } from '../components/CashierModal';

export const OrderConfirmationPage: React.FC = () => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [address, setAddress] = useState<Address | null>(null);
    const [showAddressSheet, setShowAddressSheet] = useState(false);
    
    // Payment State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCashier, setShowCashier] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // 1. Get Selected Cart Items
        const cartRes = await CartService.getCartItems();
        if (cartRes.success && cartRes.data) {
            const selected = cartRes.data.filter(i => i.selected);
            if (selected.length === 0) {
                Toast.error('未选择商品');
                navigateBack();
                return;
            }
            setItems(selected);
        }

        // 2. Get Default Address
        const addrRes = await AddressService.getAddresses();
        if (addrRes.success && addrRes.data) {
            const def = addrRes.data.find(a => a.isDefault) || addrRes.data[0];
            setAddress(def || null);
        }
    };

    const handleCreateAddress = async (addr: Partial<Address>) => {
        const res = await AddressService.saveAddress(addr);
        if (res.success && res.data) {
            setAddress(res.data);
            Toast.success('地址已添加');
        }
    };

    const handleSubmit = async () => {
        if (!address) {
            Toast.info('请填写收货地址');
            return;
        }
        
        setIsSubmitting(true);
        // 1. Create Order
        const orderRes = await OrderService.createOrder(items, address, '');
        
        if (orderRes.success && orderRes.data) {
            // 2. Clear Cart items that were ordered
            const ids = items.map(i => i.id);
            await CartService.removeItems(ids);
            
            // 3. Prepare for Cashier
            setCreatedOrderId(orderRes.data.id);
            setIsSubmitting(false);
            setShowCashier(true); // Open Cashier
        } else {
            Toast.error('创建订单失败');
            setIsSubmitting(false);
        }
    };

    const handlePaymentSuccess = async () => {
        if (!createdOrderId) return;
        await OrderService.payOrder(createdOrderId);
        setShowCashier(false);
        // Navigate to Order List instead of replacing, so user can go back if needed
        navigate('/orders'); 
    };

    const handleCashierClose = () => {
        // User closed cashier without paying.
        // Navigate to Order Detail (Pending status) or List
        setShowCashier(false);
        Toast.info('订单已生成，请尽快支付');
        navigate('/orders');
    };

    const totalAmount = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
    const freight = totalAmount > 99 ? 0 : 10;
    const finalAmount = totalAmount + freight;

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="确认订单" onBack={() => navigateBack()} />
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {/* Address Card */}
                <div 
                    onClick={() => {
                        if (address) {
                            Toast.info('切换地址功能 (Demo: 请在我的地址管理)');
                        } else {
                            setShowAddressSheet(true);
                        }
                    }}
                    style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                    <div style={{ marginRight: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px' }}>📍</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        {address ? (
                            <>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    {address.name} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>{address.phone}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{address.detail}</div>
                            </>
                        ) : (
                            <div style={{ fontSize: '15px', color: 'var(--primary-color)' }}>+ 添加收货地址</div>
                        )}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>›</div>
                </div>

                {/* Items List */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>OpenChat 自营商城</div>
                    {items.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '72px', height: '72px', borderRadius: '8px', background: '#f5f5f5', overflow: 'hidden', flexShrink: 0 }}>
                                <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.sku}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ color: '#fa5151', fontWeight: 600 }}>¥{item.price}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>x{item.quantity}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>配送方式</span>
                        <span>快递 免邮</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>买家留言</span>
                        <span style={{ color: 'var(--text-placeholder)' }}>无</span>
                    </div>
                </div>

                {/* Price Breakdown */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>商品金额</span>
                        <span>¥{totalAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>运费</span>
                        <span style={{ color: '#fa5151' }}>{freight > 0 ? `+¥${freight}` : '免运费'}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '14px' }}>
                        合计: <span style={{ fontSize: '20px', fontWeight: 700, color: '#fa5151', fontFamily: 'DIN Alternate' }}>¥{finalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{ 
                background: 'var(--bg-card)', 
                padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
                borderTop: '0.5px solid var(--border-color)',
                display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px'
            }}>
                <div style={{ fontSize: '14px' }}>
                    共{items.length}件, 实付: <span style={{ color: '#fa5151', fontSize: '20px', fontWeight: 700, fontFamily: 'DIN Alternate' }}>¥{finalAmount.toFixed(2)}</span>
                </div>
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{
                        background: 'var(--primary-gradient)', color: 'white', border: 'none',
                        padding: '10px 24px', borderRadius: '24px', fontSize: '15px', fontWeight: 600,
                        opacity: isSubmitting ? 0.7 : 1,
                        cursor: isSubmitting ? 'default' : 'pointer'
                    }}
                >
                    {isSubmitting ? '提交中...' : '提交订单'}
                </button>
            </div>

            <AddressEditSheet 
                visible={showAddressSheet} 
                onClose={() => setShowAddressSheet(false)} 
                onSave={(addr) => { handleCreateAddress(addr); setShowAddressSheet(false); }}
            />

            <CashierModal 
                visible={showCashier}
                amount={finalAmount}
                orderId={createdOrderId}
                onClose={handleCashierClose}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
};
