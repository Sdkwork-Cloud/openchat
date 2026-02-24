
import React from 'react';
import { Spinner } from '../Spinner/Spinner';
import { Empty } from '../Empty/Empty';
import { Button } from '../Button/Button';
import { useTranslation } from '../../core/i18n/I18nContext';

export type ViewStatus = 'idle' | 'loading' | 'error' | 'empty' | 'success';

interface StateViewProps {
    status: ViewStatus;
    children: React.ReactNode;
    loadingText?: string;
    errorText?: string;
    emptyText?: string;
    emptyIcon?: string;
    onRetry?: () => void;
    center?: boolean;
    className?: string;
    style?: React.CSSProperties;
    renderLoading?: () => React.ReactNode;
    renderEmpty?: () => React.ReactNode;
}

export const StateView: React.FC<StateViewProps> = ({ 
    status, 
    children, 
    loadingText,
    errorText,
    emptyText,
    emptyIcon,
    onRetry,
    center = true,
    className = '',
    style,
    renderLoading,
    renderEmpty
}) => {
    const { t } = useTranslation();

    const getContainerStyle = (isFixed: boolean): React.CSSProperties => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: isFixed ? '100%' : 'auto',
        width: '100%',
        minHeight: isFixed ? '300px' : '0',
        padding: '40px 0',
        ...style
    });

    // 核心改进：只要状态是 success，优先返回 children
    if (status === 'success') {
        return <div className={className} style={{ width: '100%', ...style }}>{children}</div>;
    }

    if (status === 'loading') {
        return (
            <div className={className} style={getContainerStyle(center)}>
                {renderLoading ? renderLoading() : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <Spinner size={32} color="var(--primary-color)" />
                        {loadingText && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{loadingText}</span>}
                    </div>
                )}
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className={className} style={getContainerStyle(center)}>
                <div style={{ textAlign: 'center', padding: '0 20px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📡</div>
                    <div style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>{errorText || t('component.state_view.error')}</div>
                    {onRetry && (
                        <Button variant="outline" size="sm" onClick={onRetry} style={{ marginTop: '12px' }}>{t('component.state_view.retry')}</Button>
                    )}
                </div>
            </div>
        );
    }

    if (status === 'empty') {
        return (
            <div className={className} style={getContainerStyle(center)}>
                {renderEmpty ? renderEmpty() : (
                    <Empty text={emptyText} icon={emptyIcon} fullHeight={false} />
                )}
            </div>
        );
    }

    return null;
};
