
import React from 'react';
import { Platform } from '../../platform';
import { Popup } from '../Popup/Popup';
import { useTranslation } from '../../core/i18n/I18nContext';

interface NumberKeyboardProps {
    visible: boolean;
    onInput: (key: string) => void;
    onDelete: () => void;
    onClose: () => void;
    onConfirm?: () => void;
    title?: string;
    customKey?: string; // e.g. "." or "X"
    confirmText?: string;
    zIndex?: number;
    showCloseButton?: boolean;
}

export const NumberKeyboard: React.FC<NumberKeyboardProps> = ({ 
    visible, 
    onInput, 
    onDelete, 
    onClose, 
    onConfirm,
    title,
    customKey,
    confirmText,
    zIndex = 2000,
    showCloseButton = true
}) => {
    const { t } = useTranslation();
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', customKey || '', '0', 'del'];
    const displayText = confirmText || t('common.complete');

    const handlePress = (k: string) => {
        Platform.device.vibrate(10); // Haptic feedback
        if (k === 'del') {
            onDelete();
        } else if (k === '') {
            return;
        } else {
            onInput(k);
        }
    };

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        Platform.device.vibrate(20);
        if (onConfirm) onConfirm();
        else onClose();
    };

    return (
        <Popup 
            visible={visible} 
            position="bottom" 
            mask={false} // Keyboard usually manages its own mask context or overlay
            maskClosable={true}
            onClose={onClose}
            zIndex={zIndex}
            style={{ backgroundColor: '#f2f3f5' }}
            safeArea
        >
            {title && (
                <div style={{ 
                    height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '14px', color: 'var(--text-secondary)', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
                    background: 'var(--bg-body)', position: 'relative'
                }}>
                    {title}
                    {showCloseButton && (
                        <div 
                            onClick={onClose}
                            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, padding: '0 16px', display: 'flex', alignItems: 'center', color: 'var(--primary-color)', cursor: 'pointer' }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '6px', gap: '6px' }}>
                {keys.map((k, i) => {
                    const isSpecial = k === 'del' || k === '';
                    
                    if (k === '' && !customKey) return <div key={i} />;

                    return (
                        <div 
                            key={k || `empty-${i}`}
                            onTouchStart={(e) => { 
                                if (k) e.currentTarget.style.background = '#ebedf0'; 
                            }}
                            onTouchEnd={(e) => { 
                                if (k) e.currentTarget.style.background = isSpecial ? 'transparent' : '#fff'; 
                                if (k) handlePress(k); 
                            }}
                            onMouseDown={(e) => { if(k) e.currentTarget.style.background = '#ebedf0'; }} // Desktop fallback
                            onMouseUp={(e) => { if(k) e.currentTarget.style.background = isSpecial ? 'transparent' : '#fff'; }}
                            onClick={(e) => k && !('ontouchstart' in window) && handlePress(k)} // Desktop click
                            style={{
                                background: isSpecial ? 'transparent' : '#fff',
                                borderRadius: '8px',
                                height: '48px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '22px', fontWeight: 500,
                                boxShadow: !isSpecial ? '0 1px 0 rgba(0,0,0,0.3)' : 'none',
                                cursor: k ? 'pointer' : 'default',
                                userSelect: 'none',
                                transition: 'background 0.1s'
                            }}
                        >
                            {k === 'del' ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                            ) : k}
                        </div>
                    );
                })}
            </div>
        </Popup>
    );
};
