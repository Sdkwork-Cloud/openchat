
import React, { useRef, useEffect } from 'react';
import { Platform } from '../../../platform';

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    onCancel: () => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
    value, 
    onChange, 
    onCancel, 
    placeholder = '搜索', 
    autoFocus = true
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus) {
            // Small delay to ensure transition animation allows keyboard to slide up smoothly
            const timer = setTimeout(() => inputRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
        Platform.device.vibrate(5);
    };

    return (
        <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '8px 12px 10px 12px', // Bottom padding for spacing
            background: 'var(--navbar-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '0.5px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            paddingTop: 'calc(8px + env(safe-area-inset-top))'
        }}>
            <div style={{
                flex: 1,
                height: '36px', // Standard iOS search bar height
                background: 'rgba(0,0,0,0.05)', // Standard gray fill
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                transition: 'background 0.2s'
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" style={{ marginRight: '8px', flexShrink: 0, opacity: 0.7 }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '16px', // Prevent zoom on iOS
                        flex: 1,
                        color: 'var(--text-primary)',
                        height: '100%',
                        padding: 0,
                        minWidth: 0,
                        caretColor: 'var(--primary-color)'
                    }}
                />

                {value.length > 0 && (
                    <div 
                        onClick={handleClear} 
                        style={{ 
                            padding: '4px', 
                            cursor: 'pointer', 
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.8
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                        </svg>
                    </div>
                )}
            </div>

            <div 
                onClick={() => {
                    Platform.device.vibrate(5);
                    onCancel();
                }}
                style={{ 
                    fontSize: '16px', 
                    color: 'var(--primary-color)', 
                    fontWeight: 500, 
                    cursor: 'pointer', 
                    whiteSpace: 'nowrap',
                    padding: '4px 0',
                    userSelect: 'none'
                }}
            >
                取消
            </div>
        </div>
    );
};
