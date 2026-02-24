
import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  content?: number | string;
  max?: number;
  dot?: boolean;
  color?: string;
  offset?: [number, number]; 
  style?: React.CSSProperties;
  className?: string;
  showZero?: boolean;
  pulse?: boolean; // 新增：呼吸动效
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  content,
  max = 99,
  dot = false,
  color = 'var(--danger)',
  offset,
  style,
  className = '',
  showZero = false,
  pulse = false
}) => {
  const hasContent = (content !== undefined && (content !== 0 || showZero)) || dot;

  const badgeElement = (
      <sup
        className={pulse ? 'badge-pulse' : ''}
        style={{
          position: children ? 'absolute' : 'relative',
          top: children ? 0 : 'auto',
          right: children ? 0 : 'auto',
          transform: children ? `translate(${50 + (offset?.[0] || 0)}%, ${-50 + (offset?.[1] || 0)}%)` : 'none',
          transformOrigin: '100% 0%',
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: color,
          color: '#fff',
          whiteSpace: 'nowrap',
          borderRadius: dot ? '50%' : '10px',
          minWidth: dot ? '8px' : '18px',
          height: dot ? '8px' : '18px',
          padding: dot ? 0 : '0 5px',
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: children ? '0 0 0 1.5px var(--bg-card)' : 'none',
          fontFamily: 'DIN Alternate, system-ui',
          ...style
        }}
      >
        {!dot && (typeof content === 'number' && content > max ? `${max}+` : content)}
        <style>{`
            @keyframes badge-pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0px ${color}40; }
                50% { transform: scale(1.1); box-shadow: 0 0 0 6px ${color}00; }
                100% { transform: scale(1); box-shadow: 0 0 0 0px ${color}00; }
            }
            .badge-pulse { animation: badge-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1); }
        `}</style>
      </sup>
  );

  if (!children) return hasContent ? badgeElement : null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }} className={className}>
      {children}
      {hasContent && badgeElement}
    </div>
  );
};
