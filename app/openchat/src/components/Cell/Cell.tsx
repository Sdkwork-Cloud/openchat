
import React from 'react';
import { useTouchFeedback } from '../../mobile/hooks/useTouchFeedback';
import './Cell.mobile.css';

export interface CellProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  value?: React.ReactNode;
  label?: React.ReactNode; // Description below title
  isLink?: boolean;
  onClick?: () => void;
  iconColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Cell: React.FC<CellProps> = ({ 
  title, 
  icon, 
  value, 
  label,
  isLink, 
  onClick, 
  iconColor,
  style,
  className = ''
}) => {
  const { isActive, touchProps } = useTouchFeedback({ disable: !onClick });

  return (
    <div 
      className={`cell ${isActive ? 'cell--active' : ''} ${className}`}
      onClick={onClick}
      {...touchProps}
      style={style}
    >
      {icon && (
        <div 
          className="cell__icon" 
          style={{ color: iconColor || 'var(--text-primary)' }}
        >
          {icon}
        </div>
      )}
      
      <div className="cell__content">
        <div className="cell__title">{title}</div>
        {label && <div className="cell__label">{label}</div>}
      </div>

      {(value || isLink) && (
        <div className="cell__value">
          {value && <span className="cell__value-text">{value}</span>}
          {isLink && <div className="cell__arrow">›</div>}
        </div>
      )}
    </div>
  );
};
