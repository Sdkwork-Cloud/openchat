/**
 * 布尔值解析管道
 * 将字符串转换为布尔值
 *
 * @framework
 */

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * 布尔值解析选项
 */
export interface ParseBooleanOptions {
  /** 默认值 */
  defaultValue?: boolean;
  /** 是否必需 */
  required?: boolean;
  /** 真值列表（自定义） */
  truthyValues?: string[];
  /** 假值列表（自定义） */
  falsyValues?: string[];
}

/**
 * 布尔值解析管道
 */
@Injectable()
export class ParseBooleanPipe implements PipeTransform<string | boolean | undefined, boolean> {
  private readonly truthyValues: string[];
  private readonly falsyValues: string[];

  constructor(private readonly options: ParseBooleanOptions = {}) {
    this.truthyValues = options.truthyValues || ['true', '1', 'yes', 'on', '是', '真'];
    this.falsyValues = options.falsyValues || ['false', '0', 'no', 'off', '否', '假'];
  }

  transform(value: string | boolean | undefined, metadata: ArgumentMetadata): boolean {
    // 如果是 undefined
    if (value === undefined) {
      if (this.options.required) {
        throw new Error(`${metadata.data} 是必需的`);
      }
      return this.options.defaultValue ?? false;
    }

    // 如果已经是布尔值
    if (typeof value === 'boolean') {
      return value;
    }

    // 转换为小写字符串
    const lowerValue = value.toLowerCase();

    // 检查是否在真值列表中
    if (this.truthyValues.includes(lowerValue)) {
      return true;
    }

    // 检查是否在假值列表中
    if (this.falsyValues.includes(lowerValue)) {
      return false;
    }

    // 无法识别，返回默认值
    return this.options.defaultValue ?? false;
  }
}
