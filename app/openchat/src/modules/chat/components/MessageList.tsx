
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Message, ChatConfig } from '../types';
import { ChatMessageItem } from './ChatMessageItem';

interface MessageListProps {
  messages: Message[];
  config: ChatConfig;
  isStreaming: boolean;
  highlightMsgId?: string; 
}

const TIME_THRESHOLD = 2 * 60 * 1000; // 2 minutes to group messages

export const MessageList: React.FC<MessageListProps> = ({ messages, config, isStreaming, highlightMsgId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  // --- Advanced Message Grouping Algorithm ---
  const messagesWithFlags = useMemo(() => {
      return messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const nextMsg = messages[idx + 1];
          
          const isSameUserPrev = prevMsg && prevMsg.role === msg.role;
          const isSameUserNext = nextMsg && nextMsg.role === msg.role;
          const isWithinTimePrev = prevMsg && (msg.timestamp - prevMsg.timestamp < TIME_THRESHOLD);
          const isWithinTimeNext = nextMsg && (nextMsg.timestamp - msg.timestamp < TIME_THRESHOLD);

          // 1. Is Start of Group? (First msg OR Different User OR Time gap)
          const isFirst = !isSameUserPrev || !isWithinTimePrev;
          
          // 2. Is End of Group? (Last msg OR Different User OR Time gap)
          const isLast = !isSameUserNext || !isWithinTimeNext;

          return { ...msg, isFirst, isLast };
      });
  }, [messages]);

  const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      const shouldShow = distanceFromBottom > 200;
      if (shouldShow !== showScrollButton) setShowScrollButton(shouldShow);
      
      isAutoScrollEnabled.current = distanceFromBottom < 100;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (highlightMsgId && messageRefs.current[highlightMsgId]) {
        setTimeout(() => {
            messageRefs.current[highlightMsgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const el = messageRefs.current[highlightMsgId];
            if (el) {
                el.style.transition = 'background 0.5s';
                el.style.background = 'rgba(41, 121, 255, 0.15)';
                setTimeout(() => el.style.background = 'transparent', 1500);
            }
        }, 100);
    } else {
        scrollToBottom('auto');
    }
  }, [highlightMsgId]); 

  useEffect(() => {
    if (!highlightMsgId && isAutoScrollEnabled.current) {
        scrollToBottom('smooth');
    }
  }, [messages, isStreaming, highlightMsgId]);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '20px 16px', 
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {messagesWithFlags.map((msg) => (
            <div key={msg.id} ref={el => { messageRefs.current[msg.id] = el; }}>
                <ChatMessageItem 
                    message={msg} 
                    config={config} 
                    isGroupStart={msg.isFirst} 
                    isGroupEnd={msg.isLast} 
                />
            </div>
          ))}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>

        {showScrollButton && (
            <div 
                onClick={() => { scrollToBottom('smooth'); }}
                style={{
                    position: 'absolute', bottom: '20px', right: '16px',
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--bg-card)', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10,
                    animation: 'fadeInUp 0.2s ease-out',
                    border: '0.5px solid var(--border-color)',
                    color: 'var(--primary-color)'
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                {isStreaming && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', background: 'var(--danger)', borderRadius: '50%' }} />
                )}
            </div>
        )}
        <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};
