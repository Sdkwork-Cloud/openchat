
import React, { useMemo } from 'react';
import { SmartImage } from '../SmartImage/SmartImage';
import { Badge } from '../Badge/Badge';

export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline';

interface AvatarProps {
    src?: string | string[] | React.ReactNode; 
    alt?: string;
    size?: number;
    shape?: 'circle' | 'square' | 'rounded';
    fallbackText?: string;
    style?: React.CSSProperties;
    onClick?: (e: React.MouseEvent) => void;
    badge?: number | string;
    border?: boolean;
    status?: AvatarStatus;
}

export const Avatar: React.FC<AvatarProps> = ({ 
    src, 
    alt, 
    size = 48, 
    shape = 'rounded', 
    fallbackText,
    style,
    onClick,
    badge,
    border = true,
    status
}) => {
    const borderRadius = shape === 'circle' ? '50%' : (shape === 'rounded' ? '8px' : '0');
    
    const content = useMemo(() => {
        // 1. 群组头像集 (Array of strings)
        if (Array.isArray(src)) {
            const count = src.length;
            const gridStyle: React.CSSProperties = {
                display: 'grid',
                width: '100%', height: '100%',
                background: '#e5e5e5',
                padding: '2px',
                gap: '2px',
                boxSizing: 'border-box'
            };

            if (count === 1) return <SmartImage src={src[0]} radius={borderRadius} style={{width: '100%', height: '100%'}} preview={false} />;
            
            if (count <= 4) {
                gridStyle.gridTemplateColumns = 'repeat(2, 1fr)';
                gridStyle.gridTemplateRows = 'repeat(2, 1fr)';
            } else {
                gridStyle.gridTemplateColumns = 'repeat(3, 1fr)';
                gridStyle.gridTemplateRows = 'repeat(3, 1fr)';
            }

            return (
                <div style={gridStyle}>
                    {src.slice(0, 9).map((url, i) => (
                        <SmartImage 
                            key={i} 
                            src={typeof url === 'string' ? url : ''} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            preview={false} 
                            radius={1}
                        />
                    ))}
                </div>
            );
        }

        // 2. 传递了 React Node (如图标)
        if (React.isValidElement(src)) {
            return (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {src}
                </div>
            );
        }
        
        // 3. 正常图片 URL
        if (typeof src === 'string' && (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:'))) {
            return (
                <SmartImage 
                    src={src}
                    alt={alt || 'avatar'}
                    radius={borderRadius}
                    skeletonVariant={shape === 'circle' ? 'circle' : 'rect'}
                    preview={false}
                    style={{ width: '100%', height: '100%' }}
                />
            );
        }

        // 4. 文字占位 (首字母自动着色)
        if (fallbackText) {
            let hash = 0;
            for (let i = 0; i < fallbackText.length; i++) {
                hash = fallbackText.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash % 360);
            
            return (
                <div style={{
                    width: '100%', height: '100%', 
                    background: `linear-gradient(135deg, hsl(${hue}, 60%, 65%) 0%, hsl(${hue}, 60%, 50%) 100%)`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 600, fontSize: size * 0.4,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                    {fallbackText.slice(0, 2).toUpperCase()}
                </div>
            );
        }

        // 5. 最终兜底 (默认人形)
        return (
            <div style={{
                width: '100%', height: '100%', 
                background: 'var(--bg-cell-active)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)'
            }}>
                <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            </div>
        );
    }, [src, alt, size, shape, fallbackText, borderRadius]);

    const AvatarElement = (
        <div 
            onClick={onClick}
            className="avatar-wrapper"
            style={{ 
                width: size, 
                height: size, 
                borderRadius: borderRadius, 
                position: 'relative',
                flexShrink: 0,
                cursor: onClick ? 'pointer' : 'default',
                boxShadow: border ? 'inset 0 0 0 0.5px rgba(0,0,0,0.1)' : 'none', 
                background: 'var(--bg-card)', 
                ...style 
            }}
        >
            <div style={{ width: '100%', height: '100%', borderRadius: borderRadius, overflow: 'hidden' }}>
                {content}
            </div>

            {status && (
                <div style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: Math.max(10, size * 0.22),
                    height: Math.max(10, size * 0.22),
                    borderRadius: '50%',
                    background: status === 'online' ? '#07c160' : (status === 'busy' ? '#fa5151' : (status === 'away' ? '#ffc300' : '#888')),
                    border: '1.5px solid var(--bg-card)',
                    boxSizing: 'content-box',
                    zIndex: 2
                }} />
            )}
        </div>
    );

    if (badge !== undefined && badge !== null) {
        return <Badge content={badge} offset={[-4, 4]}>{AvatarElement}</Badge>;
    }

    return AvatarElement;
};
