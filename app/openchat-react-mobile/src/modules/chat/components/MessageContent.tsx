
import React, { useMemo } from 'react';
import { Message } from '../types';
import { StreamMarkdown } from '../../../utils/markdown';
import { VoiceBubble, ImageBubble, LocationBubble, RedPacketBubble, FileBubble, ProductSwiper } from './bubbles';
import { ImageViewer } from '../../../components/ImageViewer/ImageViewer';
import { parseMessage } from '../utils/messageParser';

interface MessageContentProps {
  message: Message;
  isUser: boolean;
  onInteract?: (action: string, payload: any) => void;
}

// --- Thinking Animation Component ---
const ThinkingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px', paddingLeft: '4px' }}>
        <div className="thinking-dot" style={{ animationDelay: '0s' }} />
        <div className="thinking-dot" style={{ animationDelay: '0.2s' }} />
        <div className="thinking-dot" style={{ animationDelay: '0.4s' }} />
        <style>{`
            .thinking-dot {
                width: 6px; height: 6px; background: var(--text-secondary);
                border-radius: 50%; opacity: 0.6;
                animation: typing 1.4s infinite ease-in-out both;
            }
            @keyframes typing {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
        `}</style>
    </div>
);

export const MessageContent: React.FC<MessageContentProps> = React.memo(({ message, isUser, onInteract }) => {
  const rawContent = message.content || '';

  // Parse content using the utility
  const parsed = useMemo(() => parseMessage(rawContent), [rawContent]);

  const handleImageClick = (url: string) => {
      ImageViewer.show(url);
  };

  // 0. AI Thinking State (Natural & Premium)
  if (!isUser && message.isStreaming && (rawContent === 'Thinking...' || rawContent.length === 0)) {
      return <ThinkingIndicator />;
  }

  // 1. Switch on Parsed Type
  switch (parsed.type) {
      case 'location':
          return <LocationBubble label={parsed.content} />;
          
      case 'redPacket':
          return <RedPacketBubble text={parsed.content} />;
          
      case 'file':
          return <FileBubble name={parsed.content} size={parsed.meta?.size} type={parsed.meta?.ext} />;
          
      case 'voice':
          return <VoiceBubble duration={parsed.meta?.duration} isUser={isUser} />;
          
      case 'image':
          return <ImageBubble isUser={isUser} content={parsed.content} />;
          
      case 'product':
          const products = parsed.meta ? (Array.isArray(parsed.meta) ? parsed.meta : [parsed.meta]) : [];
          return (
              <div style={{ 
                  display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, 
                  marginTop: '4px'
              }}>
                  {parsed.content.length > 0 && (
                      <div style={{ 
                          padding: '0 0 12px 0', 
                          fontSize: '15px', lineHeight: '1.6', 
                          color: 'var(--text-primary)',
                          wordBreak: 'break-word'
                      }}>
                          <StreamMarkdown content={parsed.content} onImageClick={handleImageClick} />
                      </div>
                  )}

                  <div style={{ width: '100%', position: 'relative' }}>
                      {products.length > 0 ? (
                          <ProductSwiper items={products} onInteract={onInteract} />
                      ) : (
                          message.isStreaming && (
                              <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                  <div className="spinner-border" style={{width:'14px', height:'14px', borderWidth:'2px'}} />
                                  正在生成推荐卡片...
                              </div>
                          )
                      )}
                  </div>
              </div>
          );

      case 'text':
      default:
          return isUser ? (
              <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  overflowWrap: 'anywhere', 
                  wordBreak: 'break-word',
                  lineHeight: '1.6'
              }}>
                  {parsed.content}
              </div>
          ) : (
              <>
                  <StreamMarkdown content={parsed.content} onImageClick={handleImageClick} />
                  {message.isStreaming && <span className="cursor-blink" />}
              </>
          );
  }
});
