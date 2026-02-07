
import React from 'react';
import { getAgent } from '../../../services/agentRegistry';
import { ChatSession } from '../../../types/core';

// --- Utils ---
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }
  return (date.getMonth() + 1) + '/' + date.getDate();
};

interface ChatListItemProps {
    session: ChatSession;
    onClick: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = React.memo(({ session, onClick }) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const agent = getAgent(session.agentId);
  const lastMsg = session.messages[session.messages.length - 1];

  const background = isPressed 
    ? 'var(--bg-cell-active)' 
    : (session.isPinned ? 'var(--bg-cell-top)' : 'var(--bg-card)');

  const renderAvatar = () => {
     if (typeof agent.avatar === 'string' && (agent.avatar.startsWith('http') || agent.avatar.startsWith('data:'))) {
         return <div style={{ width: '100%', height: '100%', background: `url(${agent.avatar}) center/cover`, borderRadius: '8px' }} />;
     }
     return (
         <div style={{ 
             width: '100%', height: '100%', borderRadius: '8px', 
             background: 'var(--primary-gradient)', 
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             fontSize: '24px', color: '#fff',
             textShadow: '0 2px 4px rgba(0,0,0,0.1)'
         }}>
             {agent.avatar}
         </div>
     );
  };

  return (
    <div 
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        display: 'flex',
        height: '72px',
        padding: '12px 16px',
        background: background,
        cursor: 'pointer',
        alignItems: 'center',
        position: 'relative',
        transition: 'background 0.1s ease-in-out'
      }}
    >
      <div style={{ width: '48px', height: '48px', marginRight: '12px', flexShrink: 0, position: 'relative' }}>
        {renderAvatar()}
        {session.unreadCount > 0 && (
            <div style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: 'var(--danger)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 600,
                minWidth: '16px',
                height: '16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '1px solid var(--bg-card)'
            }}>
                {session.unreadCount}
            </div>
        )}
      </div>
      
      <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.2' }}>
            {agent.name}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0, marginLeft: '8px', opacity: 0.8 }}>
            {formatTime(session.lastUpdated)}
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
        </div>
      </div>
    </div>
  );
});
