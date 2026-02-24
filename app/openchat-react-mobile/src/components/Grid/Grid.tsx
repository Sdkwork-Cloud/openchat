
import React from 'react';
import { useTouchFeedback } from '../../mobile/hooks/useTouchFeedback';

interface GridProps {
    cols?: number;
    gap?: number;
    border?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

export const Grid: React.FC<GridProps> = ({ 
    cols = 4, 
    gap = 0, 
    border = true, 
    children, 
    style, 
    className = '' 
}) => {
    return (
        <div 
            className={className}
            style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: `${gap}px`,
                position: 'relative',
                ...style 
            }}
        >
            {/* Optional Border Rendering Logic could go here or in Item */}
            {children}
        </div>
    );
};

interface GridItemProps {
    icon: React.ReactNode;
    text: string;
    onClick?: () => void;
    badge?: number | string;
    style?: React.CSSProperties;
    className?: string;
}

export const GridItem: React.FC<GridItemProps> = ({ icon, text, onClick, badge, style, className = '' }) => {
    const { isActive, touchProps } = useTouchFeedback({ disable: !onClick });

    return (
        <div 
            className={className}
            onClick={onClick}
            {...touchProps}
            style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px 8px',
                background: isActive ? 'var(--bg-cell-active)' : 'transparent',
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                transition: 'background 0.1s',
                ...style
            }}
        >
            <div style={{ position: 'relative', marginBottom: '8px', fontSize: '24px', display: 'flex' }}>
                {icon}
                {badge && (
                    <div style={{ 
                        position: 'absolute', top: -5, right: -10, 
                        background: '#fa5151', color: 'white', 
                        fontSize: '10px', height: '14px', minWidth: '14px', padding: '0 4px',
                        borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--bg-card)'
                    }}>
                        {badge}
                    </div>
                )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2 }}>
                {text}
            </div>
        </div>
    );
};
