import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from './AdminPrimitives';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'muted' | 'critical';
  children: ReactNode;
}

export function Button({
  className,
  variant = 'primary',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'muted' && 'btn-muted',
        variant === 'critical' && 'btn-critical',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
