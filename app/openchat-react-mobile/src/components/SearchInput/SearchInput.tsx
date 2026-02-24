
import React, { useRef, useEffect, useState } from 'react';
import { Platform } from '../../platform';
import { Icon } from '../Icon/Icon';
import { useTranslation } from '../../core/i18n/I18nContext';

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    onCancel?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
    value, 
    onChange, 
    onCancel, 
    placeholder, 
    autoFocus = false,
    disabled = false,
    onClick,
    style
}) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    // Track focus state internally for animation
    const [isFocused, setIsFocused] = useState(autoFocus);
    
    // Derived state: focused OR has content implies "active" mode
    const isActive = isFocused || value.length > 0 || autoFocus;

    const displayPlaceholder = placeholder || t('component.search.placeholder');

    useEffect(() => {
        if (autoFocus && !disabled) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
                setIsFocused(true);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [autoFocus, disabled]);

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleCancelClick = () => {
        setIsFocused(false);
        if (onCancel) {
            Platform.device.vibrate(5);
            onCancel();
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
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
            paddingTop: 'calc(8px + env(safe-area-inset-top))',
            overflow: 'hidden', // Hide cancel button when slid out
            ...style
        }}>
            <div 
                onClick={onClick}
                style={{
                    flex: 1,
                    height: '36px',
                    background: 'var(--bg-body)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    transition: 'all 0.3s cubic-bezier(0.33, 1, 0.68, 1)', // Smooth iOS curve
                    cursor: disabled ? 'pointer' : 'text',
                    position: 'relative'
                }}
            >
                <div style={{ 
                    display: 'flex', alignItems: 'center', 
                    color: 'var(--text-secondary)',
                    transition: 'transform 0.3s',
                    marginRight: '8px',
                    opacity: 0.7
                }}>
                    <Icon name="search" size={16} strokeWidth={2.5} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={displayPlaceholder}
                    disabled={disabled}
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
                        caretColor: 'var(--primary-color)',
                        pointerEvents: disabled ? 'none' : 'auto'
                    }}
                />

                {value.length > 0 && !disabled && (
                    <div 
                        onClick={handleClear} 
                        style={{ 
                            padding: '4px', 
                            cursor: 'pointer', 
                            color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center',
                            opacity: 0.8,
                            animation: 'fadeIn 0.2s'
                        }}
                    >
                        <Icon name="clear" size={16} />
                    </div>
                )}
            </div>

            {/* Cancel Button Container with Slide Animation */}
            <div 
                style={{ 
                    width: isActive || onCancel ? 'auto' : 0, 
                    overflow: 'hidden',
                    opacity: isActive || onCancel ? 1 : 0,
                    transform: isActive || onCancel ? 'translateX(0)' : 'translateX(10px)',
                    transition: 'all 0.3s cubic-bezier(0.33, 1, 0.68, 1)',
                    display: 'flex', alignItems: 'center'
                }}
            >
                {onCancel && (
                    <div 
                        onClick={handleCancelClick}
                        style={{ 
                            fontSize: '16px', 
                            color: 'var(--primary-color)', 
                            fontWeight: 500, 
                            cursor: 'pointer', 
                            whiteSpace: 'nowrap',
                            paddingLeft: '12px',
                            userSelect: 'none'
                        }}
                    >
                        {t('component.search.cancel')}
                    </div>
                )}
            </div>
        </div>
    );
};
