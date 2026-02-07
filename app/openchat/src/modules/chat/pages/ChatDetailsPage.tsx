
import React from 'react';
import { navigate, navigateBack, useQueryParams } from '../../../router';
import { useChatStore } from '../../../services/store';
import { getAgent } from '../../../services/agentRegistry';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell, CellGroup } from '../../../components/Cell';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';

const AvatarGrid = ({ avatar, name }: { avatar: React.ReactNode, name: string }) => (
    <div style={{ padding: '20px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '20px' }}>
             <div style={{ 
                width: '56px', height: '56px', borderRadius: '6px', 
                background: 'var(--bg-cell-active)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                marginBottom: '6px'
             }}>
                 {avatar}
             </div>
             <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '60px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <div style={{ 
                width: '56px', height: '56px', borderRadius: '6px', 
                border: '1px dashed var(--border-color)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                marginBottom: '6px'
             }}>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </div>
             <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>添加</span>
        </div>
    </div>
);

const Switch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
    <div 
        onClick={() => {
            Platform.device.vibrate(5);
            onChange(!checked);
        }}
        style={{
            width: '50px',
            height: '30px',
            borderRadius: '15px',
            background: checked ? 'var(--primary-color)' : 'var(--border-color)',
            position: 'relative',
            transition: 'background 0.3s',
            cursor: 'pointer'
        }}
    >
        <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            transition: 'left 0.3s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
    </div>
);

export const ChatDetailsPage: React.FC = () => {
    const query = useQueryParams();
    const sessionId = query.get('id');
    const { getSession, deleteSession, togglePin, clearSessionMessages } = useChatStore();
    
    const session = getSession(sessionId || '');
    const agent = session ? getAgent(session.agentId) : null;
    
    const [isMuted, setIsMuted] = React.useState(false);

    if (!session || !agent) return null;

    const handlePin = async (val: boolean) => {
        await togglePin(session.id);
        Toast.success(val ? '已置顶' : '已取消置顶');
    };

    const handleClearHistory = async () => {
        if (window.confirm('确定清空聊天记录吗？')) {
            await clearSessionMessages(session.id);
            Toast.success('已清空');
            setTimeout(() => navigateBack(), 300);
        }
    };
    
    const handleDeleteSession = async () => {
        if (window.confirm('删除后，将清空该聊天的所有记录')) {
            await deleteSession(session.id);
            navigate('/');
        }
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
            <Navbar title="聊天详情" backFallback={`/chat?id=${sessionId}`} />
            
            <AvatarGrid avatar={agent.avatar} name={agent.name} />

            <CellGroup>
                <Cell title="查找聊天记录" isLink onClick={() => navigate('/search')} />
            </CellGroup>

            <CellGroup>
                <Cell 
                    title="置顶聊天" 
                    value={<Switch checked={!!session.isPinned} onChange={handlePin} />} 
                />
                <Cell 
                    title="消息免打扰" 
                    value={<Switch checked={isMuted} onChange={setIsMuted} />} 
                />
            </CellGroup>

            <CellGroup>
                <Cell 
                    title="设置当前聊天背景" 
                    isLink 
                    onClick={() => navigate('/general', { title: '选择背景', mode: 'background' })}
                />
                <Cell title="清空聊天记录" isLink onClick={handleClearHistory} />
                <Cell title="投诉" isLink onClick={() => navigate('/general', { title: '投诉' })} />
            </CellGroup>
            
            <div style={{ padding: '24px 16px' }}>
                <button
                    onClick={handleDeleteSession}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'var(--bg-card)',
                        color: 'var(--danger)',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    删除聊天
                </button>
            </div>
        </div>
    );
};
