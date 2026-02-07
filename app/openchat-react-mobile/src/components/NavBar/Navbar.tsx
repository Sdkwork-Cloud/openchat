
import React from 'react';
import { navigateBack } from '../../router';
import './Navbar.mobile.css';

export interface NavbarProps {
  title: string;
  onBack?: () => void;
  backFallback?: string;
  rightElement?: React.ReactNode;
  showBack?: boolean;
  variant?: 'default' | 'transparent';
}

const Icons = {
  back: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>,
};

export const Navbar: React.FC<NavbarProps> = ({ 
    title, 
    onBack, 
    backFallback = '/', 
    rightElement,
    showBack = true,
    variant = 'default'
}) => {
  
  const handleBack = () => {
    if (onBack) {
        onBack();
        return;
    }
    navigateBack(backFallback);
  };

  const isTransparent = variant === 'transparent';

  return (
    <div 
        className={`navbar ${isTransparent ? 'navbar--transparent' : ''}`}
        role="banner"
        style={{
            position: isTransparent ? 'relative' : 'sticky',
            color: isTransparent ? '#ffffff' : 'var(--text-primary)',
            textShadow: isTransparent ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
            borderBottom: isTransparent ? 'none' : undefined
        }}
    >
      {/* Left: Back Button */}
      <div className="navbar__left">
        {showBack && (
            <div 
                className="navbar__back-btn"
                onClick={handleBack} 
                role="button"
                aria-label="Go back"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleBack()}
            >
                {Icons.back}
            </div>
        )}
      </div>

      {/* Center: Title */}
      <div className="navbar__title" role="heading" aria-level={1}>
        {title}
      </div>

      {/* Right: Actions */}
      <div className="navbar__right">
        {rightElement}
      </div>
    </div>
  );
};
