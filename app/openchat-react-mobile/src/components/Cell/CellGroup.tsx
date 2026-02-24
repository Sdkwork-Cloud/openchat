
import React from 'react';
import './Cell.mobile.css';

interface CellGroupProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  inset?: boolean; // Card style
  border?: boolean; // Outer borders
  style?: React.CSSProperties;
  className?: string;
}

export const CellGroup: React.FC<CellGroupProps> = ({ 
  title, 
  children, 
  inset = false, 
  border = true,
  style,
  className = ''
}) => {
  return (
    <div 
      className={`
        cell-group 
        ${inset ? 'cell-group--inset' : ''} 
        ${!border ? 'cell-group--no-border' : ''}
        ${className}
      `}
      style={style}
    >
      {title && <div className="cell-group__title">{title}</div>}
      <div className="cell-group__content">
        {children}
      </div>
    </div>
  );
};
