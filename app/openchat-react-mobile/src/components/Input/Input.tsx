
import React, { useRef, useState, useEffect } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'prefix'> {
    label?: string;
    error?: string | boolean; // Error message or boolean status
    helperText?: string; // Bottom assistive text
    maxLength?: number;
    showCount?: boolean; // Show character count if maxLength is set
    clearable?: boolean;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    onClear?: () => void;
    variant?: 'filled' | 'outline' | 'ghost';
    containerStyle?: React.CSSProperties;
    // Enhanced Props for Mobile
    enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
    inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
    // Multiline
    multiline?: boolean;
    rows?: number;
    maxRows?: number;
}

export const Input: React.FC<InputProps> = ({ 
    label, 
    error,
    helperText,
    maxLength,
    showCount,
    clearable, 
    prefix, 
    suffix, 
    onClear, 
    variant = 'filled',
    className = '',
    containerStyle,
    value,
    onChange,
    type,
    disabled,
    enterKeyHint,
    inputMode,
    style,
    multiline = false,
    rows = 2,
    maxRows,
    ...props 
}) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Auto-resize for textarea
    useEffect(() => {
        if (multiline && inputRef.current) {
            const el = inputRef.current;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [value, multiline]);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (onChange) {
            const event = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
        }
        if (onClear) onClear();
        inputRef.current?.focus();
    };

    // Style Logic
    const isError = !!error;
    const currentLength = value ? String(value).length : 0;

    const getBg = () => {
        if (variant === 'ghost') return 'transparent';
        if (variant === 'filled') return disabled ? 'rgba(0,0,0,0.02)' : 'var(--bg-body)';
        return 'transparent';
    };

    const getBorder = () => {
        if (variant === 'ghost') return 'none';
        if (isError) return '1px solid var(--danger)';
        if (isFocused && variant === 'outline') return '1px solid var(--primary-color)';
        if (variant === 'outline') return '1px solid var(--border-color)';
        return '1px solid transparent'; // maintain layout
    };

    const getPadding = () => {
        if (variant === 'ghost') return '0';
        return '0 12px';
    };

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    
    const commonStyles: React.CSSProperties = {
        flex: 1, border: 'none', background: 'transparent',
        fontSize: '16px', color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
        outline: 'none', 
        padding: '12px 0',
        minWidth: 0,
        cursor: disabled ? 'not-allowed' : 'text',
        fontFamily: 'inherit',
        ...style
    };

    return (
        <div style={{ marginBottom: (label || helperText || error) ? '20px' : '0', ...containerStyle }}>
            <style>{`
                .remove-native-eye::-ms-reveal,
                .remove-native-eye::-ms-clear { display: none; }
                .remove-native-eye::-webkit-credentials-auto-fill-button { visibility: hidden; position: absolute; right: 0; }
            `}</style>
            
            {label && (
                <div style={{ 
                    fontSize: '13px', 
                    color: isError ? 'var(--danger)' : 'var(--text-secondary)', 
                    marginBottom: '8px', 
                    paddingLeft: '4px',
                    fontWeight: 500
                }}>
                    {label}
                </div>
            )}
            
            <div style={{ 
                display: 'flex', alignItems: multiline ? 'flex-start' : 'center', 
                background: getBg(), 
                border: getBorder(),
                borderRadius: variant === 'ghost' ? '0' : '12px', 
                padding: getPadding(),
                transition: 'all 0.2s',
                minHeight: variant === 'ghost' ? '24px' : '48px',
                height: multiline ? 'auto' : '100%',
                opacity: disabled ? 0.7 : 1,
                boxShadow: isFocused && variant === 'filled' ? '0 0 0 2px rgba(41, 121, 255, 0.1)' : 'none'
            }}>
                {prefix && <div style={{ marginRight: '8px', marginTop: multiline ? '12px' : '0', color: 'var(--text-secondary)', display: 'flex' }}>{prefix}</div>}
                
                {multiline ? (
                    <textarea
                        ref={inputRef as any}
                        value={value}
                        onChange={onChange as any}
                        disabled={disabled}
                        maxLength={maxLength}
                        rows={rows}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={`remove-native-eye ${className}`}
                        enterKeyHint={enterKeyHint}
                        inputMode={inputMode}
                        style={{
                            ...commonStyles,
                            resize: 'none',
                            height: 'auto',
                            minHeight: `${rows * 24}px`,
                            lineHeight: 1.5
                        }}
                        {...props as any}
                    />
                ) : (
                    <input
                        ref={inputRef as any}
                        type={inputType}
                        value={value}
                        onChange={onChange as any}
                        disabled={disabled}
                        maxLength={maxLength}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={`remove-native-eye ${className}`}
                        enterKeyHint={enterKeyHint}
                        inputMode={inputMode}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        style={{ ...commonStyles, height: '100%' }}
                        {...props as any}
                    />
                )}

                {clearable && !disabled && value && String(value).length > 0 && (
                    <div 
                        onClick={handleClear}
                        style={{ 
                            padding: '4px', cursor: 'pointer', 
                            color: 'var(--text-placeholder)',
                            display: 'flex', alignItems: 'center',
                            marginTop: multiline ? '12px' : '0',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                    </div>
                )}

                {isPassword && !disabled && !multiline && (
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowPassword(!showPassword);
                        }}
                        style={{ 
                            padding: '4px', cursor: 'pointer', 
                            color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center',
                            marginLeft: '4px'
                        }}
                    >
                        {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        )}
                    </div>
                )}
                
                {suffix && <div style={{ marginLeft: '8px', marginTop: multiline ? '12px' : '0', color: 'var(--text-secondary)' }}>{suffix}</div>}
            </div>

            {/* Bottom Info: Error or Helper + Count */}
            {(error || helperText || (maxLength && showCount)) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', padding: '0 4px' }}>
                    <div style={{ fontSize: '12px', color: isError ? 'var(--danger)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {isError ? (typeof error === 'string' ? error : '') : helperText}
                    </div>
                    {maxLength && showCount && (
                        <div style={{ fontSize: '12px', color: 'var(--text-placeholder)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                            {currentLength} / {maxLength}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
