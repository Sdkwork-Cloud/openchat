
import React from 'react';
import { Popup } from '../Popup/Popup';

interface ActionSheetProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: React.ReactNode;
    height?: string | number; 
    zIndex?: number;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ 
    visible, 
    onClose, 
    children, 
    title,
    height,
    zIndex
}) => {
    return (
        <Popup 
            visible={visible} 
            onClose={onClose} 
            position="bottom" 
            round 
            zIndex={zIndex}
            style={{ height: height }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'inherit' }}>
                {/* Drag Handle Indicator */}
                <div style={{ width: '100%', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-color)', opacity: 0.6 }} />
                </div>

                {title && (
                    <div style={{ 
                        padding: '0 20px 16px 20px', 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '0.5px solid var(--border-color)',
                        fontSize: '17px', fontWeight: 600,
                        color: 'var(--text-primary)',
                        flexShrink: 0
                    }}>
                        <div style={{flex: 1}}>{title}</div>
                        <div 
                            onClick={onClose} 
                            style={{ 
                                padding: '4px', cursor: 'pointer', 
                                background: 'var(--bg-body)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', marginLeft: '12px'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                    </div>
                )}
                
                <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                    {children}
                </div>
            </div>
        </Popup>
    );
};
