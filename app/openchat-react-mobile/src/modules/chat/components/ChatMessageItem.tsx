
import React, { useState, useRef } from 'react';
import { StreamMarkdown } from '../../../utils/markdown';
import { Message, ChatConfig } from '../types';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';
import { VoiceBubble, ImageBubble, LocationBubble, RedPacketBubble } from './bubbles';

interface ChatMessageItemProps {
  message: Message;
  config: ChatConfig;
  isGroupStart?: boolean; 
  isGroupEnd?: boolean;
}

// SVG Tail Component - Perfect curve match
const BubbleTail = ({ isUser, color }: { isUser: boolean, color: string }) => (
    <div style={{
        position: 'absolute',
        top: '0',
        [isUser ? 'right' : 'left']: '-6px',
        width: '6px',
        height: '16px',
        overflow: 'hidden',
        zIndex: 1,
        pointerEvents: 'none'
    }}>
        <svg viewBox="0 0 6 16" width="6" height="16" style={{ display: 'block', transform: isUser ? 'none' : 'scaleX(-1)' }}>
            <path d="M0 16 C0 10 3 4 6 0 L6 16 Z" fill={color} />
        </svg>
    </div>
);

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({ 
    message, 
    config, 
    isGroupStart = true,
    isGroupEnd = true
}) => {
  const isUser = message.role === 'user';
  const showAvatar = isGroupStart && (isUser ? config.showUserAvatar : config.showModelAvatar);
  const useFullWidth = !isUser && !config.showModelAvatar; // For pure text bots if avatar hidden

  const [showMenu, setShowMenu] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const longPressTimer = useRef<any>(null);

  // --- Interaction Handlers ---
  const handleTouchStart = () => {
      setIsActive(true);
      longPressTimer.current = setTimeout(() => {
          setIsActive(false); 
          Platform.device.vibrate(15);
          setShowMenu(true);
      }, 500);
  };

  const handleTouchEnd = () => {
      setIsActive(false);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleAction = async (action: string) => {
      setShowMenu(false);
      if (action === 'copy') {
          await Platform.clipboard.write(message.content);
          Toast.success('已复制');
      } else if (action === 'delete') {
          Toast.success('已删除');
      }
  };

  // --- Content Parsing ---
  const renderContent = () => {
      const c = message.content;
      if (c.startsWith('🎤 [语音消息')) {
          const duration = c.match(/(\d+")/)?.[0] || '3"';
          return <VoiceBubble duration={duration} isUser={isUser} />;
      }
      if (c.startsWith('📷 [图片]') || c.startsWith('🖼️ [图片]')) return <ImageBubble isUser={isUser} />;
      if (c.startsWith('📍 [位置]')) return <LocationBubble label={c.replace('📍 [位置]', '').trim()} />;
      if (c.startsWith('🧧 [红包]')) return <RedPacketBubble text={c.replace('🧧 [红包]', '').trim()} />;

      return isUser ? <>{message.content}</> : <StreamMarkdown content={message.content} />;
  };

  const isRichMedia = message.content.startsWith('📷') || message.content.startsWith('🖼️') || message.content.startsWith('📍') || message.content.startsWith('🧧');

  // --- Style Logic ---
  const bubbleColor = isUser ? 'var(--bubble-me)' : 'var(--bubble-other)';
  const textColor = isUser ? 'var(--bubble-me-text)' : 'var(--text-primary)';
  
  // Radius Calculation for Grouping
  // R = Large Radius (16px), r = Small Radius (3px)
  // User (Right): TopRight is 'r' if NOT group start. BottomRight is 'r' if NOT group end.
  // Model (Left): TopLeft is 'r' if NOT group start. BottomLeft is 'r' if NOT group end.
  const R = '16px';
  const r = '4px';
  
  let borderRadius;
  if (isRichMedia) {
      borderRadius = '12px';
  } else if (isUser) {
      borderRadius = `16px ${isGroupStart ? '2px' : r} ${isGroupEnd ? '16px' : r} 16px`;
  } else {
      borderRadius = `${isGroupStart ? '2px' : r} 16px 16px ${isGroupEnd ? '16px' : r}`;
  }

  // Only show tail on the FIRST message of a group, and not for rich media
  const showTail = isGroupStart && !isRichMedia;

  return (
    <div 
      className="message-item-enter"
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : (useFullWidth ? 'stretch' : 'flex-start'),
        marginBottom: isGroupEnd ? '16px' : '3px', // Tight spacing within groups
        width: '100%',
        position: 'relative',
        opacity: 0, 
        animation: 'msgSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      {/* Context Menu */}
      {showMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
            <div style={{
                position: 'absolute', top: '-45px', [isUser ? 'right' : 'left']: '0',
                background: 'rgba(30, 30, 30, 0.9)', backdropFilter: 'blur(10px)',
                borderRadius: '8px', padding: '0 4px', display: 'flex', alignItems: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)', zIndex: 999,
                animation: 'popIn 0.15s ease-out', color: 'white'
            }}>
                <div onClick={() => handleAction('copy')} style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 500 }}>复制</div>
                <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />
                <div onClick={() => handleAction('delete')} style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 500 }}>删除</div>
                
                <div style={{
                    position: 'absolute', bottom: '-5px', [isUser ? 'right' : 'left']: '15px',
                    width: '10px', height: '10px', background: 'rgba(30, 30, 30, 0.9)',
                    transform: 'rotate(45deg)', zIndex: -1
                }} />
            </div>
          </>
      )}

      <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
          onMouseDown={handleTouchStart} 
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          style={{ 
              display: 'flex', 
              flexDirection: isUser ? 'row-reverse' : 'row',
              maxWidth: '100%',
          }}
      >
          {/* Avatar Placeholder: Always takes space for alignment, but invisible if not group start */}
          <div style={{ 
              width: '38px', height: '38px', 
              marginRight: isUser ? 0 : '10px', marginLeft: isUser ? '10px' : 0,
              flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              visibility: showAvatar ? 'visible' : 'hidden'
          }}>
              <div style={{ 
                width: '100%', height: '100%', borderRadius: '6px', 
                background: isUser ? '#e0e0e0' : 'var(--primary-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {isUser ? '👤' : '🧠'}
              </div>
          </div>

          {/* Bubble Wrapper */}
          <div style={{
            maxWidth: useFullWidth ? 'calc(100% - 48px)' : '80%',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start'
          }}>
            {showTail && <BubbleTail isUser={isUser} color={bubbleColor} />}

            <div style={{
                padding: isRichMedia ? '0' : '11px 15px',
                borderRadius: borderRadius,
                backgroundColor: isRichMedia ? 'transparent' : bubbleColor,
                color: textColor,
                fontSize: '16px', lineHeight: '1.6', letterSpacing: '0.3px',
                position: 'relative', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'normal',
                boxShadow: isRichMedia ? 'none' : '0 1px 1px rgba(0,0,0,0.03)', 
                filter: isActive ? 'brightness(0.92)' : 'none',
                transform: isActive ? 'scale(0.99)' : 'scale(1)',
                transition: 'filter 0.15s, transform 0.1s',
            }}>
                {renderContent()}
                
                {message.isStreaming && (
                    <span className="cursor-blink" style={{ display: 'inline-block', width: '2px', height: '18px', background: 'currentColor', marginLeft: '2px', verticalAlign: 'text-bottom' }} />
                )}
            </div>
          </div>
      </div>
    </div>
  );
});
