/**
 * Input 组件
 * 
 * 职责：
 * 1. 提供统一的输入框样式
 * 2. 支持多种输入类型
 * 3. 支持输入状态（禁用、错误等）
 * 4. 支持自定义样式和图标
 */

import React from 'react';
import { clsx } from 'clsx';

/**
 * 输入框尺寸
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * 输入框属性
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * 输入框尺寸
   */
  inputSize?: InputSize;
  /**
   * 是否有错误
   */
  error?: boolean;
  /**
   * 左侧图标
   */
  leftIcon?: React.ReactNode;
  /**
   * 右侧图标
   */
  rightIcon?: React.ReactNode;
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 容器自定义类名
   */
  containerClassName?: string;
}

/**
 * 输入框组件
 */
export const Input: React.FC<InputProps> = ({
  inputSize = 'md',
  error = false,
  leftIcon,
  rightIcon,
  className,
  containerClassName,
  disabled,
  ...props
}) => {
  // 输入框尺寸样式
  const sizeClasses = {
    sm: 'text-sm px-3 py-1',
    md: 'px-3 py-2',
    lg: 'text-lg px-4 py-3',
  };

  // 组合类名
  const inputClasses = clsx(
    'w-full border rounded-md focus:outline-none focus:ring-2 transition-colors',
    sizeClasses[inputSize],
    error
      ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500',
    disabled && 'bg-gray-100 cursor-not-allowed',
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    className
  );

  // 容器类名
  const containerClasses = clsx(
    'relative',
    containerClassName
  );

  return (
    <div className={containerClasses}>
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="text-gray-400">{leftIcon}</div>
        </div>
      )}
      
      <input
        className={inputClasses}
        disabled={disabled}
        {...props}
      />
      
      {rightIcon && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <div className="text-gray-400">{rightIcon}</div>
        </div>
      )}
    </div>
  );
};

export default Input;
