import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (!value || !metadata.metatype || !this.toValidate(metadata)) {
      return value;
    }

    const object = plainToInstance(metadata.metatype, value, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const messages = errors.map(error => {
        const constraints = error.constraints || {};
        return Object.values(constraints).join(', ');
      });

      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        `Validation failed: ${messages.join('; ')}`,
        { errors: errors.map(e => ({ property: e.property, constraints: e.constraints })) },
      );
    }

    return object;
  }

  private toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype } = metadata;
    if (!metatype) {
      return false;
    }
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype as any);
  }
}

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        `Invalid number: ${value}`,
      );
    }
    return parsed;
  }
}

@Injectable()
export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string, metadata: ArgumentMetadata): boolean {
    if (value === 'true' || value === '1') {
      return true;
    }
    if (value === 'false' || value === '0') {
      return false;
    }
    throw new BusinessException(
      BusinessErrorCode.INVALID_PARAMETER,
      `Invalid boolean: ${value}`,
    );
  }
}

@Injectable()
export class TrimPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }
}

@Injectable()
export class DefaultValuePipe<T> implements PipeTransform<T | undefined, T> {
  constructor(private readonly defaultValue: T) {}

  transform(value: T | undefined, metadata: ArgumentMetadata): T {
    return value === undefined ? this.defaultValue : value;
  }
}
