/**
 * Checkbox 缁勪欢 - 鑷畾涔夌編鍖栫増鏈? */

import React, { forwardRef } from "react";
import { cn } from "../../../lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, disabled, className, id, ...props }, ref) => {
    const controlledId = id || React.useId();

    return (
      <div className="relative flex items-center">
        <input
          ref={ref}
          type="checkbox"
          id={controlledId}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="peer absolute h-5 w-5 opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
          {...props}
        />
        <div
          className={cn(
            "h-5 w-5 rounded-md border-2 border-border bg-bg-secondary transition-all duration-200",
            "peer-checked:bg-primary peer-checked:border-primary peer-checked:shadow-glow-primary",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:border-primary",
            "flex items-center justify-center",
            disabled && "opacity-50 grayscale",
            className
          )}
        >
          <svg
            className={cn(
              "h-3 w-3 text-white transition-opacity duration-200 transform scale-110",
              checked ? "opacity-100" : "opacity-0"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={4}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;

