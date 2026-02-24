
import React, { useState, useEffect, useCallback } from 'react';
import { DialogComponent, DialogProps, DialogAction } from './Dialog';
import { useTranslation } from '../../core/i18n/I18nContext';

// --- Event Bus for Dialog ---
type DialogConfig = Omit<DialogProps, 'visible'> & {
    key?: string;
    onClose?: () => void;
};

const dialogEvents = {
    show: (config: DialogConfig) => {},
    hide: (key?: string) => {}
};

// Constants for Late Binding Translation
const PLACEHOLDERS = {
    CONFIRM: '$$CONFIRM$$',
    CANCEL: '$$CANCEL$$'
};

// --- Container ---
export const DialogContainer: React.FC = () => {
    const { t } = useTranslation();
    const [dialogs, setDialogs] = useState<DialogConfig[]>([]);

    useEffect(() => {
        dialogEvents.show = (config) => {
            setDialogs(prev => [...prev, { ...config, key: config.key || `dialog_${Date.now()}` }]);
        };
        dialogEvents.hide = (key) => {
            setDialogs(prev => key ? prev.filter(d => d.key !== key) : []);
        };
    }, []);

    // Translate Actions on the fly
    const translateActions = (actions?: DialogAction[]): DialogAction[] | undefined => {
        if (!actions) return undefined;
        return actions.map(action => ({
            ...action,
            text: action.text === PLACEHOLDERS.CONFIRM ? t('common.confirm') : 
                  (action.text === PLACEHOLDERS.CANCEL ? t('common.cancel') : action.text)
        }));
    };

    if (dialogs.length === 0) return null;

    return (
        <>
            {dialogs.map(props => (
                <DialogComponent
                    key={props.key}
                    {...props}
                    actions={translateActions(props.actions)}
                    visible={true}
                    onClose={() => {
                        props.onClose?.();
                        dialogEvents.hide(props.key);
                    }}
                />
            ))}
        </>
    );
};

// --- API ---

const show = (props: DialogConfig) => {
    dialogEvents.show(props);
};

const alert = (title: string, message?: string): Promise<void> => {
    return new Promise((resolve) => {
        show({
            title,
            content: message,
            actions: [{ text: PLACEHOLDERS.CONFIRM, primary: true, onClick: () => resolve() }],
            onClose: () => resolve()
        });
    });
};

const confirm = (props: { title: string; content?: string; confirmText?: string; cancelText?: string; danger?: boolean }): Promise<boolean> => {
    return new Promise((resolve) => {
        show({
            title: props.title,
            content: props.content,
            maskClosable: false,
            actions: [
                { 
                    text: props.cancelText || PLACEHOLDERS.CANCEL, 
                    onClick: () => { resolve(false); dialogEvents.hide(); } 
                },
                { 
                    text: props.confirmText || PLACEHOLDERS.CONFIRM, 
                    primary: true,
                    danger: props.danger,
                    onClick: () => { resolve(true); dialogEvents.hide(); } 
                }
            ],
            onClose: () => resolve(false)
        });
    });
};

export const Dialog = Object.assign(DialogComponent, {
    show,
    alert,
    confirm,
    close: dialogEvents.hide
});

export const InitDialog = DialogContainer;
