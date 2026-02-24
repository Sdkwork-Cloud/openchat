
import React, { useEffect, useState } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { DistributionService, Distributor, DistributionTask } from '../services/DistributionService';
import { Card } from '../../../components/Card/Card';
import { Toast } from '../../../components/Toast';
import { useChatStore } from '../../../services/store';
import { useCountUp } from '../../../hooks/useCountUp';
import { Progress } from '../../../components/Progress/Progress'; // Use generic
import { NoticeBar } from '../../../components/NoticeBar/NoticeBar'; // Use generic
import { Grid, GridItem } from '../../../components/Grid/Grid'; // Use generic

// --- Components ---

const StatBox = ({ label, value, sub }: { label: string, value: string, sub?: string }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'DIN Alternate', color: 'white' }}>{value}</div>
        {sub && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{sub}</div>}
    </div>
);

const MenuGrid = () => {
    const items = [
        { label: '我的团队', icon: '👥', path: '/commerce/distribution/team', color: '#2979FF' },
        { label: '分销订单', icon: '📦', path: '/commerce/distribution/orders', color: '#FF9C6E' },
        { label: '推广商品', icon: '🔥', path: '/commerce/distribution/goods', color: '#fa5151' },
        { label: '邀请海报', icon: '🖼️', path: '/commerce/distribution/poster', color: '#7928CA' },
        { label: '佣金明细', icon: '💰', path: '/commerce/distribution/commission', color: '#FFC300' },
        { label: '提现', icon: '💳', path: '/commerce/distribution/withdraw', color: '#07c160' },
        { label: '排行榜', icon: '🏆', path: '/commerce/distribution/rank', color: '#FFD700' },
        { label: '新手指南', icon: '📚', path: '', action: () => Toast.info('功能开发中'), color: '#666' },
    ];

    return (
        <div style={{ padding: '0 12px' }}>
            <Grid cols={4} gap={8}>
                {items.map(item => (
                    <GridItem 
                        key={item.label}
                        text={item.label}
                        icon={<div style={{ fontSize: '24px' }}>{item.icon}</div>}
                        onClick={() => item.action ? item.action() : navigate(item.path)}
                        style={{ background: 'var(--bg-card)', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
                    />
                ))}
            </Grid>
        </div>
    );
};

// AI Consultant Entry
const AIConsultantCard = () => {
    const { createSession } = useChatStore();
    
    const handleConsult = async () => {
        const sessionId = await createSession('agent_marketing');
        navigate('/chat', { id: sessionId });
    };

    return (
        <div 
            onClick={handleConsult}
            style={{
                margin: '16px 12px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(76, 161, 175, 0.3)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ position: 'absolute', right: -10, top: -10, fontSize: '80px', opacity: 0.1, transform: 'rotate(15deg)' }}>💹</div>
            <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🤖</span> 首席营销官 (CMO)
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                    发圈困难？文案卡壳？<br/>让 AI 帮你写出爆款带货文案。
                </div>
            </div>
            <div style={{ 
                background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', 
                fontSize: '12px', fontWeight: 600, backdropFilter: 'blur(5px)', zIndex: 1,
                border: '1px solid rgba(255,255,255,0.3)'
            }}>
                立即咨询
            </div>
        </div>
    );
};

// Tasks Widget
const TasksWidget = ({ tasks, onClaim }: { tasks: DistributionTask[], onClaim: (id: string) => void }) => (
    <div style={{ padding: '0 12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingLeft: '4px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>成长任务</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>查看全部 ›</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {tasks.map(task => {
                const percent = Math.min((task.current / task.target) * 100, 100);
                const isClaim = task.status === 'claim';
                const isDone = task.status === 'done';
                
                return (
                    <div key={task.id} style={{ 
                        minWidth: '200px', background: 'var(--bg-card)', borderRadius: '12px', padding: '12px',
                        border: '0.5px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{task.title}</span>
                            <span style={{ fontSize: '10px', color: '#fa5151', background: 'rgba(250, 81, 81, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>{task.reward}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{task.desc}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ flex: 1 }}>
                                <Progress percent={percent} strokeHeight={4} trackColor="var(--bg-body)" />
                            </div>
                            {isClaim ? (
                                <button 
                                    onClick={() => onClaim(task.id)} 
                                    style={{ padding: '4px 10px', border: 'none', background: 'var(--primary-gradient)', color: 'white', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    领取
                                </button>
                            ) : (
                                <span style={{ fontSize: '10px', color: isDone ? '#07c160' : 'var(--text-secondary)' }}>
                                    {isDone ? '已完成' : `${task.current}/${task.target}`}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

export const DistributionCenterPage: React.FC = () => {
    const [info, setInfo] = useState<Distributor | null>(null);
    const [tasks, setTasks] = useState<DistributionTask[]>([]);

    // Animated values
    const aniWithdrawable = useCountUp(info?.withdrawableCommission || 0, 1500, 2);
    const aniTotal = useCountUp(info?.totalCommission || 0, 1500, 2);
    const aniPending = useCountUp(info?.pendingCommission || 0, 1500, 2);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await DistributionService.getMyDistributorInfo();
        if (res.success && res.data) setInfo(res.data);
        
        const tasksRes = await DistributionService.getTasks();
        if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
    };

    const handleClaimTask = async (taskId: string) => {
        Toast.loading('正在领取...');
        const res = await DistributionService.claimTask(taskId);
        if (res.success) {
            Toast.success('领取成功');
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t));
        } else {
            Toast.error('领取失败');
        }
    };

    if (!info) return <div />;

    const salesPercent = Math.min((info.totalSales / 150000) * 100, 100);

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="分销中心" onBack={() => navigateBack('/me')} variant="transparent" />
            
            {/* Header Card */}
            <div style={{ 
                background: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)', 
                paddingBottom: '20px',
                marginTop: '-44px',
                borderBottomLeftRadius: '24px',
                borderBottomRightRadius: '24px',
                marginBottom: '10px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                paddingTop: '60px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Texture overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', opacity: 0.3 }} />
                
                <NoticeBar 
                    icon={<span style={{marginRight: 4}}>📢</span>}
                    text="恭喜用户 User_888 刚刚提现 ¥1000 · 恭喜 Alice 升级为金牌分销商 · 恭喜 Bob 成功邀请 5 位好友"
                    background="rgba(0,0,0,0.2)"
                    color="rgba(255,255,255,0.9)"
                    style={{ height: '32px', marginBottom: '12px' }}
                />
                
                <div style={{ padding: '0 20px 10px 20px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', marginRight: '16px', border: '2px solid #ffd700', padding: '2px' }}>
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" style={{ width: '100%', borderRadius: '50%' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                                AI User 
                                <span style={{ fontSize: '10px', background: 'linear-gradient(90deg, #ffd700, #ffaa00)', color: '#333', padding: '2px 8px', borderRadius: '10px', marginLeft: '8px', fontWeight: 800 }}>
                                    {info.level.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}>
                                邀请码: <span style={{ fontFamily: 'monospace', fontSize: '13px', margin: '0 4px', color: 'white' }}>{info.referralCode}</span>
                                <span 
                                    style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }} 
                                    onClick={() => { navigator.clipboard.writeText(info.referralCode); Toast.success('已复制'); }}
                                >复制</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: '10px' }}>
                        <StatBox label="可提现佣金" value={`¥${aniWithdrawable}`} />
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <StatBox label="累计收益" value={`¥${aniTotal}`} />
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <StatBox label="待结算" value={`¥${aniPending}`} />
                    </div>

                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(5px)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600 }}>团队业绩</span>
                            <span style={{ fontFamily: 'DIN Alternate' }}>{info.totalSales} / 150000</span>
                        </div>
                        <Progress 
                            percent={salesPercent} 
                            color="linear-gradient(90deg, #ffd700, #ffaa00)" 
                            trackColor="rgba(255,255,255,0.2)"
                        />
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>当前: 黄金会员</span>
                            <span>目标: 钻石会员 (还差 ¥{150000 - info.totalSales})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Advisor */}
            <AIConsultantCard />

            {/* Menu */}
            <MenuGrid />

            {/* Tasks */}
            <TasksWidget tasks={tasks} onClaim={handleClaimTask} />

            {/* Recent Activity */}
            <div style={{ padding: '0 12px 20px 12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', paddingLeft: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>最近动态</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>查看更多 ›</span>
                </div>
                <Card padding="0">
                    <div style={{ padding: '16px', borderBottom: '0.5px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '14px' }}>下级 Alice 购买了商品</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>2023-12-24 14:30</div>
                        </div>
                        <div style={{ color: '#07c160', fontWeight: 600 }}>+45.00</div>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '14px' }}>新成员 Bob 加入团队</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>2023-12-23 09:12</div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>二级成员</div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
