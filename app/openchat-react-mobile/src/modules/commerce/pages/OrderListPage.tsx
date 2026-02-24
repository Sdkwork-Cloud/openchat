
import React, { useState } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { OrderService, Order } from '../services/OrderService';
import { Toast } from '../../../components/Toast';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Card } from '../../../components/Card/Card';
import { Tag } from '../../../components/Tag/Tag';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';

const TABS = [
    { id: 'all', label: '全部' },
    { id: 'pending', label: '待付款' },
    { id: 'shipped', label: '待收货' },
    { id: 'completed', label: '已完成' },
    { id: 'refunded', label: '退款/售后' },
];

const OrderCard: React.FC<{ order: Order; onClick: () => void; onPay: () => void }> = ({ order, onClick, onPay }) => {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { text: '待付款', color: 'warning' };
            case 'paid': return { text: '待发货', color: 'primary' };
            case 'shipped': return { text: '运输中', color: 'primary' };
            case 'completed': return { text: '已完成', color: 'default' };
            case 'cancelled': return { text: '已取消', color: 'default' };
            case 'refunded': return { text: '退款中', color: 'danger' };
            default: return { text: status, color: 'default' };
        }
    };

    const statusInfo = getStatusConfig(order.status);

    return (
        <Card onClick={onClick}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    OpenChat 自营店 ›
                </div>
                <Tag color={statusInfo.color as any} variant="light" size="sm">{statusInfo.text}</Tag>
            </div>

            {/* Product(s) */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-cell-top)', flexShrink: 0 }}>
                    <img src={order.items[0].image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2px 0' }}>
                    <div>
                        <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {order.items[0].name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {order.items[0].sku}
                        </div>
                    </div>
                    {(order.items.length > 1 || order.items[0].quantity > 1) && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                            共 {order.items.reduce((acc, i) => acc + i.quantity, 0)} 件
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '2px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DIN Alternate, sans-serif' }}>
                        ¥{order.items[0].price}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>x{order.items[0].quantity}</div>
                </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>实付</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>¥</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DIN Alternate, sans-serif' }}>
                    {order.actualAmount.toFixed(2)}
                </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '0.5px solid var(--border-color)', paddingTop: '12px' }}>
                {order.status === 'completed' || order.status === 'cancelled' ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); Toast.success('已加入购物车'); }}
                        style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)' }}
                    >
                        再次购买
                    </button>
                ) : null}
                
                {order.status === 'pending' ? (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); Toast.info('取消订单'); }}
                            style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'transparent', fontSize: '13px', color: 'var(--text-secondary)' }}
                        >
                            取消订单
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onPay(); }}
                            style={{ padding: '6px 16px', borderRadius: '16px', border: 'none', background: 'var(--primary-color)', fontSize: '13px', color: 'white', fontWeight: 500 }}
                        >
                            去支付
                        </button>
                    </>
                ) : null}

                {order.status === 'shipped' ? (
                    <button 
                        style={{ padding: '6px 16px', borderRadius: '16px', border: '1px solid var(--primary-color)', background: 'transparent', fontSize: '13px', color: 'var(--primary-color)', fontWeight: 500 }}
                    >
                        确认收货
                    </button>
                ) : null}
            </div>
        </Card>
    );
};

export const OrderListPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('all');

    // Use Live Query for automatic updates (e.g. after paying)
    const { data: orderPage, viewStatus, refresh } = useLiveQuery(
        OrderService,
        () => OrderService.getOrders(activeTab),
        { deps: [activeTab] }
    );

    const orders = orderPage?.content || [];

    const handlePay = async (id: string) => {
        Toast.loading('支付中...');
        setTimeout(async () => {
            await OrderService.payOrder(id);
            Toast.success('支付成功');
            // Refresh logic is now automatic via useLiveQuery subscription to Service!
        }, 1000);
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="我的订单" onBack={() => navigateBack('/wallet')} />
            
            {/* Tabs */}
            <div style={{ position: 'sticky', top: '44px', zIndex: 10 }}>
                <Tabs 
                    items={TABS} 
                    activeId={activeTab} 
                    onChange={setActiveTab} 
                />
            </div>

            {/* List */}
            <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                <StateView 
                    status={viewStatus} 
                    onRetry={refresh} 
                    emptyText="暂无相关订单" 
                    emptyIcon="📦"
                >
                    {orders.map(order => (
                        <OrderCard 
                            key={order.id} 
                            order={order} 
                            onClick={() => navigate('/orders/detail', { id: order.id })}
                            onPay={() => handlePay(order.id)}
                        />
                    ))}
                </StateView>
            </div>
        </div>
    );
};
