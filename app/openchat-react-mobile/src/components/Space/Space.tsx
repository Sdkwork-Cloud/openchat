
import React from 'react';

interface SpaceProps {
    children: React.ReactNode;
    direction?: 'horizontal' | 'vertical';
    size?: number | [number, number]; // gap px or [row, col]
    align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    justify?: 'start' | 'end' | 'center' | 'between' | 'around';
    wrap?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export const Space: React.FC<SpaceProps> = ({ 
    children, 
    direction = 'horizontal', 
    size = 8, 
    align,
    justify,
    wrap = false,
    className = '',
    style,
    onClick
}) => {
    const gapStyle = Array.isArray(size) 
        ? `${size[0]}px ${size[1]}px` 
        : `${size}px`;

    const justifyContentMap: Record<string, string> = {
        start: 'flex-start',
        end: 'flex-end',
        center: 'center',
        between: 'space-between',
        around: 'space-around'
    };

    const alignItemsMap: Record<string, string> = {
        start: 'flex-start',
        end: 'flex-end',
        center: 'center',
        baseline: 'baseline',
        stretch: 'stretch'
    };

    return (
        <div 
            className={className}
            onClick={onClick}
            style={{ 
                display: 'flex',
                flexDirection: direction === 'vertical' ? 'column' : 'row',
                gap: gapStyle,
                flexWrap: wrap ? 'wrap' : 'nowrap',
                alignItems: align ? alignItemsMap[align] : (direction === 'horizontal' ? 'center' : undefined),
                justifyContent: justify ? justifyContentMap[justify] : undefined,
                ...style 
            }}
        >
            {children}
        </div>
    );
};
