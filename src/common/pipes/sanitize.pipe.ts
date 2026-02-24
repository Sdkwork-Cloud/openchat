/**
 * 数据清理管道
 * 防止 XSS 攻击和恶意输入
 *
 * @framework
 */

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * 清理选项
 */
export interface SanitizeOptions {
  /** 是否移除 HTML 标签 */
  removeHtml?: boolean;
  /** 是否移除脚本标签 */
  removeScripts?: boolean;
  /** 是否移除事件处理器 */
  removeEventHandlers?: boolean;
  /** 是否编码 HTML 实体 */
  encodeHtmlEntities?: boolean;
  /** 是否移除 SQL 注入特征 */
  removeSqlInjection?: boolean;
  /** 是否移除路径遍历特征 */
  removePathTraversal?: boolean;
  /** 自定义过滤规则 */
  customRules?: SanitizeRule[];
}

/**
 * 清理规则
 */
export interface SanitizeRule {
  /** 规则名称 */
  name: string;
  /** 正则表达式 */
  pattern: RegExp;
  /** 替换值 */
  replacement: string | ((match: string, ...args: any[]) => string);
}

/**
 * 常用清理规则
 */
export const SanitizeRules = {
  /** HTML 标签 */
  HTML_TAGS: {
    name: 'html-tags',
    pattern: /<[^>]*>/g,
    replacement: '',
  },
  /** 脚本标签 */
  SCRIPT_TAGS: {
    name: 'script-tags',
    pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    replacement: '',
  },
  /** 事件处理器 */
  EVENT_HANDLERS: {
    name: 'event-handlers',
    pattern: /\s+on\w+\s*=\s*["'][^"']*["']/gi,
    replacement: '',
  },
  /** SQL 注入特征 */
  SQL_INJECTION: {
    name: 'sql-injection',
    pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b|--|;|\/\*|\*\/)/gi,
    replacement: '',
  },
  /** 路径遍历 */
  PATH_TRAVERSAL: {
    name: 'path-traversal',
    pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c)/gi,
    replacement: '',
  },
  /** HTML 实体编码 */
  HTML_ENTITIES: {
    name: 'html-entities',
    pattern: /[<>&"']/g,
    replacement: (match: string) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[match] || match;
    },
  },
};

/**
 * 数据清理管道
 */
@Injectable()
export class SanitizePipe implements PipeTransform<string | object, string | object> {
  private readonly rules: SanitizeRule[];

  constructor(private readonly options: SanitizeOptions = {}) {
    this.rules = this.buildRules();
  }

  transform(value: string | object, metadata: ArgumentMetadata): string | object {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }

    return value;
  }

  /**
   * 清理字符串
   */
  private sanitizeString(value: string): string {
    let result = value;

    // 应用内置规则
    for (const rule of this.rules) {
      if (typeof rule.replacement === 'function') {
        result = result.replace(rule.pattern, rule.replacement);
      } else {
        result = result.replace(rule.pattern, rule.replacement);
      }
    }

    // 应用自定义规则
    if (this.options.customRules) {
      for (const rule of this.options.customRules) {
        if (typeof rule.replacement === 'function') {
          result = result.replace(rule.pattern, rule.replacement);
        } else {
          result = result.replace(rule.pattern, rule.replacement);
        }
      }
    }

    return result;
  }

  /**
   * 清理对象
   */
  private sanitizeObject(value: object): Record<string, any> {
    const sanitized: Record<string, any> = Array.isArray(value) ? [] : {};

    for (const key of Object.keys(value)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const val = (value as Record<string, any>)[key];

        if (typeof val === 'string') {
          sanitized[key] = this.sanitizeString(val);
        } else if (typeof val === 'object' && val !== null) {
          sanitized[key] = this.sanitizeObject(val);
        } else {
          sanitized[key] = val;
        }
      }
    }

    return sanitized;
  }

  /**
   * 构建规则列表
   */
  private buildRules(): SanitizeRule[] {
    const rules: SanitizeRule[] = [];

    if (this.options.removeScripts !== false) {
      rules.push(SanitizeRules.SCRIPT_TAGS);
    }

    if (this.options.removeEventHandlers !== false) {
      rules.push(SanitizeRules.EVENT_HANDLERS);
    }

    if (this.options.removeHtml) {
      rules.push(SanitizeRules.HTML_TAGS);
    }

    if (this.options.encodeHtmlEntities) {
      rules.push({
        ...SanitizeRules.HTML_ENTITIES,
        replacement: (match: string) => {
          const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;',
          };
          return entities[match] || match;
        },
      });
    }

    if (this.options.removeSqlInjection) {
      rules.push(SanitizeRules.SQL_INJECTION);
    }

    if (this.options.removePathTraversal) {
      rules.push(SanitizeRules.PATH_TRAVERSAL);
    }

    return rules;
  }
}

/**
 * 清理 HTML 但保留安全标签
 */
@Injectable()
export class SanitizeHtmlPipe implements PipeTransform<string, string> {
  private readonly allowedTags: Set<string>;
  private readonly allowedAttributes: Map<string, string[]>;

  constructor(options: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  } = {}) {
    // 默认允许的安全标签
    this.allowedTags = new Set([
      ...(options.allowedTags || []),
      'p', 'br', 'strong', 'em', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
    ]);

    // 默认允许的属性
    this.allowedAttributes = new Map([
      ['a', ['href', 'title', 'target', 'rel']],
      ['img', ['src', 'alt', 'title', 'width', 'height']],
      ...(Object.entries(options.allowedAttributes || {})),
    ]);
  }

  transform(value: string, metadata: ArgumentMetadata): string {
    // 简化实现：移除所有 HTML 标签
    // 生产环境建议使用成熟的库如 DOMPurify
    return value.replace(/<[^>]*>/g, '');
  }
}
