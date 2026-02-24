
import React, { useState } from 'react';
import { navigate, navigateBack, useQueryParams } from '../../../router';
import { useChatStore } from '../../../services/store';
import { getAgent } from '../../../services/agentRegistry';
import { ChatService } from '../services/ChatService';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell, CellGroup } from '../../../components/Cell';
import { Toast } from '../../../components/Toast';
import { Switch } from '../../../components/Switch/Switch';
import { AvatarGrid } from '../components/ChatDetail/AvatarGrid';

export const ChatDetailsPage: React.FC = () => {
    const query = useQueryParams();
    const sessionId = query.get('id');
    const { getSession, deleteSession, togglePin, toggleMute, clearSessionMessages, updateSessionConfig } = useChatStore();
    
    // Force refresh state for immediate UI updates that might be async
    const [_, forceUpdate] = useState(0);

    const session = getSession(sessionId || '');
    // Logic: If group, use group info. If agent, use agent info.
    const isGroup = session?.type === 'group';
    const agent = session && !isGroup ? getAgent(session.agentId) : null;
    
    const displayAvatar = isGroup ? '👥' : (agent?.avatar || '🤖');
    const displayName = isGroup ? (session.groupName || '群聊') : (agent?.name || 'Unknown');
    
    // Local state for optimistic UI (optional, but store is fast enough usually)
    
    if (!session) return null;

    const handlePin = async (val: boolean) => {
        await togglePin(session.id);
        Toast.success(val ? '已置顶' : '已取消置顶');
    };

    const handleMute = async (val: boolean) => {
        await toggleMute(session.id);
        Toast.success(val ? '已开启免打扰' : '已关闭免打扰');
    };

    const handleAvatarToggle = async (val: boolean) => {
        await updateSessionConfig(session.id, { showAvatar: val });
        forceUpdate(prev => prev + 1);
    };

    const handleClearHistory = async () => {
        if (window.confirm('确定清空聊天记录吗？')) {
            await clearSessionMessages(session.id);
            Toast.success('已清空');
        }
    };
    
    const handleDeleteSession = async () => {
        if (window.confirm('删除后，将清空该聊天的所有记录')) {
            await deleteSession(session.id);
            navigate('/');
        }
    };

    const handleAddMember = async () => {
        if (!isGroup) {
            Toast.info('暂不支持创建新群聊 (Demo)');
        } else {
            await ChatService.addMembers(session.id, ['mock_user_2']);
            Toast.success('模拟添加成员成功');
            forceUpdate(p => p + 1);
        }
    };

    const handleRemoveMember = async () => {
        Toast.info('移除成员功能 (Demo)');
    };

    const handleEditName = async () => {
        if (!isGroup) return;
        const newName = prompt('修改群名称', session.groupName);
        if (newName && newName !== session.groupName) {
            await ChatService.updateGroupInfo(session.id, { groupName: newName });
            forceUpdate(p => p + 1);
        }
    };

    const handleShare = () => {
        navigate('/profile/qrcode', { type: 'group', id: session.id, name: displayName });
    };

    const handleShareContact = () => {
        Toast.success('推荐卡片已发送');
    };

    const handleMyAlias = () => {
        const alias = prompt('设置我在本群的昵称', 'AI User');
        if (alias) {
            Toast.success('昵称已修改');
        }
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', paddingBottom: '40px' }}>
            <Navbar title={isGroup ? `聊天信息(${session.memberIds?.length || 1})` : '聊天详情'} backFallback={`/chat?id=${sessionId}`} />
            
            {/* 1. Member Grid */}
            <div style={{ marginTop: '1px' }}>
                <AvatarGrid 
                    memberIds={session.memberIds || []} 
                    agentAvatar={displayAvatar} 
                    agentName={displayName}
                    isGroup={isGroup}
                    onAdd={handleAddMember}
                    onRemove={isGroup ? handleRemoveMember : undefined}
                />
            </div>

            {/* 2. Group Info / Contact Info */}
            {isGroup ? (
                <CellGroup>
                    <Cell title="群聊名称" value={session.groupName} isLink onClick={handleEditName} />
                    <Cell title="群二维码" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z"/></svg>} isLink onClick={handleShare} />
                    <Cell title="群公告" value={session.groupAnnouncement || '未设置'} isLink onClick={() => Toast.info('公告编辑')} />
                    <Cell title="我在本群的昵称" value="AI User" isLink onClick={handleMyAlias} />
                </CellGroup>
            ) : (
                <CellGroup>
                    <Cell title="推荐给朋友" isLink onClick={handleShareContact} />
                </CellGroup>
            )}

            {/* 3. Content Navigation */}
            <CellGroup>
                <Cell 
                    title="查找聊天内容" 
                    isLink 
                    onClick={() => navigate('/search', { sessionId: session.id })} 
                />
                <Cell 
                    title="图片、视频和文件" 
                    isLink 
                    onClick={() => navigate('/chat/files', { sessionId: session.id })} 
                />
            </CellGroup>

            {/* 4. Chat Settings */}
            <CellGroup>
                <Cell 
                    title="消息免打扰" 
                    value={<Switch checked={!!session.isMuted} onChange={handleMute} />} 
                />
                <Cell 
                    title="置顶聊天" 
                    value={<Switch checked={!!session.isPinned} onChange={handlePin} />} 
                />
                <Cell 
                    title="强提醒" 
                    value={<Switch checked={false} onChange={() => Toast.info('强提醒已开启 (Demo)')} />} 
                />
            </CellGroup>

            {/* 5. Customization */}
            <CellGroup>
                <Cell 
                    title="设置当前聊天背景" 
                    value={session.sessionConfig?.backgroundImage ? '已设置' : ''}
                    isLink 
                    // Pass sessionId to background page to enable context-specific setting
                    onClick={() => navigate(`/settings/background?sessionId=${session.id}`)}
                />
                {!isGroup && (
                    <Cell 
                        title="显示角色头像" 
                        value={<Switch checked={!!session.sessionConfig?.showAvatar} onChange={handleAvatarToggle} />} 
                    />
                )}
            </CellGroup>

            {/* 6. Actions */}
            <CellGroup>
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
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                >
                    {isGroup ? '删除并退出' : '删除聊天'}
                </button>
            </div>
        </div>
    );
};
