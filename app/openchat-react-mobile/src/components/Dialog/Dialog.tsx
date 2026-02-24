
import React from 'react';
import { Popup } from '../Popup/Popup';

export interface DialogAction {
    text: string;
    onClick?: () => void | Promise<void>;
    danger?: boolean;
    primary?: boolean;
    style?: React.CSSProperties;
}

export interface DialogProps {
    visible: boolean;
    title?: React.ReactNode;
    content?: React.ReactNode;
    actions?: DialogAction[];
    onClose?: () => void; 
    maskClosable?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export const DialogComponent: React.FC<DialogProps> = ({ 
    visible, 
    title, 
    content, 
    actions, 
    onClose,
    maskClosable = false,
    className = '',
    style
}) => {
    return (
        <Popup 
            visible={visible} 
            onClose={onClose} 
            position="center" 
            round
            maskClosable={maskClosable}
            zIndex={2001}
            className={className}
            style={{ 
                width: '80%', 
                maxWidth: '320px', 
                background: 'rgba(var(--bg-card-rgb), 0.95)', 
                backdropFilter: 'blur(20px)',
                ...style
            }}
        >
            <div style={{ padding: '24px 20px 20px', textAlign: 'center' }}>
                {title && (
                    <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                        {title}
                    </div>
                )}
                {content && (
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, opacity: 0.8 }}>
                        {content}
                    </div>
                )}
            </div>
            
            {actions && actions.length > 0 && (
                <div style={{ 
                    borderTop: '0.5px solid var(--border-color)', 
                    display: 'flex', 
                    flexDirection: actions.length > 2 ? 'column' : 'row' 
                }}>
                    {actions.map((action, idx) => (
                        <div 
                            key={idx}
                            onClick={action.onClick}
                            style={{ 
                                flex: 1, 
                                padding: '14px 0', 
                                textAlign: 'center', 
                                fontSize: '16px',
                                fontWeight: action.primary ? 600 : 400,
                                color: action.danger ? '#fa5151' : (action.primary ? 'var(--primary-color)' : 'var(--text-primary)'),
                                borderLeft: idx > 0 && actions.length <= 2 ? '0.5px solid var(--border-color)' : 'none',
                                borderTop: idx > 0 && actions.length > 2 ? '0.5px solid var(--border-color)' : 'none',
                                cursor: 'pointer',
                                userSelect: 'none',
                                active: { background: 'rgba(0,0,0,0.05)' },
                                ...action.style
                            } as any}
                            onTouchStart={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                            onTouchEnd={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {action.text}
                        </div>
                    ))}
                </div>
            )}
        </Popup>
    );
};
