
import React from 'react';

/**
 * The Standard Base Props for all UI Components.
 * Adheres to the Open-Closed Principle: open for extension (via style/className/children), closed for modification.
 */
export interface BaseProps {
    /** Custom CSS class name */
    className?: string;
    /** Custom inline styles (use sparingly, prefer className) */
    style?: React.CSSProperties;
    /** Content */
    children?: React.ReactNode;
    /** Test ID for automated testing */
    'data-testid'?: string;
}

/**
 * Standard Props for Input/Form components
 */
export interface BaseInputProps<T> extends Omit<BaseProps, 'children'> {
    value?: T;
    defaultValue?: T;
    onChange?: (value: T) => void;
    disabled?: boolean;
    readOnly?: boolean;
}
