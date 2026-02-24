
import React, { useState } from 'react';
import { getAgent } from '../../../services/agentRegistry';
import { ChatSession } from '../../../types/core';
import { useChatStore } from '../../../services/store';
import { Toast } from '../../../components/Toast';
import { Avatar } from '../../../components/Avatar';
import { SwipeableRow, Action } from '../../../components/SwipeableRow/SwipeableRow';
import { Badge } from '../../../components/Badge/Badge';
import { DateUtils } from '../../../utils/date';
import { useLongPress } from '../../../hooks/useLongPress';
import { ActionSheet } from '../../../components/ActionSheet';

interface ChatListItemProps {
    session: ChatSession;
    onClick: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = React.memo(({ session, onClick }) => {
  const { deleteSession, togglePin, markSessionRead, setSessionUnread } = useChatStore();
  const [isPressed, setIsPressed] = useState(false);
  
  const handleLongPress = async () => {
    const actions = [
      { 
        text: session.unreadCount > 0 ? '标记已读' : '标记未读', 
        key: 'read',
        onClick: () => session.unreadCount > 0 ? markSessionRead(session.id) : setSessionUnread(session.id, 1)
      },
      { 
        text: session.isPinned ? '取消置顶' : '置顶聊天', 
        key: 'pin',
        onClick: () => togglePin(session.id)
      },
      { 
        text: '删除聊天', 
        key: 'delete',
        color: '#fa5151',
        onClick: () => {
          if (window.confirm('确认删除该聊天?')) {
            deleteSession(session.id);
          }
        }
      }
    ];

    const res = await ActionSheet.showActions({
      title: session.groupName || '聊天操作',
      actions: actions.map(a => ({ text: a.text, color: a.color, key: a.key }))
    });

    if (res) {
      const action = actions.find(a => a.key === res.key);
      action?.onClick();
    }
  };

  const longPressProps = useLongPress({
    onLongPress: handleLongPress,
    onClick: onClick,
    delay: 500
  });

  const handleTouchStart = (e: any) => {
    setIsPressed(true);
    longPressProps.onTouchStart(e);
  };

  const handleTouchEnd = (e: any) => {
    setIsPressed(false);
    longPressProps.onTouchEnd(e);
  };

  const handleTouchCancel = (e: any) => {
    setIsPressed(false);
    longPressProps.onTouchEnd(e);
  };

  const handleTouchMove = (e: any) => {
    longPressProps.onTouchMove(e);
  };

  // Data Resolution
  const isGroup = session.type === 'group';
  let displayName = '';
  let avatarSrc: any = null;

  if (isGroup) {
      displayName = session.groupName || '群聊';
      // Group icon SVG as a component for Avatar
      avatarSrc = (
         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--text-secondary)"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      );
  } else {
      const agent = getAgent(session.agentId);
      displayName = agent.name;
      avatarSrc = agent.avatar;
  }

  const lastMsg = session.messages[session.messages.length - 1];
  
  const background = session.isPinned 
    ? (isPressed ? 'var(--bg-cell-active)' : 'var(--bg-cell-top)') 
    : (isPressed ? 'var(--bg-cell-active)' : 'var(--bg-card)');

  const swipeActions: Action[] = [
      {
          text: session.unreadCount > 0 ? '已读' : '未读',
          color: '#007aff',
          onClick: async () => {
              if (session.unreadCount > 0) {
                  await markSessionRead(session.id);
              } else {
                  await setSessionUnread(session.id, 1);
              }
          }
      },
      {
          text: session.isPinned ? '取消' : '置顶',
          color: '#ff9a44',
          onClick: async () => {
              await togglePin(session.id);
          }
      },
      {
          text: '删除',
          color: '#fa5151',
          onClick: async () => {
              if (window.confirm('确认删除该聊天?')) {
                  await deleteSession(session.id);
              }
          }
      }
  ];

  return (
    <SwipeableRow 
        rightActions={swipeActions}
        onBodyClick={onClick}
        contentBackground={background}
    >
        <div 
          {...longPressProps}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseDown={(e) => { setIsPressed(true); longPressProps.onMouseDown(e); }}
          onMouseUp={(e) => { setIsPressed(false); longPressProps.onMouseUp(e); }}
          onMouseLeave={(e) => { setIsPressed(false); longPressProps.onMouseLeave(e); }}
          style={{
            display: 'flex',
            height: '72px',
            padding: '12px 16px',
            background: background,
            cursor: 'pointer',
            alignItems: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            borderBottom: '0.5px solid var(--border-color)',
            transition: 'background 0.1s ease'
          }}
        >
          <div style={{ marginRight: '12px', flexShrink: 0 }}>
            <Badge content={session.unreadCount} offset={[-2, 2]}>
                <Avatar 
                    src={avatarSrc} 
                    fallbackText={displayName} 
                    size={48} 
                    // Optional: Show status if it's a person/agent in future
                    // status="online" 
                />
            </Badge>
          </div>
          
          <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                {displayName}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0, marginLeft: '8px', opacity: 0.8 }}>
                {DateUtils.formatRelative(session.lastMessageTime)}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)',
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    paddingRight: '12px',
                    flex: 1
                }}>
                    {lastMsg ? lastMsg.content : '...'}
                </span>
                {session.isPinned && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)" style={{ opacity: 0.5, flexShrink: 0 }}>
                        <path d="M16 12V4H8v8l-2 2v2h6v6h4v-6h6v-2l-2-2z" />
                    </svg>
                )}
            </div>
          </div>
        </div>
    </SwipeableRow>
  );
});
