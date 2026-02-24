
import { useEffect, useRef } from 'react';

/**
 * useScrollLock
 * Prevents the background content from scrolling when a modal/sheet is open.
 * Uses the "position: fixed" technique which is the most robust method for iOS Safari.
 */
export const useScrollLock = (isLocked: boolean) => {
    const scrollOffset = useRef(0);

    useEffect(() => {
        if (isLocked) {
            // 1. Record current scroll position
            scrollOffset.current = window.scrollY;
            
            // 2. Lock body
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollOffset.current}px`;
            document.body.style.width = '100%';
            document.body.style.overflowY = 'hidden';
        } else {
            // 1. Unlock body
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';

            // 2. Restore scroll position
            window.scrollTo(0, scrollOffset.current);
        }

        // Cleanup function to ensure state is reset if component unmounts while locked
        return () => {
            if (isLocked) {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflowY = '';
                window.scrollTo(0, scrollOffset.current);
            }
        };
    }, [isLocked]);
};
