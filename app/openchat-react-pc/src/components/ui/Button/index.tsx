/**
 * Button 组件 - 企业级按钮组件
 *
 * 设计原则：
 * 1. 单一职责：只负责按钮展示和点击交互
 * 2. 开闭原则：通过variant/size扩展样式，不修改源码
 * 3. 依赖倒置：依赖抽象类型定义
 */

import React from 'react';
import type { BaseComponentProps } from '../../../types/common';

// ==================== 类型定义 ====================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'default' | 'large';
export type ButtonShape = 'default' | 'circle' | 'round';

export interface ButtonProps extends BaseComponentProps {
  /** 按钮类型 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 按钮形状 */
  shape?: ButtonShape;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否块级按钮 */
  block?: boolean;
  /** 图标 */
  icon?: React.ReactNode;
  /** 图标位置 */
  iconPosition?: 'left' | 'right';
  /** 点击事件 */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** 按钮类型 */
  type?: 'button' | 'submit' | 'reset';
  /** 原生title属性 */
  title?: string;
}

// ==================== 样式映射 ====================

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--ai-primary)] text-white hover:bg-[var(--ai-primary-hover)] active:bg-[var(--ai-primary-dark)] shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)]',
  secondary: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--ai-primary-light)]',
  outline: 'bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--ai-primary)] hover:text-[var(--ai-primary)] hover:bg-[var(--ai-primary)]/5',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
  danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C] shadow-[0_0_20px_rgba(239,68,68,0.3)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  small: 'px-3 py-1.5 text-xs h-7',
  default: 'px-4 py-2 text-sm h-9',
  large: 'px-6 py-2.5 text-base h-11',
};

const shapeStyles: Record<ButtonShape, string> = {
  default: 'rounded-md',
  circle: 'rounded-full w-9 h-9 p-0',
  round: 'rounded-full',
};

// ==================== 组件实现 ====================

/**
 * Button 企业级按钮组件
 *
 * @example
 * ```tsx
 * // 基础用法
 * <Button>默认按钮</Button>
 *
 * // 变体
 * <Button variant="primary">主按钮</Button>
 * <Button variant="danger">危险按钮</Button>
 *
 * // 尺寸
 * <Button size="small">小按钮</Button>
 * <Button size="large">大按钮</Button>
 *
 * // 加载状态
 * <Button loading>加载中</Button>
 *
 * // 带图标
 * <Button icon={<Icon />}>图标按钮</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'default',
      shape = 'default',
      disabled = false,
      loading = false,
      block = false,
      icon,
      iconPosition = 'left',
      onClick,
      type = 'button',
      className,
      style,
      title,
    },
    ref
  ) => {
    // 计算样式类名
    const classes = [
      // 基础样式
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-[var(--ai-primary)]/30',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
      // 微交互 - 点击缩放效果
      'active:scale-[0.98] transform',
      // 变体样式
      variantStyles[variant],
      // 尺寸样式
      sizeStyles[size],
      // 形状样式
      shapeStyles[shape],
      // 块级样式
      block ? 'w-full' : '',
      // 加载状态
      loading ? 'cursor-wait' : '',
      // 自定义类名
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // 处理点击事件
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    // 加载图标
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
        {/* 加载图标 */}
        {loading && loadingIcon}

        {/* 左侧图标 */}
        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2">{icon}</span>
        )}

        {/* 内容 */}
        {children}

        {/* 右侧图标 */}
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
