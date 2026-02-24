/**
 * 字符串修剪管道
 * 去除字符串前后的空格和特殊字符
 *
 * @framework
 */

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * 修剪选项
 */
export interface TrimOptions {
  /** 是否修剪内部空格 */
  trimInternal?: boolean;
  /** 是否转换为小写 */
  toLowerCase?: boolean;
  /** 是否转换为大写 */
  toUpperCase?: boolean;
  /** 是否移除特殊字符 */
  removeSpecialChars?: boolean;
  /** 允许的特殊字符列表 */
  allowedSpecialChars?: string[];
  /** 最小长度 */
  min?: number;
  /** 最大长度 */
  max?: number;
}

/**
 * 字符串修剪管道
 */
@Injectable()
export class TrimPipe implements PipeTransform<string | undefined, string | undefined> {
  constructor(private readonly options: TrimOptions = {}) {}

  transform(value: string | undefined, metadata: ArgumentMetadata): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    let result = value;

    // 修剪前后空格
    result = result.trim();

    // 修剪内部空格
    if (this.options.trimInternal) {
      result = result.replace(/\s+/g, ' ');
    }

    // 移除特殊字符
    if (this.options.removeSpecialChars) {
      const allowedChars = this.options.allowedSpecialChars || [];
      const escapedChars = allowedChars.map(char => this.escapeRegExp(char)).join('');
      const pattern = new RegExp(`[^a-zA-Z0-9\\u4e00-\\u9fff${escapedChars}\\s]`, 'g');
      result = result.replace(pattern, '');
    }

    // 转换大小写
    if (this.options.toLowerCase) {
      result = result.toLowerCase();
    } else if (this.options.toUpperCase) {
      result = result.toUpperCase();
    }

    // 验证长度
    if (this.options.min !== undefined && result.length < this.options.min) {
      throw new Error(`长度不能小于 ${this.options.min}`);
    }

    if (this.options.max !== undefined && result.length > this.options.max) {
      throw new Error(`长度不能大于 ${this.options.max}`);
    }

    return result;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * 修剪并验证对象中的所有字符串字段
 */
@Injectable()
export class TrimObjectPipe implements PipeTransform<any, any> {
  constructor(private readonly options: TrimOptions = {}) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const trimmed: any = Array.isArray(value) ? [] : {};

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const val = value[key];

        if (typeof val === 'string') {
          trimmed[key] = this.trimString(val);
        } else if (typeof val === 'object' && val !== null) {
          trimmed[key] = this.transform(val, metadata);
        } else {
          trimmed[key] = val;
        }
      }
    }

    return trimmed;
  }

  private trimString(str: string): string {
    let result = str.trim();

    if (this.options.trimInternal) {
      result = result.replace(/\s+/g, ' ');
    }

    if (this.options.removeSpecialChars) {
      const allowedChars = this.options.allowedSpecialChars || [];
      const escapedChars = allowedChars.map(char => this.escapeRegExp(char)).join('');
      const pattern = new RegExp(`[^a-zA-Z0-9\\u4e00-\\u9fff${escapedChars}\\s]`, 'g');
      result = result.replace(pattern, '');
    }

    if (this.options.toLowerCase) {
      result = result.toLowerCase();
    } else if (this.options.toUpperCase) {
      result = result.toUpperCase();
    }

    return result;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
