/**
 * IM 聊天页面 - 支持通话功能
 * 
 * 职责：
 * 1. 渲染聊天界面
 * 2. 协调组件交互
 * 3. 调用 IM Service 处理业务
 * 4. 管理通话状态和显示 CallModal
 * 
 * 架构路径：ChatPage → imService → repository → API/Platform
 */

import { useState, useRef, useCallback } from 'react';
import type { RichTextEditorRef } from '../../../components/ui/RichTextEditor';
import type { MediaItem } from '../../../components/ui/MediaViewer';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { useRTC } from '../../rtc/hooks/useRTC';
import { ConversationList } from '../components/ConversationList';
import { ChatHeader } from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { EmptyChat } from '../components/EmptyChat';
import { CallModal } from '../../rtc/components/CallModal';
import type { CallType } from '../../rtc/entities/rtc.entity';

/**
 * AI聊天页面
 */
export function ChatPage() {
  const [selectedId, setSelectedId] = useState<string | null>('1');
  const editorRef = useRef<RichTextEditorRef>(null);
  
  const { conversations, selectedConversation } = useConversations(selectedId);
  const { messages, sendMessage, isTyping } = useMessages(selectedId);
  
  // RTC 通话功能
  const {
    session,
    localStream,
    remoteStream,
    isInCall,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useRTC();

  // 处理发送消息（支持多媒体附件）
  const handleSendMessage = useCallback((content: string, attachments?: MediaItem[]) => {
    if (content.trim() || (attachments && attachments.length > 0)) {
      sendMessage(content, undefined, attachments);
      editorRef.current?.clear();
    }
  }, [sendMessage]);

  // 处理发起通话
  const handleCall = useCallback((callType: CallType) => {
    if (!selectedConversation) return;
    
    initiateCall(
      selectedConversation.id,
      selectedConversation.name,
      selectedConversation.avatar,
      callType
    );
  }, [selectedConversation, initiateCall]);

  return (
    <>
      {/* 左侧会话列表 */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* 右侧对话区域 */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
        {selectedConversation ? (
          <>
            <ChatHeader 
              conversation={selectedConversation} 
              onCall={handleCall}
            />
            <MessageList messages={messages} isTyping={isTyping} />
            <ChatInput
              editorRef={editorRef}
              onSend={handleSendMessage}
            />
          </>
        ) : (
          <EmptyChat />
        )}
      </div>

      {/* 通话弹窗 */}
      <CallModal
        session={session}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptCall}
        onReject={rejectCall}
        onHangup={hangup}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleSpeaker={toggleSpeaker}
      />
    </>
  );
}

export default ChatPage;
