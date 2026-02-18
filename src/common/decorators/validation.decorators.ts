import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  buildMessage,
} from 'class-validator';

function parseDate(value: any): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function isAfter(date1: Date, date2: Date): boolean {
  return date1.getTime() > date2.getTime();
}

function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

export function IsAfterDate(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isAfterDate',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          
          if (!value || !relatedValue) return true;
          
          const date1 = parseDate(value);
          const date2 = parseDate(relatedValue);
          
          if (!date1 || !date2) return false;
          
          return isAfter(date1, date2);
        },
        defaultMessage: buildMessage(
          (eachPrefix, args) =>
            `${eachPrefix}$property must be after ${args?.constraints[0]}`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsBeforeDate(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isBeforeDate',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          
          if (!value || !relatedValue) return true;
          
          const date1 = parseDate(value);
          const date2 = parseDate(relatedValue);
          
          if (!date1 || !date2) return false;
          
          return isBefore(date1, date2);
        },
        defaultMessage: buildMessage(
          (eachPrefix, args) =>
            `${eachPrefix}$property must be before ${args?.constraints[0]}`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsDateStringInRange(
  minDate: Date,
  maxDate: Date,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isDateStringInRange',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [minDate, maxDate],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return true;
          
          const date = parseDate(value);
          if (!date) return false;
          
          return isAfter(date, minDate) && isBefore(date, maxDate);
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be between ${minDate.toISOString()} and ${maxDate.toISOString()}`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsPassword(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isPassword',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          
          const hasMinLength = value.length >= 8;
          const hasMaxLength = value.length <= 128;
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
          
          return hasMinLength && hasMaxLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must contain at least 8 characters, one uppercase, one lowercase, one number and one special character`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsPhoneNumber(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          
          const phoneRegex = /^(\+?86)?1[3-9]\d{9}$/;
          return phoneRegex.test(value.replace(/\s/g, ''));
        },
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid phone number`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsUsername(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isUsername',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          
          const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_-]{2,19}$/;
          return usernameRegex.test(value);
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must start with a letter and contain only letters, numbers, underscores or hyphens (3-20 characters)`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsSlug(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isSlug',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          
          const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
          return slugRegex.test(value);
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid slug (lowercase letters, numbers and hyphens)`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsIdCard(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isIdCard',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          
          const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
          return idCardRegex.test(value);
        },
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid Chinese ID card number`,
          validationOptions,
        ),
      },
    });
  };
}
