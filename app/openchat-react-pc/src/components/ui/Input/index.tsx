/**
 * Input 组件 - 企业级输入框组件
 *
 * 设计原则：
 * 1. 单一职责：只负责输入框展示和值管理
 * 2. 开闭原则：通过配置扩展功能
 * 3. 依赖倒置：依赖抽象类型定义
 */

import React, { useState, useCallback, forwardRef } from 'react';
import type { BaseFormProps } from '../../../types/common';

// ==================== 类型定义 ====================

export type InputSize = 'small' | 'default' | 'large';
export type InputVariant = 'default' | 'filled' | 'outlined';

export interface InputProps extends BaseFormProps<string> {
  /** 输入框类型 */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  /** 输入框尺寸 */
  size?: InputSize;
  /** 输入框变体 */
  variant?: InputVariant;
  /** 前缀 */
  prefix?: React.ReactNode;
  /** 后缀 */
  suffix?: React.ReactNode;
  /** 是否显示清除按钮 */
  allowClear?: boolean;
  /** 最大值（number类型） */
  max?: number;
  /** 最小值（number类型） */
  min?: number;
  /** 最大长度 */
  maxLength?: number;
  /** 自动聚焦 */
  autoFocus?: boolean;
  /** 自动完成 */
  autoComplete?: string;
  /** 输入框名称 */
  name?: string;
  /** 输入框ID */
  id?: string;
  /** 输入事件 */
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  /** 聚焦事件 */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** 失焦事件 */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** 按键事件 */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** 按键抬起事件 */
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** 按下回车事件 */
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ==================== 样式映射 ====================

const sizeStyles: Record<InputSize, string> = {
  small: 'h-7 px-2 text-xs',
  default: 'h-9 px-3 text-sm',
  large: 'h-11 px-4 text-base',
};

const variantStyles: Record<InputVariant, string> = {
  default: 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--ai-primary)] focus:ring-2 focus:ring-[var(--ai-primary)]/20',
  filled: 'bg-[var(--bg-tertiary)] border border-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-secondary)] focus:border-[var(--ai-primary)]',
  outlined: 'bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--ai-primary)]',
};

// ==================== 组件实现 ====================

/**
 * Input 企业级输入框组件
 *
 * @example
 * ```tsx
 * // 基础用法
 * <Input placeholder="请输入" />
 *
 * // 带前缀后缀
 * <Input prefix="￥" suffix="元" />
 *
 * // 可清除
 * <Input allowClear />
 *
 * // 密码输入
 * <Input type="password" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      placeholder,
      disabled = false,
      readOnly = false,
      type = 'text',
      size = 'default',
      variant = 'default',
      prefix,
      suffix,
      allowClear = false,
      max,
      min,
      maxLength,
      autoFocus = false,
      autoComplete,
      name,
      id,
      className,
      style,
      onInput,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      onPressEnter,
    },
    ref
  ) => {
    // 受控/非受控状态管理
    const [innerValue, setInnerValue] = useState(defaultValue || '');
    const [focused, setFocused] = useState(false);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : innerValue;

    // 处理值变化
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (!isControlled) {
          setInnerValue(newValue);
        }
        onChange?.(newValue);
      },
      [isControlled, onChange]
    );

    // 处理清除
    const handleClear = useCallback(() => {
      if (!isControlled) {
        setInnerValue('');
      }
      onChange?.('');
    }, [isControlled, onChange]);

    // 处理按键
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          onPressEnter?.(e);
        }
        onKeyDown?.(e);
      },
      [onKeyDown, onPressEnter]
    );

    // 处理聚焦
    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    // 处理失焦
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    // 是否显示清除按钮
    const showClear = allowClear && currentValue && !disabled && !readOnly;

    // 计算样式类名
    const wrapperClasses = [
      'relative flex items-center w-full',
      'transition-all duration-200 rounded-md',
      variantStyles[variant],
      focused ? 'border-[var(--ai-primary)] ring-2 ring-[var(--ai-primary)]/20' : '',
      disabled ? 'bg-[var(--bg-tertiary)] cursor-not-allowed opacity-60' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = [
      'flex-1 w-full bg-transparent outline-none',
      sizeStyles[size],
      'placeholder:text-[var(--text-muted)]',
      disabled ? 'cursor-not-allowed' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses} style={style}>
        {/* 前缀 */}
        {prefix && (
          <span className="flex-shrink-0 mr-2 text-[var(--text-secondary)]">{prefix}</span>
        )}

        {/* 输入框 */}
        <input
          ref={ref}
          type={type}
          value={currentValue}
          onChange={handleChange}
          onInput={onInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyUp={onKeyUp}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          max={max}
          min={min}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          name={name}
          id={id}
          className={inputClasses}
        />

        {/* 清除按钮 */}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 ml-2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* 后缀 */}
        {suffix && (
          <span className="flex-shrink-0 ml-2 text-[var(--text-secondary)]">{suffix}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
