
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Message, ChatConfig } from '../types';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';
import { MessageContent } from './MessageContent';
import { ChatContextMenu } from './ChatContextMenu';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { useLongPress } from '../../../hooks/useLongPress';
import { Avatar } from '../../../components/Avatar';
import { Haptic } from '../../../utils/haptic'; // New Haptic Util

interface ChatMessageItemProps {
  message: Message;
  config: ChatConfig;
  isGroupStart: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  isHighlighted?: boolean; 
  onToggleSelection: (id: string) => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onMultiSelect: (message: Message) => void;
  onDelete: (id: string) => void;
  onRecall?: (id: string) => void;
  onInteract?: (action: string, payload: any) => void;
}

const AVATAR_SIZE = 36;
const REPLY_TRIGGER_DIST = 60; // Pixels to trigger reply

// --- Bubble Tail Component ---
const BubbleTail: React.FC<{ isUser: boolean; color: string }> = React.memo(({ isUser, color }) => (
    <svg 
        width="8" height="12" viewBox="0 0 8 12" 
        style={{
            position: 'absolute',
            [isUser ? 'right' : 'left']: -6,
            bottom: 0, // Align to bottom
            zIndex: 0,
            transform: isUser ? 'scaleX(1)' : 'scaleX(-1)', // Flip for left side
            fill: color
        }}
    >
        {/* Refined Tail Path for "Apple-like" feel */}
        <path d="M0 0 C 2 0 6 8 8 12 L 0 12 L 0 0" />
    </svg>
));

const LoadingSpinner = () => (
    <div style={{
        width: '14px', height: '14px', marginRight: '8px',
        border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--text-secondary)',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite'
    }} />
);

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({ 
    message, 
    config, 
    selectionMode,
    isSelected,
    isHighlighted,
    onToggleSelection,
    onReply,
    onForward,
    onMultiSelect,
    onDelete,
    onRecall,
    onInteract
}) => {
  if (message.role === 'system') {
      return (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0', padding: '0 20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8, padding: '4px 10px', borderRadius: '4px' }}>
                  {message.content}
              </div>
          </div>
      );
  }

  const isUser = message.role === 'user';
  const showAvatar = isUser ? config.showUserAvatar : config.showModelAvatar;
  const isSending = message.status === 'sending';
  const isError = message.status === 'error';
  
  // Interaction State
  const [isPressed, setIsPressed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [liked, setLiked] = useState(false); // Local double-tap like state
  const bubbleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  
  // Direct DOM Manipulation Refs (No State for 60FPS)
  const swipeRef = useRef({ 
      startX: 0, 
      startY: 0, 
      currentX: 0, 
      isSwiping: false, 
      locked: false 
  });

  // --- Interaction Logic ---
  
  const handleSingleClick = (e: React.TouchEvent | React.MouseEvent) => {
      if (selectionMode) {
          onToggleSelection(message.id);
      }
  };

  const handleDoubleTap = (e: React.TouchEvent | React.MouseEvent) => {
      if (selectionMode) return;
      Haptic.medium(); // Medium feedback for like
      setLiked(prev => !prev); // Toggle quick like
      
      // Trigger heart animation logic handled in render
  };

  const longPressHandlers = useLongPress({
      onLongPress: () => {
          if (selectionMode || swipeRef.current.isSwiping) return;
          setIsPressed(false);
          setShowMenu(true);
          Haptic.heavy(); // Heavy feedback for menu
      },
      onClick: (e) => {
          const now = Date.now();
          if (now - lastTapRef.current < 300) {
              handleDoubleTap(e);
          } else {
              handleSingleClick(e);
          }
          lastTapRef.current = now;
      },
      delay: 500
  });

  const isRichMedia = useMemo(() => {
      const c = message.content;
      return c.startsWith('📷') || c.startsWith('🖼️') || c.includes('[商品]') || c.startsWith('🧧') || c.startsWith('📍') || c.startsWith('📂');
  }, [message.content]);

  // CSS Variables for Tail Color matching
  const bubbleBgVar = isUser ? 'var(--bubble-me)' : 'var(--bg-card)'; 
  const finalBg = isRichMedia ? 'transparent' : bubbleBgVar;
  const textColor = isUser ? 'var(--bubble-me-text)' : 'var(--text-primary)';
  
  // Tail visibility logic: Only show for simple text/voice bubbles
  const showTail = !isRichMedia && finalBg !== 'transparent';
  
  const borderRadius = '12px';
  const canRecall = isUser && (Date.now() - message.createTime < 2 * 60 * 1000);

  // --- Optimized Swipe Handlers ---

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
      if (selectionMode) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      swipeRef.current.startX = clientX;
      swipeRef.current.startY = clientY;
      swipeRef.current.currentX = 0;
      swipeRef.current.isSwiping = false;
      swipeRef.current.locked = false;

      // Remove transition for direct control
      if (contentRef.current) {
          contentRef.current.style.transition = 'none';
      }
      
      setIsPressed(true);
      longPressHandlers.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (selectionMode || swipeRef.current.locked) return;
      longPressHandlers.onTouchMove(e);

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      const deltaX = clientX - swipeRef.current.startX;
      const deltaY = clientY - swipeRef.current.startY;

      // Vertical scroll check (Lock out swipe if mostly vertical)
      if (!swipeRef.current.isSwiping) {
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
              swipeRef.current.locked = true;
              return;
          }
          if (Math.abs(deltaX) > 10) {
              swipeRef.current.isSwiping = true;
              setIsPressed(false); // Cancel press effect
          }
      }

      if (swipeRef.current.isSwiping && deltaX > 0) {
          // Resistance
          const damp = deltaX > REPLY_TRIGGER_DIST 
            ? REPLY_TRIGGER_DIST + (deltaX - REPLY_TRIGGER_DIST) * 0.3 
            : deltaX;
          
          swipeRef.current.currentX = damp;

          // Direct DOM Update
          if (contentRef.current) {
              contentRef.current.style.transform = `translateX(${damp}px)`;
          }

          // Visual Feedback for Icon opacity (Optional: can also be direct DOM)
          const icon = document.getElementById(`reply-icon-${message.id}`);
          if (icon) {
              icon.style.opacity = String(Math.min(damp / REPLY_TRIGGER_DIST, 1));
              icon.style.transform = `scale(${Math.min(damp / REPLY_TRIGGER_DIST, 1.2)})`;
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
      setIsPressed(false);
      longPressHandlers.onTouchEnd(e);

      if (swipeRef.current.isSwiping) {
          if (swipeRef.current.currentX > REPLY_TRIGGER_DIST) {
              Haptic.light();
              onReply(message);
          }
          
          // Spring back
          if (contentRef.current) {
              contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
              contentRef.current.style.transform = 'translateX(0px)';
          }
          
          const icon = document.getElementById(`reply-icon-${message.id}`);
          if (icon) {
              icon.style.transition = 'opacity 0.2s';
              icon.style.opacity = '0';
          }
      }
  };

  const handleAction = async (action: string) => {
      setShowMenu(false);
      setIsPressed(false); 
      switch (action) {
          case 'copy': await Platform.clipboard.write(message.content); Toast.success('已复制'); break;
          case 'delete': onDelete(message.id); break;
          case 'forward': onForward(message); break;
          case 'reply': onReply(message); break;
          case 'multi': onMultiSelect(message); break;
          case 'fav': Toast.success('已收藏'); break;
          case 'recall': onRecall?.(message.id); break;
      }
  };

  return (
    <div 
        onClick={() => selectionMode && onToggleSelection(message.id)}
        className={isHighlighted ? 'flash-highlight' : ''} 
        style={{ 
            display: 'flex', width: '100%', 
            padding: '4px 16px', marginBottom: '16px', 
            flexDirection: 'row', alignItems: 'flex-start', position: 'relative',
            touchAction: 'pan-y' // Browser handles vertical scroll, we handle horizontal
        }}
    >
      {/* Reply Icon Indicator (Behind the swipe) */}
      <div 
          id={`reply-icon-${message.id}`}
          style={{
              position: 'absolute', left: 16, top: '50%', marginTop: '-15px',
              width: '30px', height: '30px', background: 'var(--bg-cell-active)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, zIndex: 0, transformOrigin: 'center'
          }}
      >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5"><path d="M9 14L4 9l5-5"/><path d="M4 9h10c4.4 0 8 3.6 8 8v1"/></svg>
      </div>

      {selectionMode && (
          <div style={{ paddingTop: '8px', animation: 'slideIn 0.2s ease-out', marginRight: 12 }}>
              <Checkbox checked={isSelected} />
          </div>
      )}

      {/* Main Content Container (Moves on Swipe) */}
      <div 
        ref={contentRef}
        style={{ 
            flex: 1, display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
            transform: 'translateX(0)', // Default
            zIndex: 1, position: 'relative'
        }}
      >
          {showAvatar ? (
              <div style={{ 
                  width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0,
                  marginLeft: isUser ? '12px' : 0, marginRight: isUser ? 0 : '12px',
                  position: 'relative', zIndex: 1, marginTop: 'auto' // Bottom align avatar
              }}>
                  <Avatar 
                      src={isUser ? "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" : undefined} 
                      fallbackText={isUser ? "User" : "Bot"}
                      size={AVATAR_SIZE}
                  />
              </div>
          ) : <div style={{ width: 0 }} />}

          <div style={{ 
              maxWidth: '100%',
              flex: !isUser ? 1 : 'none',
              display: 'flex', flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start', minWidth: 0, position: 'relative' 
          }}>
              {/* Status Indicator */}
              <div style={{ 
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  [isUser ? 'left' : 'right']: '-24px', display: 'flex', alignItems: 'center' 
              }}>
                  {isSending && <LoadingSpinner />}
                  {isError && <span style={{ color: '#fa5151', fontSize: '14px' }}>!</span>}
              </div>

              {/* Bubble Container */}
              <div 
                  ref={bubbleRef}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleTouchStart}
                  onMouseMove={handleTouchMove}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onContextMenu={(e) => { e.preventDefault(); }} 
                  style={{
                      position: 'relative', backgroundColor: finalBg,
                      color: isRichMedia ? 'inherit' : textColor,
                      borderRadius: isRichMedia ? '12px' : borderRadius,
                      padding: isRichMedia ? 0 : '10px 16px', 
                      boxShadow: (!isUser && !isRichMedia && finalBg !== 'transparent') ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
                      fontSize: '15px', lineHeight: '1.6', minHeight: '36px',
                      width: (!isUser && !isRichMedia) ? '100%' : 'auto',
                      display: 'flex', flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      transform: isPressed || showMenu ? 'scale(0.98)' : 'scale(1)',
                      filter: showMenu ? 'brightness(0.9)' : (isPressed ? 'brightness(0.95)' : 'none'),
                      transition: 'transform 0.1s, filter 0.1s',
                      cursor: 'pointer', userSelect: 'text', WebkitUserSelect: 'text',
                      wordBreak: 'break-word', zIndex: 1,
                      overflow: isRichMedia ? 'visible' : 'visible' // Ensure visible for tail/heart
                  }}
              >
                  {/* Tail Element */}
                  {showTail && (
                      <BubbleTail isUser={isUser} color={finalBg} />
                  )}

                  {/* Reaction Heart (Double Tap) */}
                  {liked && (
                      <div style={{ 
                          position: 'absolute', bottom: -8, [isUser ? 'left' : 'right']: -8,
                          background: 'white', borderRadius: '50%', width: 22, height: 22,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 10,
                          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }}>
                          <span style={{ fontSize: '14px' }}>❤️</span>
                      </div>
                  )}

                  {message.replyTo && (
                      <div style={{
                          marginBottom: '6px', paddingLeft: '8px', 
                          borderLeft: `2px solid ${isUser ? 'rgba(255,255,255,0.5)' : 'var(--primary-color)'}`,
                          width: '100%', opacity: 0.8
                      }}>
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>{message.replyTo.name}</div>
                          <div style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{message.replyTo.content}</div>
                      </div>
                  )}

                  <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                      <MessageContent message={message} isUser={isUser} onInteract={onInteract} />
                  </div>

                  {message.isStreaming && (
                      <span style={{ display: 'inline-block', width: '2px', height: '16px', background: 'currentColor', marginLeft: '4px', verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} />
                  )}
              </div>
          </div>
      </div>
      
      <ChatContextMenu 
          visible={showMenu}
          anchorRect={bubbleRef.current ? bubbleRef.current.getBoundingClientRect() : null}
          onClose={() => { setShowMenu(false); setIsPressed(false); }}
          onAction={handleAction}
          isUser={isUser}
          canRecall={canRecall}
      />
    </div>
  );
});
