
import React from 'react';

interface ChatSelectionBarProps {
    selectedCount: number;
    onDelete: () => void;
    onForward: () => void;
}

export const ChatSelectionBar: React.FC<ChatSelectionBarProps> = ({ selectedCount, onDelete, onForward }) => {
    const hasSelection = selectedCount > 0;
    
    return (
        <div style={{ 
            height: '56px', 
            background: 'var(--navbar-bg)', 
            borderTop: '0.5px solid var(--border-color)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-around', 
            paddingBottom: 'env(safe-area-inset-bottom)',
            zIndex: 100, 
            animation: 'slideUp 0.2s cubic-bezier(0.19, 1, 0.22, 1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0
        }}>
            <div 
                onClick={hasSelection ? onForward : undefined} 
                style={{ 
                    padding: '10px 20px', 
                    opacity: hasSelection ? 1 : 0.4, 
                    cursor: hasSelection ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    color: 'var(--text-primary)'
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </div>
            
            <div 
                onClick={hasSelection ? onDelete : undefined} 
                style={{ 
                    padding: '10px 20px', 
                    opacity: hasSelection ? 1 : 0.4, 
                    cursor: hasSelection ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    color: hasSelection ? 'var(--danger)' : 'var(--text-primary)'
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
        </div>
    );
};
