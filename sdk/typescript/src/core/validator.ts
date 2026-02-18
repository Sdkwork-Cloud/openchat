/**
 * 数据验证工具
 * 用于表单验证和数据校验
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  phone?: boolean;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidatorOptions {
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

export class Validator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private options: ValidatorOptions;

  constructor(options?: ValidatorOptions) {
    this.options = {
      stripUnknown: options?.stripUnknown ?? false,
      abortEarly: options?.abortEarly ?? true,
    };
  }

  addRule(field: string, rule: ValidationRule): this {
    const rules = this.rules.get(field) || [];
    rules.push(rule);
    this.rules.set(field, rules);
    return this;
  }

  addRules(rules: Record<string, ValidationRule>): this {
    for (const [field, rule] of Object.entries(rules)) {
      this.addRule(field, rule);
    }
    return this;
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rules] of this.rules.entries()) {
      const value = data[field];

      for (const rule of rules) {
        const error = this.validateField(field, value, rule);
        if (error) {
          errors.push(error);
          if (this.options.abortEarly) {
            break;
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateField(field: string, value: any, rule: ValidationRule): ValidationError | null {
    if (rule.required && (value === undefined || value === null || value === '')) {
      return { field, message: `${field} is required`, value };
    }

    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (rule.minLength !== undefined && String(value).length < rule.minLength) {
      return { field, message: `${field} must be at least ${rule.minLength} characters`, value };
    }

    if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
      return { field, message: `${field} must be at most ${rule.maxLength} characters`, value };
    }

    if (rule.min !== undefined && Number(value) < rule.min) {
      return { field, message: `${field} must be at least ${rule.min}`, value };
    }

    if (rule.max !== undefined && Number(value) > rule.max) {
      return { field, message: `${field} must be at most ${rule.max}`, value };
    }

    if (rule.pattern && !rule.pattern.test(String(value))) {
      return { field, message: `${field} format is invalid`, value };
    }

    if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      return { field, message: `${field} must be a valid email`, value };
    }

    if (rule.url && !/^https?:\/\/.+/.test(String(value))) {
      return { field, message: `${field} must be a valid URL`, value };
    }

    if (rule.phone && !/^1[3-9]\d{9}$/.test(String(value))) {
      return { field, message: `${field} must be a valid phone number`, value };
    }

    if (rule.enum && !rule.enum.includes(value)) {
      return { field, message: `${field} must be one of: ${rule.enum.join(', ')}`, value };
    }

    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        return { 
          field, 
          message: typeof result === 'string' ? result : `${field} is invalid`, 
          value 
        };
      }
    }

    return null;
  }

  strip(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const key of this.rules.keys()) {
      if (data[key] !== undefined) {
        result[key] = data[key];
      }
    }

    return result;
  }
}

export function validate(data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult {
  const validator = new Validator().addRules(rules);
  return validator.validate(data);
}

export const ValidationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => message || true,
  }),

  email: (): ValidationRule => ({ email: true }),
  
  phone: (): ValidationRule => ({ phone: true }),
  
  url: (): ValidationRule => ({ url: true }),

  minLength: (length: number): ValidationRule => ({ minLength: length }),
  
  maxLength: (length: number): ValidationRule => ({ maxLength: length }),

  min: (value: number): ValidationRule => ({ min: value }),
  
  max: (value: number): ValidationRule => ({ max: value }),

  pattern: (regex: RegExp): ValidationRule => ({ pattern: regex }),

  enum: <T extends any[]>(...values: T): ValidationRule => ({ enum: values }),

  custom: (fn: (value: any) => boolean | string): ValidationRule => ({ custom: fn }),
};
