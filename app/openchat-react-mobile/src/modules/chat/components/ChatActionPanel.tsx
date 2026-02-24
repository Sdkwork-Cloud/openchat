
import React, { useRef } from 'react';
import { navigate } from '../../../router';
import { Platform } from '../../../platform';
import { Toast } from '../../../components/Toast';
import { useTranslation } from '../../../core/i18n/I18nContext';

interface ActionItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path?: string;
    isPicker?: boolean;
}

interface ChatActionPanelProps {
    visible: boolean;
    sessionId?: string;
    onSendImage?: (file: File) => void;
}

export const ChatActionPanel: React.FC<ChatActionPanelProps> = ({ visible, sessionId, onSendImage }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    const ACTION_ITEMS: ActionItem[] = [
        { id: 'photo', label: t('chat.actions.photo'), icon: '🖼️', isPicker: true },
        { id: 'camera', label: t('chat.actions.camera'), icon: '📷', isPicker: true }, // Reusing picker for web demo
        { id: 'video', label: t('chat.actions.video_call'), icon: '📹', path: '/video-call' },
        { id: 'location', label: t('chat.actions.location'), icon: '📍', path: '/general?title=位置' },
        { id: 'redpacket', label: t('chat.actions.redpacket'), icon: '🧧', path: '/general?title=红包' },
        { id: 'file', label: t('chat.actions.file'), icon: '📂', path: '/drive' },
        { id: 'voice', label: t('chat.actions.voice'), icon: '🎙️', path: '/general?title=语音输入' },
        { id: 'fav', label: t('chat.actions.favorite'), icon: '⭐', path: '/favorites' },
    ];
    
    const handleActionClick = (item: ActionItem) => {
        Platform.device.vibrate(10);
        
        if (item.isPicker) {
            // Trigger file input
            fileInputRef.current?.click();
            return;
        }

        if (item.path) {
            let targetPath = item.path;
            if (sessionId) {
                const separator = targetPath.includes('?') ? '&' : '?';
                targetPath += `${separator}sessionId=${sessionId}`;
            }
            navigate(targetPath);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onSendImage) {
            if (file.size > 5 * 1024 * 1024) {
                Toast.error('图片过大，请选择小于 5MB 的图片');
                return;
            }
            onSendImage(file);
        }
        // Reset
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div style={{
            height: visible ? '240px' : '0px',
            overflow: 'hidden',
            transition: 'height 0.25s cubic-bezier(0.19, 1, 0.22, 1)',
            background: 'var(--bg-body)',
            borderTop: visible ? '0.5px solid var(--border-color)' : 'none',
        }}>
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleFileChange} 
            />

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
                        key={item.id}
                        onClick={() => handleActionClick(item)}
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
