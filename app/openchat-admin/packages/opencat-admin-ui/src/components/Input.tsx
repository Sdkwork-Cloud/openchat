import type { InputHTMLAttributes } from 'react';
import { classNames } from './AdminPrimitives';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames('field-input', className)} {...props} />;
}
