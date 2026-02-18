import { Injectable, Logger } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    property: string;
    constraints: Record<string, string>;
    children?: ValidationResult['errors'];
  }>;
}

export interface ValidationRule {
  property: string;
  rules: Array<{
    type: string;
    message: string;
    value?: any;
  }>;
}

export interface CustomValidator {
  name: string;
  validate: (value: any, context?: any) => boolean | Promise<boolean>;
  defaultMessage: string;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  private readonly customValidators = new Map<string, CustomValidator>();

  async validateDto<T extends object>(dto: T): Promise<ValidationResult> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    return {
      isValid: errors.length === 0,
      errors: this.mapErrors(errors),
    };
  }

  async validateAndTransform<T extends object>(
    plain: any,
    dtoClass: new () => T,
  ): Promise<T> {
    const instance = plainToInstance(dtoClass, plain, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    const result = await this.validateDto(instance);

    if (!result.isValid) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        'Validation failed',
        { errors: result.errors },
      );
    }

    return instance;
  }

  async validateOrThrow<T extends object>(dto: T): Promise<void> {
    const result = await this.validateDto(dto);

    if (!result.isValid) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        'Validation failed',
        { errors: result.errors },
      );
    }
  }

  async validateValue(value: any, rules: ValidationRule[]): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];

    for (const rule of rules) {
      const propertyValue = value[rule.property];

      for (const r of rule.rules) {
        const isValid = await this.applyRule(propertyValue, r);

        if (!isValid) {
          errors.push({
            property: rule.property,
            constraints: { [r.type]: r.message },
          });
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  registerCustomValidator(validator: CustomValidator): void {
    this.customValidators.set(validator.name, validator);
    this.logger.debug(`Custom validator registered: ${validator.name}`);
  }

  async validateWithCustom<T extends object>(
    dto: T,
    validators: string[],
    context?: any,
  ): Promise<ValidationResult> {
    const baseResult = await this.validateDto(dto);

    if (!baseResult.isValid) {
      return baseResult;
    }

    const customErrors: ValidationResult['errors'] = [];

    for (const validatorName of validators) {
      const validator = this.customValidators.get(validatorName);

      if (!validator) {
        this.logger.warn(`Custom validator not found: ${validatorName}`);
        continue;
      }

      for (const [property, value] of Object.entries(dto)) {
        const isValid = await validator.validate(value, context);

        if (!isValid) {
          customErrors.push({
            property,
            constraints: {
              [validatorName]: validator.defaultMessage,
            },
          });
        }
      }
    }

    return {
      isValid: customErrors.length === 0,
      errors: [...baseResult.errors, ...customErrors],
    };
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  isValidPassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (password.length > 32) {
      errors.push('Password must be at most 32 characters');
    }

    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain at least one letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,49}$/;
    return usernameRegex.test(username);
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  isValidObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }

  isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  isLengthInRange(value: string, min: number, max: number): boolean {
    return value.length >= min && value.length <= max;
  }

  isInEnum<T extends Record<string, string>>(
    value: any,
    enumObj: T,
  ): value is T[keyof T] {
    return Object.values(enumObj).includes(value);
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  sanitizeHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  private mapErrors(errors: ValidationError[]): ValidationResult['errors'] {
    return errors.map((error) => ({
      property: error.property,
      constraints: error.constraints || {},
      children: error.children ? this.mapErrors(error.children) : undefined,
    }));
  }

  private async applyRule(value: any, rule: ValidationRule['rules'][0]): Promise<boolean> {
    switch (rule.type) {
      case 'required':
        return value !== undefined && value !== null && value !== '';
      case 'email':
        return this.isValidEmail(value);
      case 'phone':
        return this.isValidPhone(value);
      case 'minLength':
        return value && value.length >= rule.value;
      case 'maxLength':
        return value && value.length <= rule.value;
      case 'min':
        return value >= rule.value;
      case 'max':
        return value <= rule.value;
      case 'pattern':
        return new RegExp(rule.value).test(value);
      case 'enum':
        return rule.value.includes(value);
      case 'custom':
        const customValidator = this.customValidators.get(rule.value);
        return customValidator ? await customValidator.validate(value) : false;
      default:
        return true;
    }
  }
}

export function createValidationRule(
  property: string,
  type: string,
  message: string,
  value?: any,
): ValidationRule {
  return {
    property,
    rules: [{ type, message, value }],
  };
}

export const ValidationRules = {
  required: (property: string, message?: string) =>
    createValidationRule(property, 'required', message || `${property} is required`),

  email: (property: string, message?: string) =>
    createValidationRule(property, 'email', message || 'Invalid email format'),

  phone: (property: string, message?: string) =>
    createValidationRule(property, 'phone', message || 'Invalid phone format'),

  minLength: (property: string, min: number, message?: string) =>
    createValidationRule(property, 'minLength', message || `Minimum length is ${min}`, min),

  maxLength: (property: string, max: number, message?: string) =>
    createValidationRule(property, 'maxLength', message || `Maximum length is ${max}`, max),

  min: (property: string, min: number, message?: string) =>
    createValidationRule(property, 'min', message || `Minimum value is ${min}`, min),

  max: (property: string, max: number, message?: string) =>
    createValidationRule(property, 'max', message || `Maximum value is ${max}`, max),

  pattern: (property: string, pattern: string, message?: string) =>
    createValidationRule(property, 'pattern', message || 'Invalid format', pattern),

  enum: (property: string, values: any[], message?: string) =>
    createValidationRule(property, 'enum', message || 'Invalid value', values),
};
