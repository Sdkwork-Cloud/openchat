
import React, { useEffect, useState, useMemo } from 'react';
import { navigateBack, navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { DistributionService, TeamMember } from '../services/DistributionService';
import { ChatService } from '../../chat/services/ChatService';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Avatar } from '../../../components/Avatar';
import { Empty } from '../../../components/Empty/Empty';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { Toast } from '../../../components/Toast';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { useChatStore } from '../../../services/store';

const RankBadge = ({ rank }: { rank: number }) => {
    let color = '';
    if (rank === 0) { color = '#FFD700'; }
    else if (rank === 1) { color = '#C0C0C0'; }
    else if (rank === 2) { color = '#CD7F32'; }
    else return null;

    return (
        <div style={{ 
            position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', 
            background: color, borderRadius: '50%', border: '1px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '10px', zIndex: 1 
        }}>
        </div>
    );
};

const MemberItem: React.FC<{ member: TeamMember, index: number, onClick: () => void }> = ({ member, index, onClick }) => {
    const isTop3 = index < 3;
    const rankColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : 'transparent'));

    return (
        <div 
            onClick={onClick}
            style={{ 
                background: 'var(--bg-card)', padding: '16px', marginBottom: '1px', 
                display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer'
            }}
        >
            <div style={{ position: 'relative' }}>
                <Avatar src={member.avatar} size={48} />
                {isTop3 && (
                    <div style={{ 
                        position: 'absolute', bottom: -2, right: -2, width: '18px', height: '18px', 
                        background: rankColor, borderRadius: '50%', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '10px', fontWeight: 700, border: '2px solid var(--bg-card)'
                    }}>
                        {index + 1}
                    </div>
                )}
            </div>
            
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {member.name} 
                        <span style={{ fontSize: '10px', marginLeft: '8px', padding: '1px 6px', borderRadius: '4px', background: member.level === 1 ? 'rgba(41,121,255,0.1)' : 'rgba(255,154,68,0.1)', color: member.level === 1 ? 'var(--primary-color)' : '#ff9a44' }}>
                            {member.level === 1 ? '一级' : '二级'}
                        </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fa5151', fontFamily: 'DIN Alternate' }}>¥{member.contribution}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{member.role}</span>
                    <span>加入: {new Date(member.joinTime).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};

const MemberDetailSheet = ({ member, onClose }: { member: TeamMember | null, onClose: () => void }) => {
    const { createSession } = useChatStore();

    if (!member) return null;

    const handleChat = async () => {
        const sessionId = await createSession('omni_core'); // Mock to generic chat for demo
        navigate('/chat', { id: sessionId });
        onClose();
    };

    const handleReward = () => {
        Toast.success(`已向 ${member.name} 发送 ¥8.88 激励红包`);
        onClose();
    };

    return (
        <ActionSheet visible={!!member} onClose={onClose} height="auto">
            <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <Avatar src={member.avatar} size={80} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#ffd700', color: 'black', fontSize: '10px', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                        TOP
                    </div>
                </div>
                
                <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>{member.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    加入时间: {new Date(member.joinTime).toLocaleString()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginBottom: '30px' }}>
                    <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>累计贡献</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fa5151' }}>¥{member.contribution}</div>
                    </div>
                    <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>本月业绩</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>¥{(member.contribution * 0.3).toFixed(0)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                    <button 
                        onClick={handleReward}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #fa5151', color: '#fa5151', background: 'transparent', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🧧 发红包激励
                    </button>
                    <button 
                        onClick={handleChat}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary-gradient)', color: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)' }}
                    >
                        💬 发消息
                    </button>
                </div>
            </div>
        </ActionSheet>
    );
};

export const MyTeamPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | '1' | '2'>('all');
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'contribution' | 'joinTime'>('contribution');
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        const level = activeTab === 'all' ? 'all' : parseInt(activeTab) as 1 | 2;
        const res = await DistributionService.getTeamMembers(level);
        if (res.success && res.data) setMembers(res.data);
    };

    const handleCreateGroup = async () => {
        if (members.length === 0) {
            Toast.info('暂无成员可建群');
            return;
        }
        if (window.confirm(`确定将当前列表的 ${members.length} 位成员拉入群聊吗？`)) {
            Toast.loading('建群中...');
            const memberIds = members.slice(0, 5).map(m => m.userId);
            const res = await ChatService.createGroupSession('核心合伙人交流群', memberIds);
            if (res.success && res.data) {
                Toast.success('建群成功');
                navigate('/chat', { id: res.data.id });
            }
        }
    };

    const filteredMembers = useMemo(() => {
        let result = members;
        
        if (searchQuery.trim()) {
            result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        result.sort((a, b) => {
            if (sortOrder === 'contribution') {
                return b.contribution - a.contribution;
            } else {
                return b.joinTime - a.joinTime;
            }
        });

        return result;
    }, [members, searchQuery, sortOrder]);

    const RightAction = (
        <div 
            onClick={handleCreateGroup}
            style={{ fontSize: '14px', color: 'var(--primary-color)', fontWeight: 600, padding: '0 12px', cursor: 'pointer' }}
        >
            一键建群
        </div>
    );

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                title={`我的团队(${filteredMembers.length})`} 
                onBack={() => navigateBack('/commerce/distribution')} 
                rightElement={RightAction}
            />
            
            <div style={{ position: 'sticky', top: 44, zIndex: 10, background: 'var(--bg-body)' }}>
                <SearchInput 
                    value={searchQuery} 
                    onChange={setSearchQuery} 
                    placeholder="搜索成员昵称" 
                    style={{ background: 'var(--bg-body)', borderBottom: 'none' }}
                />
                <Tabs 
                    items={[
                        { id: 'all', label: '全部成员' },
                        { id: '1', label: '一级直推' },
                        { id: '2', label: '二级裂变' }
                    ]}
                    activeId={activeTab}
                    onChange={(id) => setActiveTab(id as any)}
                />
                
                {/* Sort Bar */}
                <div style={{ display: 'flex', padding: '8px 16px', background: 'var(--bg-body)', justifyContent: 'flex-end', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <span 
                            onClick={() => setSortOrder('contribution')}
                            style={{ fontWeight: sortOrder === 'contribution' ? 600 : 400, color: sortOrder === 'contribution' ? 'var(--primary-color)' : 'inherit', cursor: 'pointer' }}
                        >
                            贡献排序 {sortOrder === 'contribution' && '↓'}
                        </span>
                        <span 
                            onClick={() => setSortOrder('joinTime')}
                            style={{ fontWeight: sortOrder === 'joinTime' ? 600 : 400, color: sortOrder === 'joinTime' ? 'var(--primary-color)' : 'inherit', cursor: 'pointer' }}
                        >
                            时间排序 {sortOrder === 'joinTime' && '↓'}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredMembers.length > 0 ? (
                    <div style={{ marginTop: '0' }}>
                        {filteredMembers.map((m, idx) => (
                            <MemberItem 
                                key={m.userId} 
                                member={m} 
                                index={idx} 
                                onClick={() => setSelectedMember(m)}
                            />
                        ))}
                    </div>
                ) : (
                    <Empty text="暂无团队成员" subText="快去邀请好友加入吧" />
                )}
            </div>

            <MemberDetailSheet member={selectedMember} onClose={() => setSelectedMember(null)} />
        </div>
    );
};
