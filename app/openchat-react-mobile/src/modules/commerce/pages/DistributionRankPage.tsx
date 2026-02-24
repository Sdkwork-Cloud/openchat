
import React, { useEffect, useState } from 'react';
import { navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { DistributionService, RankItem } from '../services/DistributionService';
import { Avatar } from '../../../components/Avatar';
import { Empty } from '../../../components/Empty/Empty';

const TopThreeItem = ({ item, color, label }: { item: RankItem, color: string, label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', marginTop: item.rank === 1 ? 0 : '30px' }}>
        {/* Crown/Medal */}
        <div style={{ fontSize: '24px', marginBottom: '-10px', zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{label}</div>
        
        {/* Avatar Ring */}
        <div style={{ 
            width: item.rank === 1 ? '72px' : '60px', 
            height: item.rank === 1 ? '72px' : '60px', 
            borderRadius: '50%', 
            border: `3px solid ${color}`,
            padding: '2px',
            background: 'var(--bg-card)',
            boxShadow: `0 4px 12px ${color}40`
        }}>
            <Avatar src={item.avatar} size={item.rank === 1 ? 64 : 52} shape="circle" border={false} />
        </div>
        
        <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: color, fontFamily: 'DIN Alternate', marginTop: '2px' }}>
            ¥{item.amount.toLocaleString()}
        </div>
    </div>
);

const RankListItem: React.FC<{ item: RankItem }> = ({ item }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-color)' }}>
        <div style={{ width: '40px', fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {item.rank}
        </div>
        <div style={{ marginLeft: '8px', marginRight: '16px' }}>
            <Avatar src={item.avatar} size={40} />
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DIN Alternate' }}>
                ¥{item.amount.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: item.trend === 'up' ? '#fa5151' : (item.trend === 'down' ? '#07c160' : 'var(--text-placeholder)') }}>
                {item.trend === 'up' ? '▲ 排名上升' : (item.trend === 'down' ? '▼ 排名下降' : '- 持平')}
            </div>
        </div>
    </div>
);

export const DistributionRankPage: React.FC = () => {
    const [ranks, setRanks] = useState<RankItem[]>([]);
    const [myRank, setMyRank] = useState<RankItem | null>(null);

    useEffect(() => {
        const load = async () => {
            const res = await DistributionService.getRankings();
            if (res.success && res.data) {
                setRanks(res.data);
                const me = res.data.find(r => r.userId === 'dist_me'); // Use dynamic ID in real app
                setMyRank(me || null);
            }
        };
        load();
    }, []);

    const topThree = ranks.filter(r => r.rank <= 3).sort((a, b) => a.rank - b.rank);
    // Rearrange for podium: 2, 1, 3
    const podium = [
        topThree.find(r => r.rank === 2),
        topThree.find(r => r.rank === 1),
        topThree.find(r => r.rank === 3)
    ].filter(Boolean) as RankItem[];

    const list = ranks.filter(r => r.rank > 3);

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="分销排行榜" onBack={() => navigateBack('/commerce/distribution')} variant="transparent" />
            
            {/* Podium Area */}
            <div style={{ 
                background: 'linear-gradient(180deg, #243b55 0%, var(--bg-body) 100%)',
                paddingTop: '60px', paddingBottom: '30px', marginTop: '-44px'
            }}>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '20px' }}>
                    本月累计收益排行 · 实时更新
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', alignItems: 'flex-end' }}>
                    {podium[0] && <TopThreeItem item={podium[0]} color="#C0C0C0" label="🥈" />}
                    {podium[1] && <TopThreeItem item={podium[1]} color="#FFD700" label="👑" />}
                    {podium[2] && <TopThreeItem item={podium[2]} color="#CD7F32" label="🥉" />}
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, paddingBottom: '70px', borderRadius: '20px 20px 0 0', overflow: 'hidden', background: 'var(--bg-body)', marginTop: '-20px' }}>
                {list.length > 0 ? (
                    list.map(item => <RankListItem key={item.userId} item={item} />)
                ) : (
                    <div style={{paddingTop: '40px'}}>
                        <Empty text="暂无更多排名数据" />
                    </div>
                )}
            </div>

            {/* My Rank Footer */}
            {myRank && (
                <div style={{ 
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: 'var(--bg-card)', 
                    borderTop: '0.5px solid var(--border-color)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    zIndex: 10,
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
                }}>
                    <RankListItem item={myRank} />
                </div>
            )}
        </div>
    );
};
