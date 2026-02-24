
import React, { useState, useEffect } from 'react';
import { navigateBack, navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { GigService, GigOrder } from '../services/GigService';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Tag } from '../../../components/Tag/Tag';
import { Card } from '../../../components/Card/Card';
import { InfiniteListView } from '../../../components/InfiniteListView/InfiniteListView';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { Dialog } from '../../../components/Dialog'; 
import { Popup } from '../../../components/Popup/Popup';
import { SignaturePad } from '../../../components/SignaturePad/SignaturePad'; // New

const TABS = [
    { id: 'all', label: '全部' },
    { id: 'creative', label: '内容创作' },
    { id: 'delivery', label: '跑腿配送' },
    { id: 'ride', label: '顺风出行' },
    { id: 'clean', label: '家政服务' },
];

const GigCard: React.FC<{ order: GigOrder; onGrab: (order: GigOrder) => void }> = ({ order, onGrab }) => {
    const isUrgent = order.urgency === 'high';
    const isCreative = order.type === 'design' || order.type === 'video_edit';
    
    const tagLabel = isCreative ? (order.type === 'design' ? '绘图' : '视频') : (order.type === 'delivery' ? '跑腿' : (order.type === 'ride' ? '出行' : '服务'));
    const tagColor = isCreative ? 'blue' : (order.type === 'delivery' ? 'green' : (order.type === 'ride' ? 'primary' : 'orange'));

    return (
        <Card 
            style={{
                border: isUrgent ? '1px solid rgba(250, 81, 81, 0.3)' : (isCreative ? '1px solid rgba(121, 40, 202, 0.2)' : 'none')
            }}
            highlight={isUrgent}
        >
            {isUrgent && (
                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                    <Tag color="danger" variant="solid" style={{ borderRadius: '0 12px 0 8px' }}>急单</Tag>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Tag color={tagColor as any} variant="light">{tagLabel}</Tag>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{order.title}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#fa5151', fontFamily: 'DIN Alternate' }}>
                    <span style={{ fontSize: '14px' }}>¥</span>{order.price}
                </div>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                {order.subTitle}
            </div>

            {/* Route Info or Requirement */}
            <div style={{ background: 'var(--bg-body)', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                {isCreative ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🎨</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>需使用 AI 生成工具交付</span>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: order.destination ? '8px' : '0' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#07c160', marginRight: '8px' }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{order.location}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>{order.distance}km</span>
                        </div>
                        {order.destination && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fa5151', marginRight: '8px' }} />
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{order.destination}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {order.tags.map(tag => (
                        <Tag key={tag} variant="outline" color="default" style={{ fontSize: '10px' }}>{tag}</Tag>
                    ))}
                </div>
                <button 
                    onClick={() => onGrab(order)}
                    style={{
                        background: isCreative ? 'linear-gradient(90deg, #7928CA, #FF0080)' : 'var(--primary-gradient)', 
                        color: 'white', border: 'none',
                        padding: '8px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 600,
                        cursor: 'pointer', 
                        boxShadow: isCreative ? '0 4px 12px rgba(121, 40, 202, 0.3)' : '0 4px 12px rgba(41, 121, 255, 0.3)'
                    }}
                >
                    {isCreative ? '接单创作' : '抢单'}
                </button>
            </div>
        </Card>
    );
};

// --- Contract Signing Sheet ---
const ContractSheet = ({ 
    visible, 
    order, 
    onClose, 
    onConfirm 
}: { 
    visible: boolean; 
    order: GigOrder | null; 
    onClose: () => void; 
    onConfirm: (signature: string) => void;
}) => {
    const [signature, setSignature] = useState<string | null>(null);

    if (!visible || !order) return null;

    return (
        <Popup visible={visible} onClose={onClose} position="bottom" round style={{ height: 'auto', minHeight: '400px' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>签署接单协议</div>
                
                <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '20px', background: 'var(--bg-body)', padding: '12px', borderRadius: '8px' }}>
                    <p>我承诺接受订单 <strong>{order.title}</strong>，并保证按时、保质完成交付。如有违约，愿承担平台相应处罚。</p>
                    <p style={{ marginTop: '8px', fontSize: '12px' }}>订单金额: ¥{order.price}</p>
                </div>
                
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>请在此签名确认：</div>
                
                <SignaturePad 
                    height={180} 
                    onEnd={setSignature}
                    onClear={() => setSignature(null)}
                />

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={onClose} 
                        style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '12px', fontSize: '16px' }}
                    >
                        取消
                    </button>
                    <button 
                        onClick={() => signature && onConfirm(signature)} 
                        disabled={!signature}
                        style={{ 
                            flex: 1, padding: '12px', border: 'none', 
                            background: signature ? 'var(--primary-color)' : 'var(--bg-cell-active)', 
                            color: signature ? 'white' : 'var(--text-secondary)', 
                            borderRadius: '12px', fontSize: '16px', fontWeight: 600 
                        }}
                    >
                        确认签署
                    </button>
                </div>
            </div>
        </Popup>
    );
};

export const GigCenterPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [orders, setOrders] = useState<GigOrder[]>([]);
    const [earnings, setEarnings] = useState({ today: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    
    // Contract State
    const [signingOrder, setSigningOrder] = useState<GigOrder | null>(null);

    const loadData = async () => {
        setLoading(true);
        // Simulate network delay
        await new Promise(r => setTimeout(r, 600));
        
        const res = await GigService.getAvailableOrders(activeTab);
        const earn = await GigService.getEarnings();
        
        if (res.success && res.data) setOrders(res.data);
        setEarnings(earn);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const initiateGrab = (order: GigOrder) => {
        // Creative orders or High value orders require signature
        if (order.type === 'design' || order.type === 'video_edit' || order.price > 100) {
            setSigningOrder(order);
        } else {
            handleGrab(order);
        }
    };

    const handleContractSigned = async (signature: string) => {
        if (!signingOrder) return;
        setSigningOrder(null); // Close modal
        await handleGrab(signingOrder); // Proceed
        // In real app, save signature
    };

    const handleGrab = async (order: GigOrder) => {
        Platform.device.vibrate([10, 50, 10]); // Strong haptic
        
        const res = await GigService.takeOrder(order.id);
        
        if (res.success) {
            setOrders(prev => prev.filter(o => o.id !== order.id)); // Optimistic remove
            
            if (order.type === 'design' || order.type === 'video_edit') {
                const mode = order.type === 'design' ? 'image' : 'video';
                const prompt = encodeURIComponent(order.requirements || order.subTitle);
                // For demo simplicity, direct navigate instead of sheet
                navigate(`/creation?panel=${mode}&prompt=${prompt}&source=gig`);
            } else {
                Toast.success('🎉 抢单成功！请尽快前往履约');
            }
        } else {
            Toast.error(res.message || '抢单失败');
            loadData(); 
        }
    };

    const Header = (
        <div style={{ marginBottom: '12px' }}>
            {/* Dashboard HUD */}
            <div style={{ background: '#1c1c1e', padding: '20px 16px', color: 'white', borderRadius: '0 0 16px 16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>今日预计收入</div>
                        <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'DIN Alternate', marginTop: '4px' }}>
                            {earnings.today.toFixed(2)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>听单模式</div>
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <div style={{ width: '8px', height: '8px', background: '#07c160', borderRadius: '50%', boxShadow: '0 0 8px #07c160' }} />
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>工作中</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ padding: '0 12px' }}>
                <Tabs 
                    items={TABS} 
                    activeId={activeTab} 
                    onChange={setActiveTab} 
                />
            </div>
        </div>
    );

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="接单中心" onBack={() => navigateBack('/discover')} />
            
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <InfiniteListView
                    data={orders}
                    loading={loading}
                    onRefresh={loadData}
                    header={Header}
                    restorationKey="gig_center_list"
                    padding="0 12px 20px 12px"
                    renderItem={(order: GigOrder) => <GigCard key={order.id} order={order} onGrab={initiateGrab} />}
                    renderSkeleton={() => <Skeleton width="100%" height={180} style={{ borderRadius: '12px', marginBottom: '12px' }} />}
                    emptyText="附近暂无新订单"
                    emptyIcon="📡"
                />
            </div>

            <ContractSheet 
                visible={!!signingOrder} 
                order={signingOrder} 
                onClose={() => setSigningOrder(null)} 
                onConfirm={handleContractSigned}
            />
        </div>
    );
};