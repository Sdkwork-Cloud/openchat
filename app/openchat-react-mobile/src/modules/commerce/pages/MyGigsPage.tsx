
import React, { useState } from 'react';
import { navigateBack, navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { GigService, GigOrder } from '../services/GigService';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';
import { CreationService, CreationItem } from '../../creation/services/CreationService';
import { ImageViewer } from '../../../components/ImageViewer/ImageViewer';
import { SubmitWorkSheet, SubmissionData } from '../components/SubmitWorkSheet';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Card } from '../../../components/Card/Card';
import { Steps } from '../../../components/Steps/Steps'; 
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';

// --- Sub-Components ---

const WorkCard: React.FC<{ order: GigOrder; onComplete: (order: GigOrder) => void; onAction: (order: GigOrder) => void }> = ({ order, onComplete, onAction }) => {
    const isCreative = order.type === 'design' || order.type === 'video_edit';
    
    // Map status to step index
    let stepIndex = 0;
    if (order.status === 'taken') stepIndex = 1;
    if (order.status === 'submitted') stepIndex = 2;
    if (order.status === 'completed') stepIndex = 3;

    return (
        <Card radius="16px" padding="20px" highlight={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ 
                        fontSize: '12px', fontWeight: 600,
                        color: isCreative ? '#7928CA' : '#07c160',
                        background: isCreative ? 'rgba(121, 40, 202, 0.1)' : 'rgba(7, 193, 96, 0.1)',
                        padding: '3px 8px', borderRadius: '6px'
                    }}>
                        {isCreative ? '创意工单' : '服务工单'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(order.createTime).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#fa5151', fontFamily: 'DIN Alternate' }}>
                    ¥{order.price.toFixed(0)}
                </div>
            </div>

            <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {order.title}
            </div>
            
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
                {order.requirements || order.subTitle}
            </div>

            {order.status !== 'completed' && (
                <div style={{ marginBottom: '20px', padding: '0 8px' }}>
                    <Steps 
                        current={stepIndex}
                        items={[
                            { title: '接单' },
                            { title: '创作' },
                            { title: '交付' },
                            { title: '结算' }
                        ]}
                    />
                </div>
            )}

            {/* Deliverable Preview */}
            {order.deliverableUrl && (
                <div style={{ marginTop: '20px', background: 'var(--bg-body)', padding: '12px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div 
                        onClick={() => order.deliverableUrl && ImageViewer.show(order.deliverableUrl)}
                        style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}
                    >
                        {order.deliverableType === 'video' ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>🎬</div>
                        ) : (
                            <img src={order.deliverableUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>已提交交付物</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>等待验收中...</div>
                    </div>
                    {order.status === 'submitted' && (
                        <div style={{ color: '#07c160', fontSize: '20px' }}>✓</div>
                    )}
                </div>
            )}

            <div style={{ borderTop: '0.5px solid var(--border-color)', marginTop: '20px', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {order.status === 'taken' && (
                    <>
                        <button 
                            onClick={() => navigate('/chat', { id: 'omni_core' })} // Mock contact support
                            style={{
                                background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            联系雇主
                        </button>
                        <button 
                            onClick={() => onAction(order)}
                            style={{
                                background: 'var(--primary-color)', color: 'white', border: 'none',
                                padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)'
                            }}
                        >
                            {isCreative ? '去交付' : '开始服务'}
                        </button>
                    </>
                )}
                
                {order.status === 'submitted' && (
                    <button 
                        onClick={() => onComplete(order)}
                        style={{
                            background: '#07c160', color: 'white', border: 'none',
                            padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(7, 193, 96, 0.3)'
                        }}
                    >
                        确认验收 & 结算
                    </button>
                )}

                {order.status === 'completed' && (
                    <div style={{ fontSize: '13px', color: '#07c160', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✓</span> 交易完成，款项已到账
                    </div>
                )}
            </div>
        </Card>
    );
};

// Simplified Creation Picker for "Choose from Library"
const CreationPicker: React.FC<{ visible: boolean; onClose: () => void; onSelect: (item: CreationItem) => void }> = ({ visible, onClose, onSelect }) => {
    // This picker fetches its own data for simplicity. Ideally it should also be a live query or passed in.
    const [creations, setCreations] = useState<CreationItem[]>([]);
    
    React.useEffect(() => {
        if (visible) {
            CreationService.getMyCreations('全部').then(res => { if (res.data) setCreations(res.data); });
        }
    }, [visible]);

    if (!visible) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s' }}>
            <Navbar title="选择作品交付" onBack={onClose} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {creations.map(item => (
                        <div key={item.id} onClick={() => onSelect(item)} style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                            <div style={{ aspectRatio: '1/1', background: '#eee', position: 'relative' }}>
                                {item.url && <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', padding: '2px 4px', borderRadius: '4px' }}>{item.type}</div>
                            </div>
                            <div style={{ padding: '8px', fontSize: '12px' }}>
                                <div style={{ fontWeight: 500, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const MyGigsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    
    // Live Query for Orders
    const { data: orders = [], viewStatus, refresh } = useLiveQuery(
        GigService,
        () => GigService.getMyGigs(activeTab),
        { deps: [activeTab] }
    );
    
    // Action Logic
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showSubmitSheet, setShowSubmitSheet] = useState(false); 
    const [selectedOrder, setSelectedOrder] = useState<GigOrder | null>(null);

    const handleActionClick = (order: GigOrder) => {
        if (order.type === 'design' || order.type === 'video_edit') {
            setSelectedOrder(order);
            setShowActionSheet(true);
        } else {
            Toast.info('正在打开地图导航...');
        }
    };

    const handleSubmitResult = async (url: string, type: 'image' | 'video') => {
        if (!selectedOrder) return;
        Toast.loading('正在提交交付物...');
        await GigService.submitWork(selectedOrder.id, url, type);
        
        setShowPicker(false);
        setShowActionSheet(false);
        setShowSubmitSheet(false);
        
        setTimeout(() => {
            Toast.success('交付成功，等待验收');
        }, 800);
    };

    // Callback from the complex form
    const handleComplexSubmit = async (data: SubmissionData) => {
        if (!selectedOrder) return;
        Toast.loading('正在上传资产 (模拟)...');
        
        // Simulate upload delay
        await new Promise(r => setTimeout(r, 1500));
        
        // Auto-archive to My Creations
        const type = selectedOrder.type === 'design' ? 'image' : 'video';
        await CreationService.create({
            title: `[交付] ${selectedOrder.title}`,
            type: type,
            prompt: data.prompt || 'Freelance work',
            url: data.mainPreview, 
            isPublic: false,
            author: 'Me',
            likes: 0
        });

        // Submit to Order
        await handleSubmitResult(data.mainPreview, type);
    };

    const handleComplete = async (order: GigOrder) => {
        if (window.confirm('确认验收通过并结算？资金将立即转入您的钱包。')) {
            Platform.device.vibrate(10);
            Toast.loading('结算中...');
            await GigService.completeOrder(order.id);
            setTimeout(() => {
                Toast.success(`入账 ¥${order.price}`);
            }, 800);
        }
    };

    const TABS_CONFIG = [{id: 'active', label: '进行中'}, {id: 'history', label: '历史记录'}];

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="我的接单" onBack={() => navigateBack('/me')} />
            
            <Tabs 
                items={TABS_CONFIG}
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as any)}
            />

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <StateView 
                    status={viewStatus}
                    onRetry={refresh}
                    emptyText={`暂无${activeTab === 'active' ? '进行中' : '历史'}任务`}
                    emptyIcon="💼"
                    renderEmpty={() => (
                        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>💼</div>
                            <div style={{ fontSize: '15px' }}>暂无{activeTab === 'active' ? '进行中' : '历史'}任务</div>
                            {activeTab === 'active' && (
                                <div 
                                    onClick={() => navigate('/discover/gigs')}
                                    style={{ marginTop: '20px', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    前往接单大厅 →
                                </div>
                            )}
                        </div>
                    )}
                >
                    {orders.map((order: GigOrder) => (
                        <WorkCard 
                            key={order.id} 
                            order={order} 
                            onComplete={handleComplete} 
                            onAction={handleActionClick} 
                        />
                    ))}
                </StateView>
            </div>

            {/* Choice Sheet (AI vs Local) */}
            {showActionSheet && (
                <>
                    <div onClick={() => setShowActionSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900, animation: 'fadeIn 0.2s' }} />
                    <div style={{ 
                        position: 'fixed', bottom: 0, left: 0, right: 0, 
                        background: 'var(--bg-card)', zIndex: 901, 
                        borderRadius: '20px 20px 0 0', overflow: 'hidden',
                        animation: 'slideUp 0.3s', paddingBottom: 'env(safe-area-inset-bottom)'
                    }}>
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border-color)' }}>
                            选择制作方式
                        </div>
                        <div 
                            onClick={() => {
                                setShowActionSheet(false);
                                const mode = selectedOrder?.type === 'design' ? 'image' : 'video';
                                const prompt = encodeURIComponent(selectedOrder?.requirements || '');
                                navigate(`/creation?panel=${mode}&prompt=${prompt}&source=gig`);
                            }}
                            style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '17px', background: 'var(--bg-card)' }}
                        >
                            🪄 使用 AI 在线创作
                        </div>
                        <div 
                            onClick={() => { setShowActionSheet(false); setShowPicker(true); }} 
                            style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '17px', background: 'var(--bg-card)' }}
                        >
                            📦 从作品库选择
                        </div>
                        <div 
                            onClick={() => { setShowActionSheet(false); setShowSubmitSheet(true); }} 
                            style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '17px', background: 'var(--bg-card)' }}
                        >
                            📤 本地上传 / 交付工坊
                        </div>
                        <div 
                            onClick={() => setShowActionSheet(false)} 
                            style={{ padding: '16px', textAlign: 'center', fontSize: '17px', fontWeight: 600, borderTop: '8px solid var(--bg-body)' }}
                        >
                            取消
                        </div>
                    </div>
                </>
            )}

            {/* Custom Submit Sheet */}
            <SubmitWorkSheet 
                visible={showSubmitSheet}
                type={selectedOrder?.type as any}
                onClose={() => setShowSubmitSheet(false)}
                onSubmit={handleComplexSubmit}
            />

            {/* Simple Library Picker */}
            <CreationPicker 
                visible={showPicker} 
                onClose={() => setShowPicker(false)}
                onSelect={(item) => {
                    if (item.url) handleSubmitResult(item.url, item.type as any);
                    else Toast.error('该作品无效');
                }}
            />
        </div>
    );
};
