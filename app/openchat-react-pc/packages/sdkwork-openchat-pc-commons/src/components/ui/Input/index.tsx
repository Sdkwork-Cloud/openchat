/**
 * Input 缁勪欢 - 浼佷笟绾ц緭鍏ユ缁勪欢
 *
 * 璁捐鍘熷垯锛? * 1. 鍗曚竴鑱岃矗锛氬彧璐熻矗杈撳叆妗嗗睍绀哄拰鍊肩鐞? * 2. 寮€闂師鍒欙細閫氳繃閰嶇疆鎵╁睍鍔熻兘
 * 3. 渚濊禆鍊掔疆锛氫緷璧栨娊璞＄被鍨嬪畾涔? */

import React, { useState, useCallback, forwardRef } from "react";
import type { BaseFormProps } from "../../../types/common";

// ==================== 绫诲瀷瀹氫箟 ====================

export type InputSize = "small" | "default" | "large";
export type InputVariant = "default" | "filled" | "outlined";

export interface InputProps extends BaseFormProps<string> {
  /** 杈撳叆妗嗙被鍨?*/
  type?: "text" | "password" | "email" | "number" | "tel" | "url" | "search";
  /** 杈撳叆妗嗗昂瀵?*/
  size?: InputSize;
  /** 杈撳叆妗嗗彉浣?*/
  variant?: InputVariant;
  /** 鍓嶇紑 */
  prefix?: React.ReactNode;
  /** 鍚庣紑 */
  suffix?: React.ReactNode;
  /** 鏄惁鏄剧ず娓呴櫎鎸夐挳 */
  allowClear?: boolean;
  /** 鏈€澶у€硷紙number绫诲瀷锛?*/
  max?: number;
  /** 鏈€灏忓€硷紙number绫诲瀷锛?*/
  min?: number;
  /** 鏈€澶ч暱搴?*/
  maxLength?: number;
  /** 鑷姩鑱氱劍 */
  autoFocus?: boolean;
  /** 鑷姩瀹屾垚 */
  autoComplete?: string;
  /** 杈撳叆妗嗗悕绉?*/
  name?: string;
  /** 杈撳叆妗咺D */
  id?: string;
  /** 杈撳叆浜嬩欢 */
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  /** 鑱氱劍浜嬩欢 */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** 澶辩劍浜嬩欢 */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** 鎸夐敭浜嬩欢 */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** 鎸夐敭鎶捣浜嬩欢 */
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** 鎸変笅鍥炶溅浜嬩欢 */
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ==================== 鏍峰紡鏄犲皠 ====================

const sizeStyles: Record<InputSize, string> = {
  small: "h-7 px-2 text-xs",
  default: "h-9 px-3 text-sm",
  large: "h-11 px-4 text-base",
};

const variantStyles: Record<InputVariant, string> = {
  default:
    "bg-bg-tertiary/80 border border-border text-text-primary placeholder:text-text-muted focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-lg",
  filled:
    "bg-bg-tertiary border border-transparent text-text-primary placeholder:text-text-muted focus-within:bg-bg-secondary focus-within:border-primary rounded-lg",
  outlined:
    "bg-transparent border border-border text-text-primary placeholder:text-text-muted focus-within:border-primary rounded-lg",
};

// ==================== 缁勪欢瀹炵幇 ====================

/**
 * Input 浼佷笟绾ц緭鍏ユ缁勪欢
 *
 * @example
 * ```tsx
 * // 鍩虹鐢ㄦ硶
 * <Input placeholder="璇疯緭鍏? />
 *
 * // 甯﹀墠缂€鍚庣紑
 * <Input prefix="锟? suffix="鍏? />
 *
 * // 鍙竻闄? * <Input allowClear />
 *
 * // 瀵嗙爜杈撳叆
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
      type = "text",
      size = "default",
      variant = "default",
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
    ref,
  ) => {
    // 鍙楁帶/闈炲彈鎺х姸鎬佺鐞?    const [innerValue, setInnerValue] = useState(defaultValue || "");
    const [focused, setFocused] = useState(false);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : innerValue;

    // 澶勭悊鍊煎彉鍖?    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (!isControlled) {
          setInnerValue(newValue);
        }
        onChange?.(newValue);
      },
      [isControlled, onChange],
    );

    // 澶勭悊娓呴櫎
    const handleClear = useCallback(() => {
      if (!isControlled) {
        setInnerValue("");
      }
      onChange?.("");
    }, [isControlled, onChange]);

    // 澶勭悊鎸夐敭
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          onPressEnter?.(e);
        }
        onKeyDown?.(e);
      },
      [onKeyDown, onPressEnter],
    );

    // 澶勭悊鑱氱劍
    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    // 澶勭悊澶辩劍
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    // 鏄惁鏄剧ず娓呴櫎鎸夐挳
    const showClear = allowClear && currentValue && !disabled && !readOnly;

    // 璁＄畻鏍峰紡绫诲悕
    const wrapperClasses = [
      "relative flex items-center w-full",
      "transition-all duration-200",
      variantStyles[variant],
      focused ? "border-primary ring-2 ring-primary/20" : "",
      disabled ? "bg-bg-tertiary cursor-not-allowed opacity-60" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const inputClasses = [
      "flex-1 w-full bg-transparent outline-none",
      sizeStyles[size],
      "placeholder:text-text-muted",
      disabled ? "cursor-not-allowed" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses} style={style}>
        {/* 鍓嶇紑 */}
        {prefix && (
          <span className="flex-shrink-0 mr-2 text-text-secondary">
            {prefix}
          </span>
        )}

        {/* 杈撳叆妗?*/}
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

        {/* 娓呴櫎鎸夐挳 */}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 ml-2 p-0.5 text-text-muted hover:text-text-secondary transition-colors"
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

        {/* 鍚庣紑 */}
        {suffix && (
          <span className="flex-shrink-0 ml-2 text-text-secondary">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;

