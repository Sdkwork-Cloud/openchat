
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { navigateBack, useQueryParams } from '../../../router';
import { useChatStore } from '../../../services/store';
import { getAgent } from '../../../services/agentRegistry';
import { ChatConfig, Message } from '../types';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { useChatStream } from '../hooks/useChatStream';
import { useChatSelection } from '../hooks/useChatSelection';
import { SettingsService } from '../../settings/services/SettingsService';
import { Page } from '../../../components/Page/Page';
import { Icon } from '../../../components/Icon/Icon';
import { navigate } from '../../../router';
import { ChatSelectionBar } from '../components/ChatSelectionBar';

export const ChatPage: React.FC = () => {
    const query = useQueryParams();
    const sessionId = query.get('id');
    const { getSession, markSessionRead } = useChatStore(); 
    const { sendMessage, isLoading } = useChatStream();
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const {
        selectionMode,
        selectedIds,
        toggleSelection,
        enterSelectionMode,
        exitSelectionMode,
        deleteSelected,
        forwardSelected
    } = useChatSelection(sessionId || undefined);
    
    const [bgImage, setBgImage] = useState<string>('');
    const session = sessionId ? getSession(sessionId) : undefined;
    const agent = session ? getAgent(session.agentId) : getAgent('omni_core');

    useEffect(() => {
        const loadBg = async () => {
            if (session?.sessionConfig?.backgroundImage) {
                setBgImage(session.sessionConfig.backgroundImage);
            } else {
                const { data } = await SettingsService.getConfig();
                setBgImage(data?.chatBackground || '');
            }
        };
        loadBg();
    }, [session]);

    useEffect(() => {
        if (sessionId && session?.unreadCount > 0) markSessionRead(sessionId);
    }, [sessionId, session?.unreadCount]);

    const handleSend = useCallback(async (text: string, replyMessage?: Message, imageFile?: File) => {
        if (!session || !agent) return;
        // ... 处理图片逻辑保持不变 ...
        sendMessage(text, session, agent, replyMessage ? { id: replyMessage.id, name: replyMessage.role === 'user' ? 'Me' : agent.name, content: replyMessage.content } : undefined);
        setReplyTo(null);
    }, [session, agent, sendMessage]);

    const RightNav = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {selectionMode ? (
                <div onClick={exitSelectionMode} style={{ padding: '0 12px', cursor: 'pointer', fontSize: '15px' }}>
                    取消
                </div>
            ) : (
                <div onClick={() => navigate('/chat/details', { id: session?.id || '' })} style={{ padding: '0 12px', cursor: 'pointer' }}>
                    <Icon name="more" size={24} />
                </div>
            )}
        </div>
    );

    return (
        <Page
            title={session?.groupName || agent.name}
            rightElement={RightNav}
            noPadding
            background={bgImage ? 'none' : 'var(--bg-body)'}
            style={{ 
                backgroundImage: bgImage || 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {bgImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', zIndex: 0 }} />}
            
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
                <MessageList 
                    messages={session?.messages || []} 
                    config={{ showUserAvatar: session?.sessionConfig?.showAvatar ?? false, showModelAvatar: true }} 
                    isStreaming={isLoading}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onToggleSelection={toggleSelection}
                    onReply={setReplyTo}
                    onForward={(msg) => {
                        sessionStorage.setItem('forward_content', `[转发] 聊天记录\n${msg.content}`);
                        navigate('/contacts?mode=select&action=forward');
                    }}
                    onMultiSelect={(msg) => enterSelectionMode(msg.id)}
                    onDelete={(id) => {
                        if (window.confirm('确认删除该消息?')) {
                            // ChatService.deleteMessages(session.id, [id]);
                        }
                    }}
                    onInteract={(action, payload) => action === 'send_text' && handleSend(payload)}
                />
                
                {selectionMode ? (
                    <ChatSelectionBar 
                        selectedCount={selectedIds.size} 
                        onDelete={deleteSelected} 
                        onForward={forwardSelected} 
                    />
                ) : (
                    <ChatInput 
                        onSend={(text) => handleSend(text, replyTo || undefined)} 
                        isLoading={isLoading} 
                        replyMessage={replyTo} 
                        onCancelReply={() => setReplyTo(null)} 
                    />
                )}
            </div>
        </Page>
    );
};
