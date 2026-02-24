
import React from 'react';

interface PasswordInputProps {
    value: string;
    length?: number;
    gutter?: number;
    mask?: boolean; // Show dots or text
    focused?: boolean;
    onClick?: () => void;
    error?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ 
    value, 
    length = 6, 
    gutter = 0, 
    mask = true, 
    focused = false,
    onClick,
    error = false
}) => {
    const items = Array.from({ length });
    
    return (
        <div 
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            style={{ 
                display: 'flex', 
                gap: gutter > 0 ? `${gutter}px` : 0,
                position: 'relative',
                cursor: 'pointer',
                border: gutter === 0 ? '1px solid var(--border-color)' : 'none',
                borderRadius: gutter === 0 ? '6px' : 0,
                overflow: 'hidden',
                background: 'var(--bg-card)',
                animation: error ? 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both' : 'none'
            }}
        >
            {items.map((_, i) => {
                const hasValue = i < value.length;
                const showCursor = focused && i === value.length;
                
                return (
                    <div 
                        key={i}
                        style={{
                            flex: 1, 
                            height: '50px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            borderRight: (gutter === 0 && i < length - 1) ? '1px solid var(--border-color)' : 'none',
                            border: gutter > 0 ? '1px solid var(--border-color)' : undefined,
                            borderRadius: gutter > 0 ? '6px' : 0,
                            background: 'var(--bg-card)',
                            position: 'relative'
                        }}
                    >
                        {hasValue && (
                            mask 
                                ? <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--text-primary)' }} />
                                : <span style={{ fontSize: '20px', fontWeight: 600 }}>{value[i]}</span>
                        )}
                        {showCursor && (
                            <div style={{ 
                                position: 'absolute', height: '40%', width: '1px', 
                                background: 'var(--primary-color)', 
                                animation: 'blink 1s infinite' 
                            }} />
                        )}
                    </div>
                );
            })}
            <style>{`
                @keyframes blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
                @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
            `}</style>
        </div>
    );
};
