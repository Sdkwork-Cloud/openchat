
import React from 'react';
import { useTouchFeedback } from '../../mobile/hooks/useTouchFeedback';
import './Cell.mobile.css';

export interface CellProps {
  title: React.ReactNode;
  value?: React.ReactNode;
  label?: React.ReactNode; // Subtitle/Description
  icon?: React.ReactNode;
  
  isLink?: boolean;
  clickable?: boolean;
  required?: boolean;
  center?: boolean; // Vertically center content
  
  onClick?: (e: React.MouseEvent) => void;
  
  className?: string;
  style?: React.CSSProperties;
  titleStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
  
  rightIcon?: React.ReactNode; // Custom right icon instead of arrow
  border?: boolean; // Force border visibility
}

export const Cell: React.FC<CellProps> = ({ 
  title, 
  value, 
  label,
  icon,
  isLink, 
  clickable,
  required,
  center,
  onClick,
  className = '',
  style,
  titleStyle,
  valueStyle,
  rightIcon,
  border = true
}) => {
  const isClickable = clickable || isLink || !!onClick;
  const { isActive, touchProps } = useTouchFeedback({ disable: !isClickable });

  return (
    <div 
      className={`
        cell 
        ${isActive ? 'cell--active' : ''} 
        ${center ? 'cell--center' : ''} 
        ${required ? 'cell--required' : ''}
        ${!border ? 'cell--no-border' : ''}
        ${isClickable ? 'cell--clickable' : ''}
        ${className}
      `}
      onClick={onClick}
      {...touchProps}
      style={style}
    >
      {/* Left Icon */}
      {icon && (
        <div className="cell__left-icon">
          {icon}
        </div>
      )}
      
      {/* Title & Label */}
      <div className="cell__title-wrap">
        <div className="cell__title" style={titleStyle}>
          {title}
        </div>
        {label && <div className="cell__label">{label}</div>}
      </div>

      {/* Value (Right Content) */}
      {(value !== undefined || isLink || rightIcon) && (
        <div className="cell__value" style={valueStyle}>
          {value !== undefined && <span className="cell__value-text">{value}</span>}
          
          {rightIcon ? (
             <div className="cell__right-icon">{rightIcon}</div>
          ) : isLink ? (
             <div className="cell__right-icon">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                 <polyline points="9 18 15 12 9 6"></polyline>
               </svg>
             </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
