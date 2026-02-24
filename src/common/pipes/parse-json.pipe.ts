/**
 * JSON 解析管道
 * 将 JSON 字符串转换为 JavaScript 对象
 *
 * @framework
 */

import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

/**
 * JSON 解析选项
 */
export interface ParseJsonOptions {
  /** 是否必需 */
  required?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 是否允许空值 */
  allowEmpty?: boolean;
}

/**
 * JSON 解析管道
 */
@Injectable()
export class ParseJsonPipe implements PipeTransform<string | object, object | null> {
  constructor(private readonly options: ParseJsonOptions = {}) {}

  transform(value: string | object, metadata: ArgumentMetadata): object | null {
    // 如果是 undefined 或 null
    if (value === undefined || value === null) {
      if (this.options.required) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_PARAMETER,
          {
            customMessage: this.options.errorMessage || `${metadata.data} 是必需的`,
          },
        );
      }
      return null;
    }

    // 如果已经是对象，直接返回
    if (typeof value === 'object') {
      return value;
    }

    // 如果是空字符串
    if (value === '') {
      if (this.options.allowEmpty) {
        return null;
      }
      throw new BusinessException(
        BusinessErrorCode.INVALID_JSON,
        {
          customMessage: this.options.errorMessage || 'JSON 不能为空',
        },
      );
    }

    // 尝试解析 JSON
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_JSON,
        {
          customMessage: this.options.errorMessage || `无效的 JSON 格式：${(error as Error).message}`,
        },
      );
    }
  }
}
