
import React from 'react';
import { useTouchFeedback } from '../../../mobile/hooks/useTouchFeedback';

interface AvatarCellProps {
    avatar: string;
    isUploading: boolean;
    onClick: () => void;
}

export const AvatarCell: React.FC<AvatarCellProps> = ({ avatar, isUploading, onClick }) => {
    const { isActive, touchProps } = useTouchFeedback();
    
    return (
        <div 
            onClick={onClick}
            {...touchProps}
            style={{ 
                padding: '16px', 
                background: isActive ? 'var(--bg-cell-active)' : 'var(--bg-card)', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', minHeight: '88px',
                transition: 'background 0.1s',
                borderBottom: '0.5px solid var(--border-color)'
            }}
        >
            <span style={{ fontSize: '16px', color: 'var(--text-primary)' }}>头像</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                    <img 
                        src={avatar} 
                        style={{ 
                            width: '100%', height: '100%', borderRadius: '10px', 
                            objectFit: 'cover', background: '#f5f5f5', 
                            border: '0.5px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }} 
                    />
                    {isUploading && (
                        <div style={{
                            position: 'absolute', inset: 0, borderRadius: '10px',
                            background: 'rgba(0,0,0,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div className="spinner-border" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                    )}
                </div>
                <span style={{ color: '#c5c9cf', fontSize: '16px', fontWeight: 600 }}>›</span>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
