
import React, { useState, useEffect } from 'react';
import { ActionSheet as ActionSheetComponent } from './ActionSheet';
import { useTranslation } from '../../core/i18n/I18nContext';

// --- Types ---
export interface ActionSheetOption {
    text: string;
    key?: string;
    color?: string; // CSS Color
    desc?: string;
    disabled?: boolean;
}

interface ActionSheetConfig {
    key?: string;
    title?: string;
    actions: ActionSheetOption[];
    onSelect?: (item: ActionSheetOption, index: number) => void;
    onCancel?: () => void;
}

// --- Event Bus ---
const sheetEvents = {
    show: (config: ActionSheetConfig) => {},
    hide: () => {}
};

// --- Container ---
export const ActionSheetContainer: React.FC = () => {
    const { t } = useTranslation();
    const [state, setState] = useState<{ visible: boolean, config: ActionSheetConfig | null }>({ visible: false, config: null });

    useEffect(() => {
        sheetEvents.show = (config) => setState({ visible: true, config });
        sheetEvents.hide = () => setState(s => ({ ...s, visible: false }));
    }, []);

    const { visible, config } = state;

    if (!config) return null;

    return (
        <ActionSheetComponent 
            visible={visible} 
            onClose={() => {
                sheetEvents.hide();
                config.onCancel?.();
            }}
            title={config.title}
            zIndex={2002}
        >
            <div style={{ background: 'var(--bg-body)' }}>
                {config.actions.map((action, idx) => (
                    <div 
                        key={idx}
                        onClick={() => {
                            if (action.disabled) return;
                            config.onSelect?.(action, idx);
                            sheetEvents.hide();
                        }}
                        style={{
                            background: 'var(--bg-card)',
                            padding: '16px',
                            textAlign: 'center',
                            fontSize: '17px',
                            color: action.disabled ? 'var(--text-placeholder)' : (action.color || 'var(--text-primary)'),
                            borderBottom: '0.5px solid var(--border-color)',
                            cursor: action.disabled ? 'not-allowed' : 'pointer',
                            pointerEvents: action.disabled ? 'none' : 'auto'
                        }}
                    >
                        <div>{action.text}</div>
                        {action.desc && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{action.desc}</div>}
                    </div>
                ))}
                
                <div style={{ height: '8px' }} />
                
                <div 
                    onClick={() => {
                        sheetEvents.hide();
                        config.onCancel?.();
                    }}
                    style={{
                        background: 'var(--bg-card)',
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '17px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                    }}
                >
                    {t('common.cancel')}
                </div>
            </div>
        </ActionSheetComponent>
    );
};

// --- API ---

const showActions = (options: { title?: string, actions: ActionSheetOption[] }): Promise<ActionSheetOption | null> => {
    return new Promise((resolve) => {
        sheetEvents.show({
            title: options.title,
            actions: options.actions,
            onSelect: (item) => resolve(item),
            onCancel: () => resolve(null)
        });
    });
};

export const ActionSheet = Object.assign(ActionSheetComponent, {
    showActions,
    close: sheetEvents.hide
});

export const InitActionSheet = ActionSheetContainer;
