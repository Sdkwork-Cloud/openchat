import React from "react";
import { cn } from "../../../lib/utils";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary",
  outline: "border border-border text-text-primary hover:bg-bg-secondary",
  destructive: "bg-error text-white hover:bg-red-600",
  success: "bg-success text-white hover:bg-green-600",
  warning: "bg-warning text-white hover:bg-amber-600",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "default", className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";

export default Badge;
