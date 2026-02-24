
import React, { useState, useEffect, useRef } from 'react';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { Button } from '../../../components/Button/Button';

interface ProfileEditSheetProps {
    visible: boolean;
    title: string;
    value: string;
    maxLength?: number;
    multiline?: boolean;
    onClose: () => void;
    onSave: (newValue: string) => Promise<void>;
}

export const ProfileEditSheet: React.FC<ProfileEditSheetProps> = ({ 
    visible, 
    title, 
    value, 
    maxLength = 30, 
    multiline = false,
    onClose, 
    onSave 
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        if (visible) {
            setInputValue(value);
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    const len = inputRef.current.value.length;
                    inputRef.current.setSelectionRange(len, len);
                }
            }, 400); // Wait for sheet animation
        }
    }, [visible, value]);

    const hasChanged = inputValue !== value;
    const isValid = inputValue.trim().length > 0;
    const canSave = hasChanged && isValid && !saving;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        await onSave(inputValue);
        setSaving(false);
        onClose();
    };

    const handleClear = () => {
        setInputValue('');
        inputRef.current?.focus();
    };

    const Header = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>{title}</span>
            <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSave} 
                disabled={!canSave}
                loading={saving}
            >
                保存
            </Button>
        </div>
    );

    return (
        <ActionSheet visible={visible} onClose={onClose} title={Header}>
            <div style={{ padding: '20px 20px 40px 20px' }}>
                <div style={{ 
                    background: 'var(--bg-body)', borderRadius: '12px', padding: '12px',
                    display: 'flex', flexDirection: 'column', position: 'relative',
                    border: '1px solid transparent',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'border 0.2s'
                }}>
                    {multiline ? (
                        <textarea
                            ref={inputRef as any}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            maxLength={maxLength}
                            style={{
                                width: '100%', height: '80px', border: 'none', background: 'transparent',
                                fontSize: '16px', color: 'var(--text-primary)', outline: 'none',
                                resize: 'none', fontFamily: 'inherit', lineHeight: '1.5'
                            }}
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                ref={inputRef as any}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                maxLength={maxLength}
                                style={{
                                    width: '100%', height: '24px', border: 'none', background: 'transparent',
                                    fontSize: '16px', color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                            {inputValue.length > 0 && (
                                <div 
                                    onClick={handleClear}
                                    style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-placeholder)' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                                </div>
                            )}
                        </div>
                    )}
                    <div style={{ 
                        textAlign: 'right', fontSize: '12px', 
                        color: inputValue.length >= maxLength ? '#fa5151' : 'var(--text-placeholder)', 
                        marginTop: '8px', transition: 'color 0.2s'
                    }}>
                        {inputValue.length} / {maxLength}
                    </div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                    {title === '名字' ? '好名字可以让朋友更容易记住你。' : '填写个性签名，展示你的独特态度。'}
                </div>
            </div>
        </ActionSheet>
    );
};
