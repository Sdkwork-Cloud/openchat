
import React from 'react';
import { ActionSheet } from '../ActionSheet/ActionSheet';
import { useTranslation } from '../../core/i18n/I18nContext';

export interface PickerOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}

interface PickerProps {
    visible: boolean;
    title?: string;
    options: PickerOption[];
    value?: string | number;
    onClose: () => void;
    onConfirm: (value: string | number, option: PickerOption) => void;
}

export const Picker: React.FC<PickerProps> = ({ 
    visible, 
    title, 
    options, 
    value, 
    onClose, 
    onConfirm 
}) => {
    const { t } = useTranslation();
    const displayTitle = title || t('common.select');

    const handleSelect = (option: PickerOption) => {
        if (option.disabled) return;
        onConfirm(option.value, option);
        onClose();
    };

    return (
        <ActionSheet visible={visible} onClose={onClose} title={displayTitle} height="auto">
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <div 
                            key={option.value} 
                            onClick={() => handleSelect(option)}
                            style={{ 
                                padding: '16px 20px', 
                                textAlign: 'center',
                                fontSize: '17px',
                                color: option.disabled ? 'var(--text-placeholder)' : (isSelected ? 'var(--primary-color)' : 'var(--text-primary)'),
                                fontWeight: isSelected ? 600 : 400,
                                borderBottom: '0.5px solid var(--border-color)',
                                cursor: option.disabled ? 'not-allowed' : 'pointer',
                                background: isSelected ? 'var(--bg-cell-top)' : 'transparent'
                            }}
                        >
                            {option.label}
                        </div>
                    );
                })}
                <div 
                    onClick={onClose}
                    style={{ 
                        padding: '16px', textAlign: 'center', fontSize: '17px', 
                        fontWeight: 600, borderTop: '8px solid var(--bg-body)',
                        color: 'var(--text-primary)', cursor: 'pointer'
                    }}
                >
                    {t('common.cancel')}
                </div>
            </div>
        </ActionSheet>
    );
};
