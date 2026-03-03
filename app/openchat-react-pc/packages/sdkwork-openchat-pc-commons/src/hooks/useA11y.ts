/**
 * 鏃犻殰纰?(A11y) 宸ュ叿 Hook
 *
 * 鑱岃矗锛氭彁渚涙棤闅滅鐩稿叧鐨勫伐鍏峰嚱鏁板拰鐘舵€佺鐞? */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 鐒︾偣闄烽槺 Hook
 * 鐢ㄤ簬妯℃€佹銆佸璇濇绛夐渶瑕侀檺鍒剁劍鐐圭殑鍦烘櫙
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // 淇濆瓨涔嬪墠鐨勭劍鐐?    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // 鑾峰彇鎵€鏈夊彲鑱氱劍鍏冪礌
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
        // 鍙互鍦ㄨ繖閲屾坊鍔犲叧闂€昏緫
        container.dispatchEvent(new CustomEvent('focusTrapEscape', { bubbles: true }));
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    // 鑷姩鑱氱劍绗竴涓厓绱?    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
      // 鎭㈠涔嬪墠鐨勭劍鐐?      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * 鍑忓皯鍔ㄦ晥鍋忓ソ妫€娴? */
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
 * 楂樺姣斿害妯″紡妫€娴? */
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
 * 閫氱煡鍏憡鍖哄煙绠＄悊
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const ariaLive = priority === 'assertive' ? 'aria-live-assertive' : 'aria-live-polite';
    const element = document.getElementById(ariaLive);
    if (element) {
      element.textContent = message;
      // 娓呯┖鍐呭浠ヤ究涓嬫閫氱煡
      setTimeout(() => {
        element.textContent = '';
      }, 1000);
    }
  }, []);

  return { announce };
}

/**
 * 閿洏瀵艰埅 Hook
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
 * 璺宠繃閾炬帴 Hook
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

