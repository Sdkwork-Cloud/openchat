
import React, { useEffect } from 'react';

/**
 * Hook to save and restore scroll position of a container element.
 * Key must be unique per page/list.
 */
export const useScrollRestoration = (key: string, ref: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        const storageKey = `scroll_pos_${key}`;
        const element = ref.current;

        if (!element) return;

        // Restore
        const savedPos = sessionStorage.getItem(storageKey);
        if (savedPos) {
            // Use requestAnimationFrame to ensure layout is ready
            requestAnimationFrame(() => {
                element.scrollTop = parseInt(savedPos, 10);
            });
        }

        // Save on scroll (debounced slightly for perf if needed, but modern browsers handle this ok)
        const handleScroll = () => {
            sessionStorage.setItem(storageKey, element.scrollTop.toString());
        };

        element.addEventListener('scroll', handleScroll);
        
        return () => {
            element.removeEventListener('scroll', handleScroll);
        };
    }, [key, ref]);
};
