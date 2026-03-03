import React from "react";
import { cn } from "../../../lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: AvatarSize;
  status?: "online" | "offline" | "away" | "busy";
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const statusColors: Record<string, string> = {
  online: "bg-success",
  offline: "bg-text-muted",
  away: "bg-warning",
  busy: "bg-error",
};

const statusSizes: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5 border",
  sm: "h-2 w-2 border",
  md: "h-2.5 w-2.5 border-2",
  lg: "h-3 w-3 border-2",
  xl: "h-4 w-4 border-2",
};

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ children, className, size = "md", status, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full transition-transform duration-200 hover:scale-105",
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-bg-primary",
              statusColors[status],
              statusSizes[size],
            )}
          />
        )}
      </span>
    );
  },
);
Avatar.displayName = "Avatar";

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt, className, ...props }, ref) => {
    if (!src) return null;

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn("aspect-square h-full w-full object-cover", className)}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  delayMs?: number;
}

export const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  AvatarFallbackProps
>(({ children, className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-bg-tertiary text-text-secondary text-sm font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
});
AvatarFallback.displayName = "AvatarFallback";

export default Avatar;

