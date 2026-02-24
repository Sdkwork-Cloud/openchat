
import React from 'react';
import { Platform } from '../../platform';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean; // New prop
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, loading = false }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || loading) return;
    Platform.device.vibrate(5);
    onChange(!checked);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: '50px',
        height: '30px',
        borderRadius: '15px',
        background: checked ? 'var(--primary-color)' : 'rgba(120, 120, 128, 0.16)',
        position: 'relative',
        transition: 'background 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        border: checked ? 'none' : '1px solid rgba(0,0,0,0.05)'
      }}
    >
      <div
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {loading && (
             <div className="switch-spinner" />
        )}
      </div>
      <style>{`
         .switch-spinner {
             width: 14px; height: 14px; 
             border: 2px solid rgba(0,0,0,0.1); 
             border-top-color: var(--primary-color);
             borderRadius: 50%;
             animation: spin 0.8s linear infinite;
         }
      `}</style>
    </div>
  );
};
