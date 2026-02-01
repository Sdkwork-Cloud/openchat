/**
 * 无障碍 (A11y) 工具 Hook
 *
 * 职责：提供无障碍相关的工具函数和状态管理
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 焦点陷阱 Hook
 * 用于模态框、对话框等需要限制焦点的场景
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // 保存之前的焦点
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // 获取所有可聚焦元素
    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 可以在这里添加关闭逻辑
        container.dispatchEvent(new CustomEvent('focusTrapEscape', { bubbles: true }));
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    // 自动聚焦第一个元素
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
      // 恢复之前的焦点
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * 减少动效偏好检测
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * 高对比度模式检测
 */
export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

/**
 * 通知公告区域管理
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const ariaLive = priority === 'assertive' ? 'aria-live-assertive' : 'aria-live-polite';
    const element = document.getElementById(ariaLive);
    if (element) {
      element.textContent = message;
      // 清空内容以便下次通知
      setTimeout(() => {
        element.textContent = '';
      }, 1000);
    }
  }, []);

  return { announce };
}

/**
 * 键盘导航 Hook
 */
export function useKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  onEscape?: () => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % itemCount);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(focusedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
      }
    },
    [itemCount, focusedIndex, onSelect, onEscape]
  );

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}

/**
 * 跳过链接 Hook
 */
export function useSkipLink(targetId: string) {
  const handleSkip = useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [targetId]);

  return handleSkip;
}
