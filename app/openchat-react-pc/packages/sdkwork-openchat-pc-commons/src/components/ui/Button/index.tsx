/**
 * Button 缁勪欢 - 浼佷笟绾ф寜閽粍浠? *
 * 璁捐鍘熷垯锛? * 1. 鍗曚竴鑱岃矗锛氬彧璐熻矗鎸夐挳灞曠ず鍜岀偣鍑讳氦浜? * 2. 寮€闂師鍒欙細閫氳繃variant/size鎵╁睍鏍峰紡锛屼笉淇敼婧愮爜
 * 3. 渚濊禆鍊掔疆锛氫緷璧栨娊璞＄被鍨嬪畾涔? */

import React from "react";
import type { BaseComponentProps } from "../../../types/common";

// ==================== 绫诲瀷瀹氫箟 ====================

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "destructive";
export type ButtonSize = "default" | "small" | "large" | "sm" | "icon";
export type ButtonShape = "default" | "circle" | "round";

export interface ButtonProps extends BaseComponentProps {
  /** 鎸夐挳绫诲瀷 */
  variant?: ButtonVariant;
  /** 鎸夐挳灏哄 */
  size?: ButtonSize;
  /** 鎸夐挳褰㈢姸 */
  shape?: ButtonShape;
  /** 鏄惁绂佺敤 */
  disabled?: boolean;
  /** 鏄惁鍔犺浇涓?*/
  loading?: boolean;
  /** 鏄惁鍧楃骇鎸夐挳 */
  block?: boolean;
  /** 鍥炬爣 */
  icon?: React.ReactNode;
  /** 鍥炬爣浣嶇疆 */
  iconPosition?: "left" | "right";
  /** 鐐瑰嚮浜嬩欢 */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** 鎸夐挳绫诲瀷 */
  type?: "button" | "submit" | "reset";
  /** 鍘熺敓title灞炴€?*/
  title?: string;
}

// ==================== 鏍峰紡鏄犲皠 ====================

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-white hover:bg-primary-hover hover:scale-105 hover:shadow-lg active:bg-primary-dark shadow-glow-primary hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  primary:
    "bg-primary text-white hover:bg-primary-hover hover:scale-105 hover:shadow-lg active:bg-primary-dark shadow-glow-primary hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  secondary:
    "bg-bg-secondary text-text-primary border border-border hover:bg-bg-tertiary hover:border-primary-light hover:scale-[1.02]",
  outline:
    "bg-transparent border border-border text-text-primary hover:border-primary hover:text-primary hover:bg-primary/5 hover:scale-[1.02]",
  ghost:
    "bg-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary hover:scale-[1.02]",
  danger:
    "bg-error text-white hover:bg-red-600 hover:scale-105 hover:shadow-lg active:bg-red-700 shadow-glow-error hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
  destructive:
    "bg-error text-white hover:bg-red-600 hover:scale-105 hover:shadow-lg active:bg-red-700 shadow-glow-error hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm h-9",
  small: "px-3 py-1.5 text-xs h-7",
  sm: "px-3 py-1.5 text-xs h-7",
  large: "px-6 py-2.5 text-base h-11",
  icon: "h-9 w-9 p-0",
};

const shapeStyles: Record<ButtonShape, string> = {
  default: "rounded-md",
  circle: "rounded-full w-9 h-9 p-0",
  round: "rounded-full",
};

// ==================== 缁勪欢瀹炵幇 ====================

/**
 * Button 浼佷笟绾ф寜閽粍浠? *
 * @example
 * ```tsx
 * // 鍩虹鐢ㄦ硶
 * <Button>榛樿鎸夐挳</Button>
 *
 * // 鍙樹綋
 * <Button variant="primary">涓绘寜閽?/Button>
 * <Button variant="danger">鍗遍櫓鎸夐挳</Button>
 *
 * // 灏哄
 * <Button size="small">灏忔寜閽?/Button>
 * <Button size="large">澶ф寜閽?/Button>
 *
 * // 鍔犺浇鐘舵€? * <Button loading>鍔犺浇涓?/Button>
 *
 * // 甯﹀浘鏍? * <Button icon={<Icon />}>鍥炬爣鎸夐挳</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "default",
      shape = "default",
      disabled = false,
      loading = false,
      block = false,
      icon,
      iconPosition = "left",
      onClick,
      type = "button",
      className,
      style,
      title,
    },
    ref,
  ) => {
    // 璁＄畻鏍峰紡绫诲悕
    const classes = [
      // 鍩虹鏍峰紡
      "inline-flex items-center justify-center font-medium transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-bg-primary",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
      // 寰氦浜?- 鐐瑰嚮缂╂斁鏁堟灉
      "active:scale-[0.98] active:brightness-90 transform",
      // 鍙樹綋鏍峰紡
      variantStyles[variant],
      // 灏哄鏍峰紡
      sizeStyles[size],
      // 褰㈢姸鏍峰紡
      shapeStyles[shape],
      // 鍧楃骇鏍峰紡
      block ? "w-full" : "",
      // 鍔犺浇鐘舵€?      loading ? "cursor-wait" : "",
      // 鑷畾涔夌被鍚?      className,
    ]
      .filter(Boolean)
      .join(" ");

    // 澶勭悊鐐瑰嚮浜嬩欢
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    // 鍔犺浇鍥炬爣
    const loadingIcon = (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        style={style}
        onClick={handleClick}
        disabled={disabled || loading}
        title={title}
      >
        {/* 鍔犺浇鍥炬爣 */}
        {loading && loadingIcon}

        {/* 宸︿晶鍥炬爣 */}
        {!loading && icon && iconPosition === "left" && (
          <span className="mr-2">{icon}</span>
        )}

        {/* 鍐呭 */}
        {children}

        {/* 鍙充晶鍥炬爣 */}
        {!loading && icon && iconPosition === "right" && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;

