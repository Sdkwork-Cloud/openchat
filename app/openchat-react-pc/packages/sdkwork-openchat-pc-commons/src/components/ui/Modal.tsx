/**
 * 閫氱敤 Modal 缁勪欢
 *
 * 鑱岃矗锛? * 1. 鎻愪緵缁熶竴鐨勫脊绐楁牱寮忓拰琛屼负
 * 2. 鏀寔澶氱灏哄鍜屽彉浣? * 3. 楂樺彲鎵╁睍鍜屽鐢? *
 * 鐗规€э細
 * - 缁熶竴鐨勯伄缃╁眰
 * - 鍙厤缃殑澶撮儴銆佸唴瀹广€佸簳閮? * - 鏀寔鑷畾涔夊搴︺€侀珮搴? * - 鏀寔鍏抽棴鎸夐挳銆佺偣鍑婚伄缃╁叧闂? * - 鏀寔鍔ㄧ敾鏁堟灉
 * - 鏀寔閿洏浜嬩欢锛圗SC鍏抽棴锛? */

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'custom';
export type ModalVariant = 'default' | 'centered' | 'right' | 'left';

interface ModalProps {
  // 鏄剧ず鎺у埗
  isOpen: boolean;
  onClose: () => void;

  // 灏哄
  size?: ModalSize;
  customWidth?: string;
  customHeight?: string;
  variant?: ModalVariant;

  // 鍐呭
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;

  // 閰嶇疆
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showOverlay?: boolean;
  overlayClassName?: string;

  // 鏍峰紡
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;

  // 浜嬩欢
  onOpen?: () => void;
  onAfterClose?: () => void;
}

// 灏哄鏄犲皠
const sizeMap: Record<ModalSize, string> = {
  sm: 'w-[400px]',
  md: 'w-[500px]',
  lg: 'w-[600px]',
  xl: 'w-[750px]',
  '2xl': 'w-[850px]',
  full: 'w-[95vw] h-[90vh]',
  custom: '',
};

// 鍙樹綋鏄犲皠
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

  // 鎵撳紑鏃惰褰曠劍鐐瑰厓绱?  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      onOpen?.();
      // 鑱氱劍鍒板脊绐?      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    } else {
      onAfterClose?.();
    }
  }, [isOpen, onOpen, onAfterClose]);

  // ESC 閿叧闂?  useEffect(() => {
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

  // 鐐瑰嚮閬僵鍏抽棴
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

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex ${variantMap[variant]} ${showOverlay ? 'bg-black/60 backdrop-blur-md' : ''} ${overlayClassName} animate-in fade-in duration-300`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          bg-bg-secondary
          rounded-2xl
          shadow-2xl 
          overflow-hidden 
          flex flex-col
          border border-border
          animate-in fade-in zoom-in-95 duration-300
          ${sizeClass}
          ${className}
        `}
        style={{ ...widthStyle, ...heightStyle }}
      >
        {/* 澶撮儴 */}
        {(title || showCloseButton) && (
          <div
            className={`
              flex items-center justify-between 
              px-6 py-5 
              border-b border-border
              flex-shrink-0 
              bg-bg-secondary/50 backdrop-blur-sm
              ${headerClassName}
            `}
          >
            {title && (
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-all duration-200 ml-auto"
                aria-label="鍏抽棴"
              >
                <svg
                  className="w-5 h-5"
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

        {/* 鍐呭鍖?*/}
        <div className={`flex-1 overflow-hidden ${bodyClassName}`}>
          {children}
        </div>

        {/* 搴曢儴 */}
        {footer && (
          <div
            className={`
              px-6 py-4 
              border-t border-border
              flex-shrink-0 
              bg-bg-secondary/80 backdrop-blur-sm
              ${footerClassName}
            `}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// 棰勮鐨?Modal 鍙樹綋缁勪欢
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
        border-b border-border
        flex-shrink-0 
        bg-bg-secondary
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
        ${scrollable ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium' : 'overflow-hidden'}
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
        border-t border-border
        flex-shrink-0 
        bg-bg-secondary
        flex items-center ${alignClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// 甯哥敤鎸夐挳缁勫悎
export function ModalButtonGroup({
  onCancel,
  onConfirm,
  cancelText = '鍙栨秷',
  confirmText = '纭畾',
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
    primary: 'bg-primary hover:bg-primary-hover shadow-glow-primary',
    success: 'bg-success hover:bg-green-600 shadow-glow-success',
    danger: 'bg-error hover:bg-red-600 shadow-glow-error',
  }[confirmVariant];

  return (
    <div className="flex items-center space-x-3">
      {children}
      {showCancel && onCancel && (
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-xl transition-all duration-200 disabled:opacity-50 border border-border"
        >
          {cancelText}
        </button>
      )}
      {showConfirm && onConfirm && (
        <button
          onClick={onConfirm}
          disabled={isLoading || disabled}
          className={`
            px-6 py-2 text-[14px] text-white 
            rounded-xl transition-all duration-300 
            flex items-center font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            active:scale-95 transform
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

