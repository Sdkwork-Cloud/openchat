/**
 * Checkbox 组件
 */

import React, { forwardRef } from "react";
import { cn } from "../../../lib/utils";

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, disabled, className }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        className={cn(
          "w-4 h-4 rounded border border-border text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-bg-primary",
          "transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
