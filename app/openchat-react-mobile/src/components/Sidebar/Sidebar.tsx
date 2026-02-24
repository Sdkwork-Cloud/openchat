
import React from 'react';
import { useTouchFeedback } from '../../mobile/hooks/useTouchFeedback';

interface SidebarProps {
    activeKey: string | number;
    onChange: (key: string | number) => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    width?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    activeKey, 
    onChange, 
    children, 
    style, 
    className = '',
    width = '100px'
}) => {
    // Clone children to inject props
    const items = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
                active: child.props.itemKey === activeKey,
                onClick: () => onChange(child.props.itemKey)
            });
        }
        return child;
    });

    return (
        <div 
            className={className}
            style={{ 
                width, 
                height: '100%', 
                overflowY: 'auto', 
                backgroundColor: 'var(--bg-body)',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                ...style 
            }}
        >
            {items}
        </div>
    );
};

interface SidebarItemProps {
    title: string;
    itemKey: string | number;
    active?: boolean;
    onClick?: () => void;
    badge?: number | string;
    disabled?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
    title, 
    active, 
    onClick, 
    badge, 
    disabled 
}) => {
    const { isActive, touchProps } = useTouchFeedback({ disable: disabled || active });

    return (
        <div 
            onClick={!disabled ? onClick : undefined}
            {...touchProps}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', // Center text usually for simple sidebars, or left align
                padding: '20px 12px',
                fontSize: '14px',
                lineHeight: 1.4,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                backgroundColor: active ? 'var(--bg-card)' : (isActive ? 'rgba(0,0,0,0.05)' : 'transparent'),
                cursor: disabled ? 'not-allowed' : 'pointer',
                userSelect: 'none',
                transition: 'background-color 0.2s'
            }}
        >
            {active && (
                <div style={{ 
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', 
                    width: '3px', height: '16px', 
                    backgroundColor: 'var(--primary-color)', 
                    borderRadius: '0 3px 3px 0' 
                }} />
            )}
            
            <div style={{ position: 'relative' }}>
                {title}
                {badge && (
                    <div style={{
                        position: 'absolute', top: -6, right: -12,
                        backgroundColor: '#fa5151', color: '#fff',
                        fontSize: '10px', height: '14px', minWidth: '14px',
                        borderRadius: '7px', padding: '0 3px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1
                    }}>
                        {badge}
                    </div>
                )}
            </div>
        </div>
    );
};
