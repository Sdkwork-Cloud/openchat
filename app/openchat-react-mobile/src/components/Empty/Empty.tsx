
import React from 'react';
import { useTranslation } from '../../core/i18n/I18nContext';

interface EmptyProps {
    icon?: string;
    text?: string;
    subText?: string;
    action?: React.ReactNode;
    fullHeight?: boolean;
}

export const Empty: React.FC<EmptyProps> = ({ 
    icon = '🍃', 
    text, 
    subText,
    action,
    fullHeight = true 
}) => {
    const { t } = useTranslation();
    const displayText = text || t('component.empty.text');

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: fullHeight ? '100%' : 'auto',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            minHeight: '300px'
        }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5, filter: 'grayscale(1)' }}>
                {icon}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {displayText}
            </div>
            {subText && (
                <div style={{ fontSize: '13px', opacity: 0.8, maxWidth: '240px', lineHeight: 1.5 }}>
                    {subText}
                </div>
            )}
            {action && (
                <div style={{ marginTop: '24px' }}>
                    {action}
                </div>
            )}
        </div>
    );
};
