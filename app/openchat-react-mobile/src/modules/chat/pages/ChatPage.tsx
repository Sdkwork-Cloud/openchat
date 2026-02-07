
import React, { useEffect, useState } from 'react';
import { navigate, useQueryParams } from '../../../router';
import { useChatStore } from '../../../services/store';
import { getAgent } from '../../../services/agentRegistry';
import { ChatConfig } from '../types';
import { ChatNavbar } from '../components/ChatNavbar';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { useChatStream } from '../hooks/useChatStream';

const CHAT_UI_CONFIG: ChatConfig = {
  showUserAvatar: false,
  showModelAvatar: false, 
};

export const ChatPage: React.FC = () => {
  const query = useQueryParams();
  const sessionId = query.get('id');
  const highlightMsgId = query.get('msgId') || undefined;

  const { getSession } = useChatStore();
  const { sendMessage, isLoading } = useChatStream();
  
  // Timeout state for buffering logic
  const [isTimeout, setIsTimeout] = useState(false);

  const session = sessionId ? getSession(sessionId) : undefined;
  // Safe agent retrieval: getAgent always returns a fallback if not found
  const agent = session ? getAgent(session.agentId) : getAgent('omni_core');

  useEffect(() => {
    if (!sessionId) {
      console.warn("No Session ID provided");
    }
    
    // Reset timeout state when ID changes
    setIsTimeout(false);
    
    // Give store a moment to sync if session is missing initially
    const timer = setTimeout(() => setIsTimeout(true), 500);
    return () => clearTimeout(timer);
  }, [sessionId]);

  const handleSend = (text: string) => {
      if (session && agent) {
        sendMessage(text, session, agent);
      }
  };

  // Robust Error State UI
  if (!session) {
      // If we are still within the timeout buffer, show a loader instead of error
      // This prevents the "Invalid Session" flash during fast navigation or state sync
      if (!isTimeout) {
          return (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
                  <div style={{ width: '24px', height: '24px', border: '2px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
          );
      }

      return (
          <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'var(--bg-body)', 
              color: 'var(--text-secondary)' 
          }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤔</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>会话不存在或已失效</div>
              <button 
                  onClick={() => navigate('/')}
                  style={{ 
                      marginTop: '24px', 
                      padding: '10px 24px', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '20px', 
                      color: 'var(--primary-color)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer'
                  }}
              >
                  返回首页
              </button>
          </div>
      );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-body)' }}>
      
      <ChatNavbar 
        title={agent.name} 
        sessionId={session.id}
        onBack={() => navigate('/')} 
      />

      <MessageList 
        messages={session.messages} 
        config={CHAT_UI_CONFIG} 
        isStreaming={isLoading}
        highlightMsgId={highlightMsgId} 
      />

      <ChatInput 
        onSend={handleSend} 
        isLoading={isLoading} 
      />

    </div>
  );
};
