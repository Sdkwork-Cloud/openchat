
import React, { useEffect, useState } from 'react';
import { navigateBack, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { OrderService, Order } from '../services/OrderService';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';

export const OrderDetailPage: React.FC = () => {
    const query = useQueryParams();
    const id = query.get('id');
    const [order, setOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            const res = await OrderService.getOrderDetail(id);
            if (res.success && res.data) {
                setOrder(res.data);
            }
        };
        load();
    }, [id]);

    if (!order) return null;

    // Status Styling
    const isCompleted = order.status === 'completed';
    const isPending = order.status === 'pending';
    const headerBg = isPending ? 'linear-gradient(135deg, #ff9a44, #ff6b00)' : 'linear-gradient(135deg, #2979FF, #1565C0)';

    const handleCopy = () => {
        Platform.clipboard.write(order.orderNo);
        Toast.success('已复制订单号');
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', paddingBottom: '80px' }}>
            <Navbar title="订单详情" variant="transparent" backFallback="/orders" rightElement={<div style={{padding:'0 12px'}}>···</div>} />
            
            {/* Status Header */}
            <div style={{ 
                background: headerBg, 
                padding: '60px 24px 40px 24px', 
                color: 'white',
                marginTop: '-44px' 
            }}>
                <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                    {isPending ? '等待买家付款' : (isCompleted ? '交易完成' : '买家已付款')}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    {isPending ? '剩23小时59分自动关闭' : '感谢您对 OpenChat 的信任'}
                </div>
            </div>

            <div style={{ padding: '0 12px', marginTop: '-20px' }}>
                {/* Logistics Card */}
                {order.status !== 'pending' && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '36px', height: '36px', background: '#2979FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '12px', fontSize: '18px' }}>
                            🚚
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
                                {order.status === 'shipped' ? '您的订单正在配送途中' : '订单处理中'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {order.trackingCompany ? `${order.trackingCompany}: ${order.trackingNo}` : new Date(order.updateTime).toLocaleString()}
                            </div>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>›</div>
                    </div>
                )}

                {/* Address Card (Mock) */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '36px', height: '36px', background: '#ff9a44', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '12px', fontSize: '18px' }}>
                        📍
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                            AI User <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>138****8888</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            上海市 浦东新区 张江高科技园区 888号 OpenChat 总部
                        </div>
                    </div>
                </div>

                {/* Products */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>OpenChat 自营店</div>
                    {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: idx !== order.items.length - 1 ? '16px' : '0' }}>
                            <img src={item.image} style={{ width: '70px', height: '70px', borderRadius: '6px', objectFit: 'cover', background: '#f5f5f5' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px' }}>{item.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.sku}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', fontWeight: 500 }}>¥{item.price}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>x{item.quantity}</div>
                            </div>
                        </div>
                    ))}
                    
                    <div style={{ marginTop: '16px', borderTop: '0.5px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>商品总价</span>
                            <span style={{ color: 'var(--text-primary)' }}>¥{order.totalAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>运费</span>
                            <span style={{ color: 'var(--text-primary)' }}>¥{order.freight.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
                            <span style={{ fontWeight: 600 }}>实付款</span>
                            <span style={{ color: '#fa5151', fontWeight: 600 }}>¥{order.actualAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Order Info */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ width: '70px' }}>订单编号</span>
                            <span style={{ color: 'var(--text-primary)', flex: 1 }}>{order.orderNo}</span>
                            <span onClick={handleCopy} style={{ color: 'var(--primary-color)', padding: '0 8px', cursor: 'pointer' }}>复制</span>
                        </div>
                        <div style={{ display: 'flex' }}>
                            <span style={{ width: '70px' }}>创建时间</span>
                            <span style={{ color: 'var(--text-primary)' }}>{new Date(order.createTime).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)',
                padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                display: 'flex', justifyContent: 'flex-end', gap: '12px',
                zIndex: 100
            }}>
                <button style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)' }}>
                    查看物流
                </button>
                {isPending && (
                    <button style={{ padding: '8px 24px', borderRadius: '20px', border: 'none', background: 'var(--primary-color)', fontSize: '13px', color: 'white', fontWeight: 500 }}>
                        立即支付
                    </button>
                )}
                {isCompleted && (
                    <button style={{ padding: '8px 24px', borderRadius: '20px', border: '1px solid #fa5151', background: 'transparent', fontSize: '13px', color: '#fa5151', fontWeight: 500 }}>
                        申请售后
                    </button>
                )}
            </div>
        </div>
    );
};
