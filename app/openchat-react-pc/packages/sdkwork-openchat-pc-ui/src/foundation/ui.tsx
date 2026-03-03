import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@sdkwork/openchat-pc-kernel";
import { useTheme, type ThemeType } from "./theme";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "destructive"
  | "success";
export type ButtonSize = "small" | "default" | "large" | "sm" | "md" | "lg" | "icon";

const buttonVariantClass: Record<ButtonVariant, string> = {
  default: "bg-[var(--ai-primary)] text-white hover:brightness-110",
  primary: "bg-[var(--ai-primary)] text-white hover:brightness-110",
  secondary:
    "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]",
  outline:
    "bg-transparent text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--ai-primary)] hover:text-[var(--ai-primary)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};

const buttonSizeClass: Record<ButtonSize, string> = {
  small: "h-7 px-3 text-xs",
  sm: "h-7 px-3 text-xs",
  default: "h-9 px-4 text-sm",
  md: "h-9 px-4 text-sm",
  large: "h-11 px-6 text-base",
  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]",
        buttonVariantClass[variant],
        buttonSizeClass[size],
        className,
      )}
      {...props}
    />
  );
}

export type InputSize = "small" | "default" | "large";
export type InputVariant = "default" | "filled" | "outlined";

const inputSizeClass: Record<InputSize, string> = {
  small: "h-8 px-3 text-xs",
  default: "h-10 px-3 text-sm",
  large: "h-11 px-4 text-base",
};

const inputVariantClass: Record<InputVariant, string> = {
  default:
    "bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] focus-within:border-[var(--ai-primary)] focus-within:ring-2 focus-within:ring-[var(--ai-primary-soft)]",
  filled:
    "bg-[var(--bg-secondary)] border border-transparent text-[var(--text-primary)] focus-within:border-[var(--ai-primary)] focus-within:ring-2 focus-within:ring-[var(--ai-primary-soft)]",
  outlined:
    "bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] focus-within:border-[var(--ai-primary)] focus-within:ring-2 focus-within:ring-[var(--ai-primary-soft)]",
};

export interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "size" | "onChange" | "value" | "defaultValue" | "prefix"
  > {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: InputSize;
  variant?: InputVariant;
  prefix?: ReactNode;
  suffix?: ReactNode;
  allowClear?: boolean;
  inputClassName?: string;
}

export function Input({
  className,
  inputClassName,
  value,
  defaultValue = "",
  onChange,
  size = "default",
  variant = "default",
  prefix,
  suffix,
  allowClear = false,
  disabled,
  readOnly,
  ...props
}: InputProps) {
  const [innerValue, setInnerValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : innerValue;

  const handleValueChange = (nextValue: string) => {
    if (!isControlled) {
      setInnerValue(nextValue);
    }
    onChange?.(nextValue);
  };

  return (
    <div
      className={cn(
        "flex w-full items-center rounded-xl transition-all",
        inputVariantClass[variant],
        className,
      )}
    >
      {prefix ? (
        <span className="ml-3 flex shrink-0 items-center text-[var(--text-tertiary)]">{prefix}</span>
      ) : null}
      <input
        className={cn(
          "w-full bg-transparent outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed",
          inputSizeClass[size],
          prefix ? "pl-2" : "",
          suffix || allowClear ? "pr-2" : "",
          inputClassName,
        )}
        value={currentValue}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => handleValueChange(event.target.value)}
        {...props}
      />
      {allowClear && currentValue && !disabled && !readOnly ? (
        <button
          type="button"
          aria-label="Clear input"
          onClick={() => handleValueChange("")}
          className="mr-2 rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          x
        </button>
      ) : null}
      {suffix ? (
        <span className="mr-3 flex shrink-0 items-center text-[var(--text-tertiary)]">{suffix}</span>
      ) : null}
    </div>
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  customWidth?: string;
  customHeight?: string;
  bodyClassName?: string;
  contentClassName?: string;
  closeOnOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  customWidth,
  customHeight,
  bodyClassName,
  contentClassName,
  closeOnOverlayClick = true,
}: ModalProps) {
  if (!isOpen) return null;

  const widthClass =
    size === "sm"
      ? "max-w-md"
      : size === "lg"
        ? "max-w-3xl"
        : size === "xl"
          ? "max-w-5xl"
          : "max-w-xl";

  const panelStyle: CSSProperties = {};
  if (customWidth) {
    panelStyle.width = customWidth;
    panelStyle.maxWidth = "95vw";
  }
  if (customHeight) {
    panelStyle.height = customHeight;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="absolute inset-0" onClick={closeOnOverlayClick ? onClose : undefined} />
      <div
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl",
          widthClass,
          contentClassName,
        )}
        style={panelStyle}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <button
              aria-label="Close modal"
              onClick={onClose}
              className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            >
              x
            </button>
          </div>
        ) : null}
        <div className={cn("flex-1 overflow-auto", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface ModalButtonGroupProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ModalButtonGroup({
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmVariant = "primary",
  isLoading = false,
  disabled = false,
}: ModalButtonGroupProps) {
  return (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={onCancel}>
        {cancelText}
      </Button>
      <Button variant={confirmVariant} onClick={onConfirm} disabled={disabled || isLoading}>
        {isLoading ? "Loading..." : confirmText}
      </Button>
    </div>
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
      {children}
    </div>
  );
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { className, children, ...props },
  ref,
) {
  return (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight text-[var(--text-primary)]", className)}
      {...props}
    >
      {children}
    </h3>
  );
});

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
});

interface ThemeSelectorProps {
  className?: string;
  direction?: "horizontal" | "vertical";
  size?: "small" | "medium" | "large";
}

const themePalette: Record<ThemeType, { label: string; preview: string }> = {
  dark: { label: "Dark", preview: "linear-gradient(135deg, #0A0A0A 50%, #3B82F6 50%)" },
  light: { label: "Light", preview: "linear-gradient(135deg, #F8FAFC 50%, #2563EB 50%)" },
  blue: { label: "Blue", preview: "linear-gradient(135deg, #122B3D 50%, #06B6D4 50%)" },
  purple: { label: "Purple", preview: "linear-gradient(135deg, #251B35 50%, #8B5CF6 50%)" },
  system: { label: "System", preview: "linear-gradient(135deg, #0A0A0A 50%, #F8FAFC 50%)" },
};

export function ThemeSelector({
  className,
  direction = "horizontal",
  size = "medium",
}: ThemeSelectorProps) {
  const { currentTheme, setTheme } = useTheme();

  const sizeClass =
    size === "small"
      ? { tile: "h-8 w-8", label: "text-xs", gap: "gap-2" }
      : size === "large"
        ? { tile: "h-14 w-14", label: "text-sm", gap: "gap-4" }
        : { tile: "h-11 w-11", label: "text-sm", gap: "gap-3" };

  const themes: ThemeType[] = ["dark", "light", "blue", "purple", "system"];

  return (
    <div
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        sizeClass.gap,
        className,
      )}
    >
      {themes.map((themeKey) => {
        const active = themeKey === currentTheme;
        const meta = themePalette[themeKey];

        return (
          <button
            key={themeKey}
            type="button"
            className={cn(
              "group flex flex-col items-center gap-1.5 rounded-lg transition-all",
              direction === "vertical" ? "w-full flex-row p-2 hover:bg-[var(--bg-tertiary)]" : "",
            )}
            onClick={() => setTheme(themeKey)}
            title={meta.label}
          >
            <div
              className={cn(
                "rounded-lg border-2 border-transparent transition-all",
                sizeClass.tile,
                active ? "scale-105 border-[var(--ai-primary)] shadow-md" : "group-hover:border-[var(--border-medium)]",
              )}
              style={{ background: meta.preview }}
            />
            <span
              className={cn(
                "font-medium text-[var(--text-secondary)] transition-colors",
                sizeClass.label,
                active ? "text-[var(--ai-primary)]" : "group-hover:text-[var(--text-primary)]",
              )}
            >
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

