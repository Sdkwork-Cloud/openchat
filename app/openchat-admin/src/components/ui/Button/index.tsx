/**
 * Button 组件
 * 
 * 职责：
 * 1. 提供统一的按钮样式
 * 2. 支持多种按钮类型和尺寸
 * 3. 支持按钮状态（禁用、加载等）
 * 4. 支持自定义样式和图标
 */

import React from 'react';
import { clsx } from 'clsx';

/**
 * 按钮类型
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';

/**
 * 按钮尺寸
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * 按钮属性
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮类型
   */
  variant?: ButtonVariant;
  /**
   * 按钮尺寸
   */
  size?: ButtonSize;
  /**
   * 是否为加载状态
   */
  loading?: boolean;
  /**
   * 是否为全宽
   */
  fullWidth?: boolean;
  /**
   * 图标
   */
  icon?: React.ReactNode;
  /**
   * 子元素
   */
  children?: React.ReactNode;
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 按钮组件
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  // 按钮类型样式
  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-2 focus:ring-danger-500 focus:ring-offset-2',
    success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-2 focus:ring-success-500 focus:ring-offset-2',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-2 focus:ring-warning-500 focus:ring-offset-2',
  };

  // 按钮尺寸样式
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  // 组合类名
  const buttonClasses = clsx(
    'rounded-md font-medium transition-colors focus:outline-none focus:ring-offset-2 focus:ring-2 focus:ring-opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    disabled && 'opacity-50 cursor-not-allowed',
    loading && 'opacity-75 cursor-not-allowed',
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
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
      )}
      {icon && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
    </button>
  );
};

export default Button;
