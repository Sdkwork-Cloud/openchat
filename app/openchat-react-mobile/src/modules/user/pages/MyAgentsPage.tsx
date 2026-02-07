
import React from 'react';
import { navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { useChatStore } from '../../../services/store';
import { Platform } from '../../../platform';

// Data strictly matching the IDs registered in agentRegistry.ts
const MY_AGENTS = [
    {
        id: 'custom_1',
        name: '我的私人助理',
        description: '处理日常杂务，安排日程',
        avatar: '🤖',
        status: '已发布',
        date: '2023-10-01'
    },
    {
        id: 'custom_2',
        name: '英语口语搭子',
        description: '雅思口语模拟练习',
        avatar: '🗣️',
        status: '私有',
        date: '2023-11-15'
    },
    {
        id: 'custom_3',
        name: 'Python 脚本生成器',
        description: '快速生成自动化脚本',
        avatar: '🐍',
        status: '审核中',
        date: '2023-12-20'
    }
];

export const MyAgentsPage: React.FC = () => {
    const { createSession } = useChatStore();

    const handleAgentClick = async (agentId: string) => {
        // Create a real session via the store logic
        const sessionId = await createSession(agentId);
        
        // Small buffer to ensure React State has propagated through Context
        // This mitigates the race condition where navigation happens before Store update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        Platform.device.vibrate(5);
        navigate('/chat', { id: sessionId });
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                title="我的智能体" 
                onBack={() => navigate('/me')}
                rightElement={
                    <div onClick={() => navigate('/creation')} style={{ fontSize: '24px', padding: '0 8px', cursor: 'pointer', fontWeight: 300 }}>+</div>
                } 
            />
            
            <div style={{ flex: 1, padding: '12px' }}>
                {MY_AGENTS.map(agent => (
                    <div 
                        key={agent.id}
                        onClick={() => handleAgentClick(agent.id)} 
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            border: '0.5px solid var(--border-color)'
                        }}
                    >
                        <div style={{ 
                            width: '50px', height: '50px', borderRadius: '10px', 
                            background: 'var(--bg-cell-top)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px', marginRight: '16px', flexShrink: 0
                        }}>
                            {agent.avatar}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{agent.name}</div>
                                <div style={{ 
                                    fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                                    background: agent.status === '已发布' ? 'rgba(7, 193, 96, 0.1)' : 'rgba(0,0,0,0.05)',
                                    color: agent.status === '已发布' ? '#07c160' : 'var(--text-secondary)'
                                }}>
                                    {agent.status}
                                </div>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.description}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '8px' }}>创建于 {agent.date}</div>
                        </div>
                    </div>
                ))}
                
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '20px', opacity: 0.7 }}>
                    共 {MY_AGENTS.length} 个智能体
                </div>
            </div>
        </div>
    );
};
