
import React, { useState } from 'react';

interface NoticeBarProps {
    text: string;
    icon?: React.ReactNode;
    scrollable?: boolean;
    mode?: 'closeable' | 'link';
    background?: string;
    color?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export const NoticeBar: React.FC<NoticeBarProps> = ({ 
    text, 
    icon, 
    scrollable = true, 
    mode, 
    background = 'rgba(255, 159, 64, 0.1)', // Default warning light
    color = '#ff9f40', 
    onClick,
    style 
}) => {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <div 
            onClick={onClick}
            style={{ 
                background, color,
                height: '36px', 
                display: 'flex', alignItems: 'center', 
                padding: '0 12px', 
                fontSize: '13px', 
                overflow: 'hidden',
                cursor: onClick || mode === 'link' ? 'pointer' : 'default',
                ...style
            }}
        >
            {icon && <div style={{ marginRight: '8px', display: 'flex', flexShrink: 0 }}>{icon}</div>}
            
            <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                {scrollable ? (
                    <div style={{ 
                        animation: 'notice-marquee 15s linear infinite', 
                        paddingLeft: '100%', display: 'inline-block' 
                    }}>
                        {text}
                    </div>
                ) : (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
                )}
            </div>

            {mode === 'closeable' && (
                <div 
                    onClick={(e) => { e.stopPropagation(); setVisible(false); }}
                    style={{ marginLeft: '8px', cursor: 'pointer', padding: '4px' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            )}
            
            {mode === 'link' && (
                <div style={{ marginLeft: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            )}

            <style>{`
                @keyframes notice-marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%) translateX(-20px); } /* Extra offset to ensure clear */
                }
            `}</style>
        </div>
    );
};
