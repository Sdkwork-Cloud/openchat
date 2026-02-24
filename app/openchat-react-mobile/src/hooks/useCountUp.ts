
import { useState, useEffect } from 'react';

/**
 * A hook for animating numbers (e.g. balances, stats).
 * Uses 'easeOutQuart' for a premium, non-linear feel.
 * 
 * @param end The target number to count up to.
 * @param duration Duration in ms (default 1000ms).
 * @param decimals Number of decimal places to format (default 2).
 */
export const useCountUp = (end: number, duration = 1000, decimals = 2) => {
    const [displayValue, setDisplayValue] = useState("0");

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const startVal = 0; // Could be parametized to start from previous value

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // Algorithm: Ease Out Quart -> 1 - (1 - t)^4
            // This provides a fast start and a very smooth, slow finish.
            const ease = 1 - Math.pow(1 - percentage, 4);
            
            const current = startVal + (end - startVal) * ease;
            
            // Format immediately to avoid layout thrashing in render
            setDisplayValue(current.toFixed(decimals));

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        if (end > 0) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            setDisplayValue(end.toFixed(decimals));
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, decimals]);

    return displayValue;
};
