
import React, { useState, useEffect, useMemo } from 'react';
import { ActionSheet } from '../ActionSheet/ActionSheet';
import { useTranslation } from '../../core/i18n/I18nContext';

export interface CascaderOption {
    value: string | number;
    label: string;
    children?: CascaderOption[];
    disabled?: boolean;
}

interface CascaderProps {
    visible: boolean;
    options: CascaderOption[];
    value?: (string | number)[]; // Array of values for each level
    title?: string;
    placeholder?: string;
    onClose: () => void;
    onFinish: (selectedOptions: CascaderOption[]) => void;
    onChange?: (value: (string | number)[], selectedOptions: CascaderOption[]) => void;
}

export const Cascader: React.FC<CascaderProps> = ({ 
    visible, 
    options, 
    value = [], 
    title, 
    placeholder,
    onClose, 
    onFinish,
    onChange
}) => {
    const { t } = useTranslation();
    const [selectedOptions, setSelectedOptions] = useState<CascaderOption[]>([]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    const displayTitle = title || t('common.select');
    const displayPlaceholder = placeholder || t('common.select');

    // Sync external value to internal state
    useEffect(() => {
        if (visible) {
            if (value && value.length > 0) {
                // Reconstruct selectedOptions from value array path
                const newSelectedOptions: CascaderOption[] = [];
                let currentOptions = options;
                for (const val of value) {
                    const found = currentOptions.find(opt => opt.value === val);
                    if (found) {
                        newSelectedOptions.push(found);
                        currentOptions = found.children || [];
                    } else {
                        break;
                    }
                }
                setSelectedOptions(newSelectedOptions);
                // If path is complete (no children), show last tab. If has children, show next tab.
                const last = newSelectedOptions[newSelectedOptions.length - 1];
                if (last && last.children && last.children.length > 0) {
                    setActiveTabIndex(newSelectedOptions.length);
                } else {
                    setActiveTabIndex(Math.max(0, newSelectedOptions.length - 1));
                }
            } else {
                setSelectedOptions([]);
                setActiveTabIndex(0);
            }
        }
    }, [visible, value, options]);

    // Calculate columns based on selection
    const tabs = useMemo(() => {
        const list = selectedOptions.map(opt => ({ label: opt.label, value: opt.value }));
        // Add placeholder tab if we haven't reached a leaf or if list is empty
        const lastSelected = selectedOptions[selectedOptions.length - 1];
        if (!lastSelected || (lastSelected.children && lastSelected.children.length > 0)) {
             // Only add placeholder if we are currently at the "next" step
             if (activeTabIndex === selectedOptions.length) {
                list.push({ label: displayPlaceholder, value: '__placeholder__' });
             }
        }
        return list;
    }, [selectedOptions, activeTabIndex, displayPlaceholder]);

    // Get options for current active tab
    const currentList = useMemo(() => {
        if (activeTabIndex === 0) return options;
        const parentOption = selectedOptions[activeTabIndex - 1];
        return parentOption ? (parentOption.children || []) : [];
    }, [options, selectedOptions, activeTabIndex]);

    const handleSelect = (option: CascaderOption) => {
        if (option.disabled) return;

        const newSelectedOptions = selectedOptions.slice(0, activeTabIndex);
        newSelectedOptions.push(option);
        setSelectedOptions(newSelectedOptions);

        const nextValue = newSelectedOptions.map(o => o.value);
        if (onChange) onChange(nextValue, newSelectedOptions);

        if (option.children && option.children.length > 0) {
            setActiveTabIndex(activeTabIndex + 1);
        } else {
            // Finished
            onFinish(newSelectedOptions);
            onClose();
        }
    };

    return (
        <ActionSheet visible={visible} onClose={onClose} title={displayTitle} height="70vh">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Tabs */}
                <div style={{ 
                    display: 'flex', borderBottom: '0.5px solid var(--border-color)', 
                    padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' 
                }}>
                    {tabs.map((tab, index) => {
                        const isActive = index === activeTabIndex;
                        return (
                            <div 
                                key={tab.value}
                                onClick={() => setActiveTabIndex(index)}
                                style={{ 
                                    padding: '14px 4px', marginRight: '24px', fontSize: '15px',
                                    color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                                    fontWeight: isActive ? 600 : 400,
                                    position: 'relative', cursor: 'pointer', whiteSpace: 'nowrap'
                                }}
                            >
                                {tab.label}
                                {isActive && (
                                    <div style={{ 
                                        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
                                        width: '20px', height: '3px', background: 'var(--primary-color)', borderRadius: '2px' 
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                    {currentList.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('component.empty.text')}</div>
                    ) : (
                        currentList.map(item => {
                            const isSelected = selectedOptions[activeTabIndex]?.value === item.value;
                            return (
                                <div 
                                    key={item.value} 
                                    onClick={() => handleSelect(item)} 
                                    style={{ 
                                        padding: '16px 20px', fontSize: '15px', 
                                        color: item.disabled ? 'var(--text-placeholder)' : (isSelected ? 'var(--primary-color)' : 'var(--text-primary)'),
                                        fontWeight: isSelected ? 500 : 400,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                                        background: isSelected ? 'var(--bg-cell-top)' : 'transparent'
                                    }}
                                >
                                    {item.label}
                                    {isSelected && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </ActionSheet>
    );
};
