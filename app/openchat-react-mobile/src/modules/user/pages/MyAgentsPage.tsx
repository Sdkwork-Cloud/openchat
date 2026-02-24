
import React, { useState } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { useChatStore } from '../../../services/store';
import { Platform } from '../../../platform';
import { Toast } from '../../../components/Toast';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { AgentService, CustomAgent } from '../../agents/services/AgentService';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';

export const MyAgentsPage: React.FC = () => {
    const { createSession } = useChatStore();
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);

    // Live Query for My Agents
    // We cast the result to CustomAgent[] because 'mine' category implies custom agents which have createTime
    const { data: agents = [], viewStatus, refresh } = useLiveQuery(
        AgentService,
        () => AgentService.getAgentsByCategory('mine'),
        { deps: [] }
    );

    // Long press logic
    const timerRef = React.useRef<any>(null);

    const handleTouchStart = (agent: any) => {
        timerRef.current = setTimeout(() => {
            Platform.device.vibrate(20);
            setSelectedAgent(agent);
            setShowActionSheet(true);
        }, 600);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleAgentClick = async (agent: any) => {
        // Mock status check (In real app, check agent.status field if exists)
        if (agent.name.includes('审核中')) {
            Toast.info('该智能体正在审核中，暂无法对话');
            return;
        }
        const sessionId = await createSession(agent.id);
        await new Promise(resolve => setTimeout(resolve, 50));
        Platform.device.vibrate(5);
        navigate('/chat', { id: sessionId });
    };

    const handleDelete = async () => {
        if (selectedAgent && window.confirm(`确定删除 "${selectedAgent.name}" 吗？此操作无法撤销。`)) {
            await AgentService.deleteById(selectedAgent.id);
            setShowActionSheet(false);
            Toast.success('已删除');
        }
    };

    const handleEdit = () => {
        setShowActionSheet(false);
        Toast.info('编辑功能开发中 (Demo)');
    };

    const formatDate = (ts?: number) => {
        if (!ts) return '';
        return new Date(ts).toLocaleDateString();
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                title="我的智能体" 
                onBack={() => navigateBack('/me')}
                rightElement={
                    <div onClick={() => navigate('/creation')} style={{ fontSize: '24px', padding: '0 8px', cursor: 'pointer', fontWeight: 300 }}>+</div>
                } 
            />
            
            <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                <StateView 
                    status={viewStatus} 
                    onRetry={refresh}
                    emptyText="暂无自建智能体"
                    emptyIcon="🤖"
                    renderEmpty={() => (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🤖</div>
                            <div style={{ marginBottom: '20px' }}>暂无自建智能体</div>
                            <button onClick={() => navigate('/creation')} style={{ padding: '8px 20px', borderRadius: '16px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', background: 'transparent', cursor: 'pointer' }}>去创建</button>
                        </div>
                    )}
                >
                    {agents.map((agent: any) => (
                        <div 
                            key={agent.id}
                            onClick={() => handleAgentClick(agent)} 
                            onTouchStart={() => handleTouchStart(agent)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchEnd}
                            onMouseDown={() => handleTouchStart(agent)}
                            onMouseUp={handleTouchEnd}
                            onMouseLeave={handleTouchEnd}
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                cursor: 'pointer',
                                border: '0.5px solid var(--border-color)',
                                userSelect: 'none',
                                transition: 'background 0.2s'
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
                                        background: 'rgba(7, 193, 96, 0.1)',
                                        color: '#07c160'
                                    }}>
                                        已发布
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.description}</div>
                                {agent.createTime && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '8px' }}>创建于 {formatDate(agent.createTime)}</div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '20px', opacity: 0.7 }}>
                        共 {agents.length} 个智能体
                    </div>
                </StateView>
            </div>

            <ActionSheet visible={showActionSheet} onClose={() => setShowActionSheet(false)}>
                <div style={{ background: 'var(--bg-card)' }}>
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border-color)' }}>
                        管理: {selectedAgent?.name}
                    </div>
                    <div onClick={handleEdit} style={{ padding: '16px', textAlign: 'center', fontSize: '17px', borderBottom: '0.5px solid var(--border-color)', cursor: 'pointer' }}>
                        编辑资料
                    </div>
                    <div onClick={handleDelete} style={{ padding: '16px', textAlign: 'center', fontSize: '17px', color: '#fa5151', cursor: 'pointer' }}>
                        删除智能体
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-body)' }}></div>
                    <div onClick={() => setShowActionSheet(false)} style={{ padding: '16px', textAlign: 'center', fontSize: '17px', fontWeight: 600, cursor: 'pointer' }}>
                        取消
                    </div>
                </div>
            </ActionSheet>
        </div>
    );
};
