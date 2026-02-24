
import React from 'react';

interface FormItemProps {
    label?: string;
    children: React.ReactNode;
    required?: boolean;
    error?: string; // Error message
    extra?: React.ReactNode; // Right side content (e.g. unit, icon)
    layout?: 'horizontal' | 'vertical';
    style?: React.CSSProperties;
    border?: boolean;
    className?: string;
    onClick?: () => void;
}

export const FormItem: React.FC<FormItemProps> = ({ 
    label, 
    children, 
    required = false, 
    error, 
    extra, 
    layout = 'horizontal',
    style,
    border = true,
    className = '',
    onClick
}) => {
    // Clone children to inject props if it's an Input
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            // Remove internal borders/backgrounds from Input when inside FormItem
            return React.cloneElement(child as React.ReactElement<any>, {
                variant: 'ghost',
                containerStyle: { marginBottom: 0, padding: 0, height: '100%' },
                style: { padding: 0 }
            });
        }
        return child;
    });

    return (
        <div 
            className={className}
            onClick={onClick}
            style={{ 
                paddingLeft: '16px',
                background: 'var(--bg-card)',
                cursor: onClick ? 'pointer' : 'default',
                ...style 
            }}
        >
            <div style={{
                display: 'flex',
                flexDirection: layout === 'vertical' ? 'column' : 'row',
                alignItems: layout === 'horizontal' ? 'center' : 'stretch',
                padding: '14px 16px 14px 0',
                borderBottom: border ? '0.5px solid var(--border-color)' : 'none',
                minHeight: '52px'
            }}>
                {label && (
                    <div style={{ 
                        width: layout === 'horizontal' ? '100px' : 'auto', 
                        marginBottom: layout === 'vertical' ? '8px' : '0',
                        fontSize: '16px', color: 'var(--text-primary)',
                        flexShrink: 0, display: 'flex', alignItems: 'center'
                    }}>
                        {required && <span style={{ color: '#fa5151', marginRight: '2px' }}>*</span>}
                        {label}
                    </div>
                )}
                
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    {childrenWithProps}
                </div>
                
                {extra && (
                    <div style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '15px' }}>
                        {extra}
                    </div>
                )}
            </div>
            
            {error && (
                <div style={{ fontSize: '12px', color: '#fa5151', padding: '0 16px 8px 16px', animation: 'fadeIn 0.2s' }}>
                    {error}
                </div>
            )}
        </div>
    );
};
