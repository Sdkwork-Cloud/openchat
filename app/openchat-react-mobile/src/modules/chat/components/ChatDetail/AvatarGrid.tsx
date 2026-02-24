import React from 'react';
import { navigate } from '../../../../router';
import { Avatar } from '../../../../components/Avatar';

interface AvatarGridProps {
  memberIds: string[];
  agentAvatar: any;
  agentName: string;
  isGroup: boolean;
  onAdd: () => void;
  onRemove?: () => void;
}

export const AvatarGrid: React.FC<AvatarGridProps> = ({ memberIds, agentAvatar, agentName, isGroup, onAdd, onRemove }) => {
  const displayMembers = isGroup && memberIds.length > 0 
    ? memberIds 
    : [{ id: 'agent', name: agentName, avatar: agentAvatar }];

  const getAvatarUrl = (id: string, fallbackAvatar: any) => {
      if (id === 'agent') return fallbackAvatar;
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;
  };

  const getName = (id: string, fallbackName: string) => {
      if (id === 'agent') return fallbackName;
      return id.length > 6 ? id.substring(0, 6) + '...' : id;
  };

  return (
    <div style={{ padding: '20px 20px 8px 20px', background: 'var(--bg-card)', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {displayMembers.map((member: any) => (
            <div 
                key={member.id || member} 
                onClick={() => navigate('/contact/profile', { name: member.id || member.name })}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '56px', cursor: 'pointer' }}
            >
                 <div style={{ marginBottom: '6px' }}>
                     <Avatar 
                        src={getAvatarUrl(member.id || member, member.avatar)} 
                        fallbackText={getName(member.id || member, member.name)}
                        size={56}
                     />
                 </div>
                 <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getName(member.id || member, member.name)}
                 </span>
            </div>
        ))}

        {/* Add Button */}
        <div onClick={onAdd} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '56px', cursor: 'pointer' }}>
             <div style={{ 
                width: '56px', height: '56px', borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                marginBottom: '6px'
             }}>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </div>
             <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> </span>
        </div>

        {/* Remove Button */}
        {isGroup && onRemove && (
            <div onClick={onRemove} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '56px', cursor: 'pointer' }}>
                 <div style={{ 
                    width: '56px', height: '56px', borderRadius: '8px', 
                    border: '1px solid var(--border-color)', 
                    background: 'var(--bg-body)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                    marginBottom: '6px'
                 }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                 </div>
                 <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> </span>
            </div>
        )}
    </div>
  );
};