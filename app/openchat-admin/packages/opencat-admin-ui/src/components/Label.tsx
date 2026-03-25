import type { LabelHTMLAttributes, ReactNode } from 'react';
import { classNames } from './AdminPrimitives';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={classNames('field-label', className)} {...props}>
      {children}
    </label>
  );
}
