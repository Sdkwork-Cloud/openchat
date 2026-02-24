
import React from 'react';

interface RateProps {
    value: number;
    count?: number;
    size?: number;
    color?: string;
    voidColor?: string;
    readonly?: boolean;
    allowHalf?: boolean;
    icon?: React.ReactNode;
    onChange?: (value: number) => void;
    style?: React.CSSProperties;
    className?: string;
}

const StarIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
);

export const Rate: React.FC<RateProps> = ({ 
    value, 
    count = 5, 
    size = 20, 
    color = '#ffc107', 
    voidColor = '#e0e0e0',
    readonly = false, 
    allowHalf = false,
    icon = <StarIcon />,
    onChange,
    style,
    className = ''
}) => {
    const stars = [];

    const handleSelect = (e: React.MouseEvent, index: number) => {
        if (readonly || !onChange) return;
        
        let newValue = index + 1;
        
        if (allowHalf) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const left = e.clientX - rect.left;
            if (left < rect.width / 2) {
                newValue -= 0.5;
            }
        }
        
        onChange(newValue);
    };

    for (let i = 0; i < count; i++) {
        let percent = 0;
        if (value > i) {
            if (value >= i + 1) percent = 100;
            else percent = 50; // Half star
        }

        stars.push(
            <div 
                key={i} 
                onClick={(e) => handleSelect(e, i)}
                style={{ 
                    position: 'relative', 
                    display: 'inline-block', 
                    marginRight: i < count - 1 ? 4 : 0,
                    fontSize: size,
                    color: voidColor,
                    cursor: readonly ? 'default' : 'pointer'
                }}
            >
                {/* Background Icon */}
                {icon}
                
                {/* Foreground Icon (Clipped) */}
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, 
                    width: `${percent}%`, 
                    height: '100%', 
                    overflow: 'hidden', 
                    color: color,
                    transition: 'width 0.2s'
                }}>
                    {icon}
                </div>
            </div>
        );
    }

    return (
        <div className={className} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
            {stars}
        </div>
    );
};
