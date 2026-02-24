
import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rect' | 'circle';
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, variant = 'rect', style, className = '' }) => {
  const baseStyle: React.CSSProperties = {
      width,
      height,
      backgroundColor: 'var(--bg-cell-active)', // Adaptive dark/light mode color
      position: 'relative',
      overflow: 'hidden',
      borderRadius: variant === 'circle' ? '50%' : (variant === 'text' ? '4px' : '8px'),
      ...style
  };

  return (
    <div 
      className={`skeleton-shimmer ${className}`} 
      style={baseStyle}
    />
  );
};
