/**
 * 通用 Modal 组件
 *
 * 职责：
 * 1. 提供统一的弹窗样式和行为
 * 2. 支持多种尺寸和变体
 * 3. 高可扩展和复用
 *
 * 特性：
 * - 统一的遮罩层
 * - 可配置的头部、内容、底部
 * - 支持自定义宽度、高度
 * - 支持关闭按钮、点击遮罩关闭
 * - 支持动画效果
 * - 支持键盘事件（ESC关闭）
 */

import { useEffect, useRef, useCallback } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'custom';
export type ModalVariant = 'default' | 'centered' | 'right' | 'left';

interface ModalProps {
  // 显示控制
  isOpen: boolean;
  onClose: () => void;

  // 尺寸
  size?: ModalSize;
  customWidth?: string;
  customHeight?: string;
  variant?: ModalVariant;

  // 内容
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;

  // 配置
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showOverlay?: boolean;
  overlayClassName?: string;

  // 样式
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;

  // 事件
  onOpen?: () => void;
  onAfterClose?: () => void;
}

// 尺寸映射
const sizeMap: Record<ModalSize, string> = {
  sm: 'w-[400px]',
  md: 'w-[500px]',
  lg: 'w-[600px]',
  xl: 'w-[750px]',
  '2xl': 'w-[850px]',
  full: 'w-[95vw] h-[90vh]',
  custom: '',
};

// 变体映射
const variantMap: Record<ModalVariant, string> = {
  default: '',
  centered: 'items-center justify-center',
  right: 'items-center justify-end pr-4',
  left: 'items-center justify-start pl-4',
};

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  customWidth,
  customHeight,
  variant = 'centered',
  title,
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showOverlay = true,
  overlayClassName = '',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  onOpen,
  onAfterClose,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // 打开时记录焦点元素
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      onOpen?.();
      // 聚焦到弹窗
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    } else {
      onAfterClose?.();
    }
  }, [isOpen, onOpen, onAfterClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOnEsc, onClose]);

  // 点击遮罩关闭
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  if (!isOpen) return null;

  const sizeClass = size === 'custom' && customWidth ? '' : sizeMap[size];
  const widthStyle = customWidth ? { width: customWidth } : undefined;
  const heightStyle = customHeight ? { height: customHeight } : undefined;

  return (
    <div
      className={`fixed inset-0 z-[1000] flex ${variantMap[variant]} ${showOverlay ? 'bg-black/80 backdrop-blur-sm' : ''} ${overlayClassName}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          bg-[var(--bg-secondary)] 
          rounded-xl 
          shadow-2xl 
          overflow-hidden 
          flex flex-col
          border border-[var(--border-color)]
          animate-in fade-in zoom-in-95 duration-200
          ${sizeClass}
          ${className}
        `}
        style={{ ...widthStyle, ...heightStyle }}
      >
        {/* 头部 */}
        {(title || showCloseButton) && (
          <div
            className={`
              flex items-center justify-between 
              px-6 py-5 
              border-b border-[var(--border-color)] 
              flex-shrink-0 
              bg-[var(--bg-secondary)]
              ${headerClassName}
            `}
          >
            {title && (
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] transition-colors ml-auto"
                aria-label="关闭"
              >
                <svg
                  className="w-5 h-5 text-[var(--text-tertiary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 内容区 */}
        <div className={`flex-1 overflow-hidden ${bodyClassName}`}>
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div
            className={`
              px-6 py-4 
              border-t border-[var(--border-color)] 
              flex-shrink-0 
              bg-[var(--bg-secondary)]
              ${footerClassName}
            `}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// 预设的 Modal 变体组件
export function ModalHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        flex items-center justify-between 
        px-6 py-5 
        border-b border-[var(--border-color)] 
        flex-shrink-0 
        bg-[var(--bg-secondary)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function ModalBody({
  children,
  className = '',
  scrollable = true,
}: {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}) {
  return (
    <div
      className={`
        flex-1 
        ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function ModalFooter({
  children,
  className = '',
  align = 'right',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  return (
    <div
      className={`
        px-6 py-4 
        border-t border-[var(--border-color)] 
        flex-shrink-0 
        bg-[var(--bg-secondary)]
        flex items-center ${alignClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// 常用按钮组合
export function ModalButtonGroup({
  onCancel,
  onConfirm,
  cancelText = '取消',
  confirmText = '确定',
  isLoading = false,
  disabled = false,
  confirmVariant = 'primary',
  showCancel = true,
  showConfirm = true,
  children,
}: {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  confirmVariant?: 'primary' | 'success' | 'danger';
  showCancel?: boolean;
  showConfirm?: boolean;
  children?: React.ReactNode;
}) {
  const variantClass = {
    primary: 'bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)]',
    success: 'bg-[var(--ai-success)] hover:bg-[#16A34A]',
    danger: 'bg-[var(--ai-error)] hover:bg-[#DC2626]',
  }[confirmVariant];

  return (
    <div className="flex items-center space-x-3">
      {children}
      {showCancel && onCancel && (
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
      )}
      {showConfirm && onConfirm && (
        <button
          onClick={onConfirm}
          disabled={isLoading || disabled}
          className={`
            px-5 py-2.5 text-[15px] text-white 
            rounded-lg transition-colors 
            flex items-center font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            ${variantClass}
          `}
        >
          {isLoading && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
          {confirmText}
        </button>
      )}
    </div>
  );
}

export default Modal;
