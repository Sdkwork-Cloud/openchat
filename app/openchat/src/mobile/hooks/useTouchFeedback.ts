
import { useState, useCallback } from 'react';

interface TouchFeedbackOptions {
  activeOpacity?: number;
  scale?: number;
  disable?: boolean;
}

export const useTouchFeedback = (options: TouchFeedbackOptions = {}) => {
  const { disable = false } = options;
  const [isActive, setIsActive] = useState(false);

  const onTouchStart = useCallback(() => {
    if (!disable) setIsActive(true);
  }, [disable]);

  const onTouchEnd = useCallback(() => {
    if (!disable) setIsActive(false);
  }, [disable]);

  // Combined props object for easy spreading
  const touchProps = {
    onTouchStart,
    onTouchEnd,
    onMouseDown: onTouchStart, // Mouse support for dev
    onMouseUp: onTouchEnd,
    onMouseLeave: onTouchEnd,
  };

  return { 
    isActive, 
    touchProps 
  };
};
