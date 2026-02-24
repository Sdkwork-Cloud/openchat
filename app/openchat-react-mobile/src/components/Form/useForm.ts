
import { useState, useCallback } from 'react';

type Rule = {
    required?: boolean;
    pattern?: RegExp;
    message?: string;
    validator?: (value: any) => Promise<boolean | string>;
};

type Rules = Record<string, Rule[]>;

export function useForm<T extends Record<string, any>>(initialValues: T, rules: Rules = {}) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Record<keyof T, string | undefined>>({} as any);

    const setFieldValue = (field: keyof T, value: any) => {
        setValues(prev => ({ ...prev, [field]: value }));
        // Clear error on change
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validate = async (): Promise<boolean> => {
        let isValid = true;
        const newErrors: Record<keyof T, string | undefined> = {} as any;

        for (const key of Object.keys(rules)) {
            const fieldRules = rules[key];
            const value = values[key];

            for (const rule of fieldRules) {
                if (rule.required && (value === undefined || value === '' || value === null)) {
                    newErrors[key as keyof T] = rule.message || 'Required';
                    isValid = false;
                    break; 
                }
                if (rule.pattern && !rule.pattern.test(value)) {
                    newErrors[key as keyof T] = rule.message || 'Invalid format';
                    isValid = false;
                    break;
                }
                if (rule.validator) {
                    const result = await rule.validator(value);
                    if (result !== true) {
                         newErrors[key as keyof T] = typeof result === 'string' ? result : (rule.message || 'Validation failed');
                         isValid = false;
                         break;
                    }
                }
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    return {
        values,
        errors,
        setFieldValue,
        validate,
        setValues
    };
}
