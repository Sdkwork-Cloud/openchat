
import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { Message, ChatConfig } from '../types';
import { ChatMessageItem } from './ChatMessageItem';
import { useChatStore } from '../../../services/store';
import '../../../styles/performance.css'; 
import { Platform } from '../../../platform';
import { getAgent } from '../../../services/agentRegistry';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { DateUtils } from '../../../utils/date';

interface MessageListProps {
  messages: Message[];
  config: ChatConfig;
  isStreaming: boolean;
  highlightMsgId?: string;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onMultiSelect: (message: Message) => void;
  onDelete: (id: string) => void;
  onInteract?: (action: string, payload: any) => void; 
}

const DISPLAY_TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// --- Sticky Time Divider ---
const TimeDivider: React.FC<{ timestamp: number }> = React.memo(({ timestamp }) => {
    return (
        <div style={{ 
            position: 'sticky', top: '16px', zIndex: 5, 
            textAlign: 'center', marginBottom: '24px', 
            pointerEvents: 'none',
            display: 'flex', justifyContent: 'center'
        }}>
            <span style={{ 
                fontSize: '11px', 
                color: 'var(--text-secondary)', 
                fontWeight: 500,
                backgroundColor: 'rgba(var(--bg-card-rgb), 0.65)', 
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '4px 12px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                letterSpacing: '0.5px'
            }}>
                {DateUtils.formatMessageTime(timestamp)}
            </span>
        </div>
    );
});

// --- Welcome Chips Component ---
const WelcomeChips: React.FC<{ sessionId: string, onSend: (text: string) => void }> = ({ sessionId, onSend }) => {
    const { getSession } = useChatStore();
    const session = getSession(sessionId);
    if (!session) return null;
    
    const agent = getAgent(session.agentId);
    
    // Define prompts based on agent tags/id
    let prompts = ['你好', '介绍一下你自己', '有什么新功能？'];
    
    if (agent.id === 'agent_image') {
        prompts = ['一只赛博朋克风格的猫', '未来城市，霓虹灯，雨夜', '极简风格 Logo 设计', '吉卜力风格的风景画'];
    } else if (agent.id === 'agent_coder') {
        prompts = ['写一个 React 计数器组件', '解释 Python 的装饰器', '优化这段 SQL 查询', '如何实现防抖函数？'];
    } else if (agent.id === 'agent_writer') {
        prompts = ['帮我写一份周报', '写一首关于秋天的诗', '润色这段邮件', '生成小红书文案'];
    } else if (agent.id === 'agent_english') {
        prompts = ['Let\'s talk about travel', 'Correct my grammar', 'Teach me idioms', 'Roleplay ordering food'];
    }

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '40px', opacity: 0.9 }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>你可以试着问我：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {prompts.map(p => (
                    <div 
                        key={p}
                        onClick={() => onSend(p)}
                        style={{ 
                            background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '16px',
                            fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer',
                            border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {p}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, config, isStreaming, highlightMsgId, 
    selectionMode, selectedIds, onToggleSelection,
    onReply, onForward, onMultiSelect, onDelete, onInteract
}) => {
  const { recallMessage } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Logic Control
  const isNearBottom = useRef(true); 
  const lastMessageCount = useRef(0);
  const [flashId, setFlashId] = useState<string | null>(null);

  // Use sessionId for unique scroll key
  const sessionId = messages.length > 0 ? messages[0].sessionId : 'empty';
  useScrollRestoration(`chat_${sessionId}`, containerRef);

  const handleRecall = (id: string) => {
      const msg = messages.find(m => m.id === id);
      if (msg) recallMessage(msg.sessionId, id);
  };

  const renderList = useMemo(() => {
      const result: React.ReactNode[] = [];
      let lastTime = 0;

      messages.forEach((msg, idx) => {
          if (idx === 0 || msg.createTime - lastTime > DISPLAY_TIME_THRESHOLD) {
              result.push(<TimeDivider key={`time-${msg.id}`} timestamp={msg.createTime} />);
              lastTime = msg.createTime;
          }

          const prevMsg = messages[idx - 1];
          const isGroupStart = !prevMsg || prevMsg.role !== msg.role || (msg.createTime - prevMsg.createTime > DISPLAY_TIME_THRESHOLD);

          result.push(
            <div key={msg.id} ref={el => { messageRefs.current[msg.id] = el; }} className="virtual-item">
                <ChatMessageItem 
                    message={msg} 
                    config={config} 
                    isGroupStart={isGroupStart}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(msg.id)}
                    isHighlighted={msg.id === flashId} 
                    onToggleSelection={onToggleSelection}
                    onReply={onReply}
                    onForward={onForward}
                    onMultiSelect={onMultiSelect}
                    onDelete={onDelete}
                    onRecall={handleRecall}
                    onInteract={onInteract}
                />
            </div>
          );
      });
      
      result.push(<div key="spacer" style={{ height: '24px' }} />);
      return result;
  }, [messages, config, selectionMode, selectedIds, flashId]); 

  const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      const threshold = 150;
      const isSticky = distanceFromBottom < threshold;
      isNearBottom.current = isSticky;
      
      // Show button if we are far from bottom
      const shouldShow = distanceFromBottom > 300;
      setShowScrollButton(shouldShow);
      
      // Clear unread count if we scroll to bottom
      if (isSticky) {
          setUnreadCount(0);
      }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
        setUnreadCount(0);
    }
    isNearBottom.current = true;
  };

  // Deep Linking Highlighting
  useEffect(() => {
    if (highlightMsgId && messageRefs.current[highlightMsgId]) {
        isNearBottom.current = false;
        messageRefs.current[highlightMsgId]?.scrollIntoView({ behavior: 'auto', block: 'center' });
        setFlashId(highlightMsgId);
        const timer = setTimeout(() => setFlashId(null), 2000);
        return () => clearTimeout(timer);
    } else if (messages.length > 0 && lastMessageCount.current === 0) {
        // Initial load logic
        const savedPos = sessionStorage.getItem(`scroll_pos_chat_${sessionId}`);
        if (!savedPos) {
             scrollToBottom('auto');
        } else {
             const pos = parseInt(savedPos, 10);
             if (containerRef.current) {
                 const { scrollHeight, clientHeight } = containerRef.current;
                 if (scrollHeight - pos - clientHeight < 150) {
                     isNearBottom.current = true;
                 } else {
                     isNearBottom.current = false;
                 }
             }
        }
    }
  }, [highlightMsgId, sessionId]); 

  // Auto Scroll Logic for new messages
  useLayoutEffect(() => {
    const newMsgCount = messages.length - lastMessageCount.current;
    
    if (newMsgCount > 0) {
        // If user is at bottom, keep them there
        if (isNearBottom.current && !selectionMode && !highlightMsgId) {
            scrollToBottom(isStreaming ? 'smooth' : 'auto');
        } else {
            // If user is reading history and new msg comes
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'user') {
                 // User sent it, force scroll
                 scrollToBottom('smooth');
            } else if (!isStreaming) {
                 // Incoming msg while reading history, increment unread bubble
                 setUnreadCount(prev => prev + newMsgCount);
            }
        }
    }
    
    lastMessageCount.current = messages.length;
  }, [messages, isStreaming, selectionMode]);

  const showWelcome = messages.length <= 1 && !isStreaming;

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          style={{ 
            flex: 1, overflowY: 'auto', padding: '0', 
            scrollBehavior: 'auto', // Use native smoothness or JS
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {renderList}
          
          {showWelcome && messages.length > 0 && onInteract && (
              <WelcomeChips 
                  sessionId={messages[0].sessionId} 
                  onSend={(text) => onInteract('send_text', text)} 
              />
          )}

          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>

        {/* Floating Scroll Down Button */}
        <div 
            onClick={() => {
                Platform.device.vibrate(5);
                scrollToBottom('smooth');
            }}
            style={{
                position: 'absolute', bottom: '20px', right: '16px',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'var(--bg-card)', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10,
                border: '0.5px solid var(--border-color)',
                color: 'var(--primary-color)',
                // Physics-based pop in/out
                opacity: showScrollButton && !selectionMode ? 1 : 0,
                transform: showScrollButton && !selectionMode ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                pointerEvents: showScrollButton && !selectionMode ? 'auto' : 'none'
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            
            {/* Unread Bubble */}
            {unreadCount > 0 && (
                <div style={{
                    position: 'absolute', top: -5, right: -5,
                    background: '#fa5151', color: 'white',
                    fontSize: '10px', height: '16px', minWidth: '16px',
                    borderRadius: '8px', padding: '0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, border: '2px solid var(--bg-card)',
                    animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {unreadCount}
                </div>
            )}
        </div>
    </div>
  );
};
