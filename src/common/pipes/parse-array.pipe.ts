/**
 * 数组解析管道
 * 将逗号分隔的字符串转换为数组
 *
 * @framework
 */

import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

/**
 * 数组解析选项
 */
export interface ParseArrayOptions<T = string> {
  /** 分隔符 */
  separator?: string;
  /** 是否必需 */
  required?: boolean;
  /** 最小长度 */
  min?: number;
  /** 最大长度 */
  max?: number;
  /** 是否允许空值 */
  allowEmpty?: boolean;
  /** 是否去重 */
  unique?: boolean;
  /** 元素转换函数 */
  itemTransformer?: (item: string) => T;
  /** 自定义错误消息 */
  errorMessage?: string;
}

/**
 * 数组解析管道
 */
@Injectable()
export class ParseArrayPipe<T = string> implements PipeTransform<string | string[] | undefined, T[]> {
  constructor(private readonly options: ParseArrayOptions<T> = {}) {}

  transform(value: string | string[] | undefined, metadata: ArgumentMetadata): T[] {
    // 如果是 undefined
    if (value === undefined) {
      if (this.options.required) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_PARAMETER,
          {
            customMessage: this.options.errorMessage || `${metadata.data} 是必需的`,
          },
        );
      }
      return [];
    }

    let items: string[];

    // 如果已经是数组
    if (Array.isArray(value)) {
      items = value.map(String);
    } else {
      // 使用分隔符分割字符串
      const separator = this.options.separator || ',';
      items = value.split(separator).map(item => item.trim());
    }

    // 过滤空字符串
    if (!this.options.allowEmpty) {
      items = items.filter(item => item !== '');
    }

    // 验证最小长度
    if (this.options.min !== undefined && items.length < this.options.min) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        {
          customMessage: this.options.errorMessage || `至少需要 ${this.options.min} 个元素`,
          details: { actual: items.length, min: this.options.min },
        },
      );
    }

    // 验证最大长度
    if (this.options.max !== undefined && items.length > this.options.max) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        {
          customMessage: this.options.errorMessage || `最多允许 ${this.options.max} 个元素`,
          details: { actual: items.length, max: this.options.max },
        },
      );
    }

    // 去重
    if (this.options.unique) {
      items = [...new Set(items)];
    }

    // 转换元素
    if (this.options.itemTransformer) {
      return items.map(this.options.itemTransformer);
    }

    return items as T[];
  }
}

/**
 * 数字数组解析管道
 */
export class ParseNumberArrayPipe extends ParseArrayPipe<number> {
  constructor(options: Omit<ParseArrayOptions<number>, 'itemTransformer'> = {}) {
    super({
      ...options,
      itemTransformer: (item: string) => {
        const num = Number(item);
        if (isNaN(num)) {
          throw new BusinessException(
            BusinessErrorCode.INVALID_FORMAT,
            {
              customMessage: `无效的数字：${item}`,
            },
          );
        }
        return num;
      },
    });
  }
}

/**
 * ID 数组解析管道（UUID 或数字 ID）
 */
export class ParseIdArrayPipe extends ParseArrayPipe<string> {
  constructor(options: Omit<ParseArrayOptions<string>, 'itemTransformer'> = {}) {
    super({
      ...options,
      itemTransformer: (item: string) => item.trim(),
    });
  }
}
