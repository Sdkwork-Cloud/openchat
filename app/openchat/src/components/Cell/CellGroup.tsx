
import React from 'react';
import './Cell.mobile.css';

interface CellGroupProps {
  title?: string;
  children: React.ReactNode;
  inset?: boolean;
}

export const CellGroup: React.FC<CellGroupProps> = ({ title, children, inset }) => {
  return (
    <div className={`cell-group ${inset ? 'cell-group--inset' : ''}`}>
      {title && <div className="cell-group__title">{title}</div>}
      <div className="cell-group__content">
        {children}
      </div>
    </div>
  );
};
