
import React from 'react';
import { navigate } from '../../../router';
import { Platform } from '../../../platform';

interface ActionItem {
    label: string;
    icon: React.ReactNode;
    path: string;
}

interface ChatActionPanelProps {
    visible: boolean;
    sessionId?: string;
}

const ACTION_ITEMS: ActionItem[] = [
    { label: '照片', icon: '🖼️', path: '/general?title=照片' },
    { label: '拍摄', icon: '📷', path: '/general?title=拍摄' },
    { label: '视频通话', icon: '📹', path: '/video-call' },
    { label: '位置', icon: '📍', path: '/general?title=位置' },
    { label: '红包', icon: '🧧', path: '/general?title=红包' },
    { label: '转账', icon: '💰', path: '/general?title=转账' },
    { label: '语音输入', icon: '🎙️', path: '/general?title=语音输入' },
    { label: '收藏', icon: '⭐', path: '/favorites' },
];

export const ChatActionPanel: React.FC<ChatActionPanelProps> = ({ visible, sessionId }) => {
    return (
        <div style={{
            height: visible ? '240px' : '0px',
            overflow: 'hidden',
            transition: 'height 0.25s cubic-bezier(0.19, 1, 0.22, 1)',
            background: 'var(--bg-body)',
            borderTop: visible ? '0.5px solid var(--border-color)' : 'none',
        }}>
            <div style={{ 
                padding: '24px', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '20px',
                height: '100%',
                alignContent: 'start'
            }}>
                {ACTION_ITEMS.map(item => (
                    <div 
                        key={item.label}
                        onClick={() => {
                            Platform.device.vibrate(10);
                            navigate(item.path + (sessionId ? `?sessionId=${sessionId}` : ''));
                        }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            border: '0.5px solid var(--border-color)',
                            transition: 'background 0.2s'
                        }}
                        onTouchStart={(e) => e.currentTarget.style.background = 'var(--bg-cell-active)'}
                        onTouchEnd={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                        >
                            {item.icon}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
