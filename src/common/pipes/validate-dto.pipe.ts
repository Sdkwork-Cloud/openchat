/**
 * DTO 验证管道
 * 使用 class-validator 进行 DTO 验证
 *
 * @framework
 */

import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BusinessException, BusinessErrorCode, ErrorDetail } from '../exceptions/business.exception';

/**
 * DTO 验证选项
 */
export interface ValidateDtoOptions {
  /** 是否跳过缺失的字段 */
  skipMissingProperties?: boolean;
  /** 是否禁止额外字段 */
  forbidNonWhitelisted?: boolean;
  /** 是否只暴露白名单字段 */
  whitelist?: boolean;
  /** 验证组 */
  groups?: string[];
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 是否抛出业务异常 */
  useBusinessException?: boolean;
}

/**
 * DTO 验证管道
 */
@Injectable()
export class ValidateDtoPipe<T extends object> implements PipeTransform<any, Promise<T>> {
  constructor(
    private readonly dtoType: new () => T,
    private readonly options: ValidateDtoOptions = {},
  ) {}

  async transform(value: any, metadata: ArgumentMetadata): Promise<T> {
    if (!value) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        {
          customMessage: '请求数据不能为空',
        },
      );
    }

    // 转换为 DTO 实例
    const dto = plainToInstance(this.dtoType, value, {
      excludeExtraneousValues: true,
    });

    // 验证
    const errors = await validate(dto, {
      skipMissingProperties: this.options.skipMissingProperties ?? false,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted ?? true,
      whitelist: this.options.whitelist ?? true,
      groups: this.options.groups,
    });

    if (errors.length > 0) {
      if (this.options.useBusinessException !== false) {
        throw this.createValidationError(errors);
      } else {
        throw new BadRequestException(this.formatErrors(errors));
      }
    }

    return dto;
  }

  /**
   * 创建验证错误异常
   */
  private createValidationError(errors: ValidationError[]): BusinessException {
    const errorDetails: ErrorDetail[] = this.flattenValidationErrors(errors);

    return BusinessException.validation(errorDetails, this.options.errorMessage);
  }

  /**
   * 扁平化验证错误
   */
  private flattenValidationErrors(errors: ValidationError[], parentField?: string): ErrorDetail[] {
    const details: ErrorDetail[] = [];

    for (const error of errors) {
      const field = parentField ? `${parentField}.${error.property}` : error.property;

      if (error.constraints) {
        for (const [type, message] of Object.entries(error.constraints)) {
          details.push({
            field,
            message,
            value: error.value,
            type,
          });
        }
      }

      if (error.children && error.children.length > 0) {
        details.push(...this.flattenValidationErrors(error.children, field));
      }
    }

    return details;
  }

  /**
   * 格式化错误消息
   */
  private formatErrors(errors: ValidationError[]): string {
    const messages: string[] = [];

    for (const error of errors) {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
    }

    return messages.join('; ');
  }
}

/**
 * 创建 DTO 验证管道的快捷函数
 */
export function createValidationPipe<T extends object>(
  dtoType: new () => T,
  options?: ValidateDtoOptions,
): ValidateDtoPipe<T> {
  return new ValidateDtoPipe(dtoType, options);
}

/**
 * 部分验证 DTO 管道
 * 用于 PATCH 请求，允许部分字段
 */
@Injectable()
export class ValidatePartialDtoPipe<T extends object> implements PipeTransform<any, Promise<Partial<T>>> {
  constructor(
    private readonly dtoType: new () => T,
    private readonly options: Omit<ValidateDtoOptions, 'skipMissingProperties'> = {},
  ) {}

  async transform(value: any, metadata: ArgumentMetadata): Promise<Partial<T>> {
    const pipe = new ValidateDtoPipe(this.dtoType, {
      ...this.options,
      skipMissingProperties: true,
    });
    return pipe.transform(value, metadata);
  }
}
