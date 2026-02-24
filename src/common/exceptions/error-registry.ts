/**
 * 错误码注册表和管理系统
 * 提供统一的错误码管理和多语言支持
 *
 * @framework
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  /** 信息 */
  INFO = 'info',
  /** 警告 */
  WARNING = 'warning',
  /** 错误 */
  ERROR = 'error',
  /** 严重错误 */
  CRITICAL = 'critical',
}

/**
 * 错误分类枚举
 */
export enum ErrorCategory {
  /** 客户端错误 */
  CLIENT = 'client',
  /** 服务端错误 */
  SERVER = 'server',
  /** 业务错误 */
  BUSINESS = 'business',
  /** 系统错误 */
  SYSTEM = 'system',
}

/**
 * 错误定义
 */
export interface ErrorDefinition {
  /** 错误码 */
  code: number;
  /** 错误名称 */
  name: string;
  /** 错误级别 */
  level: ErrorLevel;
  /** 错误分类 */
  category: ErrorCategory;
  /** 中文消息 */
  messageZh: string;
  /** 英文消息 */
  messageEn: string;
  /** 详细描述 */
  description?: string;
  /** 可能原因 */
  causes?: string[];
  /** 解决方案 */
  solutions?: string[];
  /** 相关文档链接 */
  docLink?: string;
  /** 是否可恢复 */
  recoverable?: boolean;
  /** 是否应该重试 */
  shouldRetry?: boolean;
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/**
 * 错误注册表选项
 */
export interface ErrorRegistryOptions {
  /** 默认语言 */
  defaultLanguage?: 'zh_CN' | 'en_US';
  /** 是否启用详细日志 */
  enableVerbose?: boolean;
}

/**
 * 错误注册表
 */
@Injectable()
export class ErrorRegistry {
  private readonly logger = new Logger(ErrorRegistry.name);
  private readonly errors: Map<number, ErrorDefinition> = new Map();
  private readonly options: Required<ErrorRegistryOptions>;

  constructor(options: ErrorRegistryOptions = {}) {
    this.options = {
      defaultLanguage: options.defaultLanguage ?? 'zh_CN',
      enableVerbose: options.enableVerbose ?? false,
    };
  }

  /**
   * 注册错误定义
   */
  register(error: ErrorDefinition): void {
    if (this.errors.has(error.code)) {
      this.logger.warn(`Error code ${error.code} is already registered, overwriting`);
    }
    this.errors.set(error.code, error);
  }

  /**
   * 批量注册错误定义
   */
  registerBatch(errors: ErrorDefinition[]): void {
    for (const error of errors) {
      this.register(error);
    }
  }

  /**
   * 获取错误定义
   */
  getError(code: number): ErrorDefinition | undefined {
    return this.errors.get(code);
  }

  /**
   * 获取错误消息
   */
  getMessage(code: number, language?: 'zh_CN' | 'en_US'): string {
    const error = this.errors.get(code);
    if (!error) {
      return `Unknown error: ${code}`;
    }

    const lang = language ?? this.options.defaultLanguage;
    return lang === 'zh_CN' ? error.messageZh : error.messageEn;
  }

  /**
   * 获取错误详情
   */
  getErrorDetails(code: number, language?: 'zh_CN' | 'en_US'): ErrorDetails {
    const error = this.errors.get(code);
    if (!error) {
      return {
        code,
        message: `Unknown error: ${code}`,
        level: ErrorLevel.ERROR,
        category: ErrorCategory.SYSTEM,
      };
    }

    const lang = language ?? this.options.defaultLanguage;
    return {
      code: error.code,
      name: error.name,
      message: lang === 'zh_CN' ? error.messageZh : error.messageEn,
      level: error.level,
      category: error.category,
      description: error.description,
      causes: error.causes,
      solutions: error.solutions,
      docLink: error.docLink,
      recoverable: error.recoverable,
      shouldRetry: error.shouldRetry,
      metadata: error.metadata,
    };
  }

  /**
   * 检查错误码是否存在
   */
  exists(code: number): boolean {
    return this.errors.has(code);
  }

  /**
   * 获取所有错误定义
   */
  getAll(): ErrorDefinition[] {
    return Array.from(this.errors.values());
  }

  /**
   * 按分类获取错误定义
   */
  getByCategory(category: ErrorCategory): ErrorDefinition[] {
    return this.getAll().filter(error => error.category === category);
  }

  /**
   * 按级别获取错误定义
   */
  getByLevel(level: ErrorLevel): ErrorDefinition[] {
    return this.getAll().filter(error => error.level === level);
  }

  /**
   * 搜索错误定义
   */
  search(keyword: string, language?: 'zh_CN' | 'en_US'): ErrorDefinition[] {
    const lang = language ?? this.options.defaultLanguage;
    const lowerKeyword = keyword.toLowerCase();

    return this.getAll().filter(error => {
      const message = lang === 'zh_CN' ? error.messageZh : error.messageEn;
      return (
        error.name.toLowerCase().includes(lowerKeyword) ||
        message.toLowerCase().includes(lowerKeyword) ||
        error.description?.toLowerCase().includes(lowerKeyword)
      );
    });
  }

  /**
   * 导出错误注册表为 JSON
   */
  exportToJson(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * 从 JSON 导入错误定义
   */
  importFromJson(json: string): void {
    const errors = JSON.parse(json) as ErrorDefinition[];
    this.registerBatch(errors);
  }

  /**
   * 生成错误文档
   */
  generateDocumentation(language?: 'zh_CN' | 'en_US'): string {
    const lang = language ?? this.options.defaultLanguage;
    const lines: string[] = [];

    lines.push('# Error Code Documentation');
    lines.push('');
    lines.push(`Language: ${lang}`);
    lines.push('');

    // 按分类分组
    const categories = Object.values(ErrorCategory);
    for (const category of categories) {
      const errors = this.getByCategory(category);
      if (errors.length === 0) continue;

      lines.push(`## ${category.toUpperCase()} Errors`);
      lines.push('');

      for (const error of errors) {
        const message = lang === 'zh_CN' ? error.messageZh : error.messageEn;
        lines.push(`### ${error.name} (\`${error.code}\`)`);
        lines.push('');
        lines.push(`**Message:** ${message}`);
        lines.push('');
        lines.push(`**Level:** ${error.level}`);
        lines.push('');

        if (error.description) {
          lines.push(`**Description:** ${error.description}`);
          lines.push('');
        }

        if (error.causes?.length) {
          lines.push('**Possible Causes:**');
          for (const cause of error.causes) {
            lines.push(`- ${cause}`);
          }
          lines.push('');
        }

        if (error.solutions?.length) {
          lines.push('**Solutions:**');
          for (const solution of error.solutions) {
            lines.push(`- ${solution}`);
          }
          lines.push('');
        }

        if (error.docLink) {
          lines.push(`**Documentation:** ${error.docLink}`);
          lines.push('');
        }

        lines.push('---');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * 获取统计信息
   */
  getStats(): ErrorStats {
    const all = this.getAll();
    return {
      total: all.length,
      byCategory: {
        client: all.filter(e => e.category === ErrorCategory.CLIENT).length,
        server: all.filter(e => e.category === ErrorCategory.SERVER).length,
        business: all.filter(e => e.category === ErrorCategory.BUSINESS).length,
        system: all.filter(e => e.category === ErrorCategory.SYSTEM).length,
      },
      byLevel: {
        info: all.filter(e => e.level === ErrorLevel.INFO).length,
        warning: all.filter(e => e.level === ErrorLevel.WARNING).length,
        error: all.filter(e => e.level === ErrorLevel.ERROR).length,
        critical: all.filter(e => e.level === ErrorLevel.CRITICAL).length,
      },
      recoverable: all.filter(e => e.recoverable).length,
      retryable: all.filter(e => e.shouldRetry).length,
    };
  }
}

/**
 * 错误详情接口
 */
export interface ErrorDetails {
  code: number;
  name?: string;
  message: string;
  level: ErrorLevel;
  category: ErrorCategory;
  description?: string;
  causes?: string[];
  solutions?: string[];
  docLink?: string;
  recoverable?: boolean;
  shouldRetry?: boolean;
  metadata?: Record<string, any>;
}

/**
 * 错误统计接口
 */
export interface ErrorStats {
  total: number;
  byCategory: {
    client: number;
    server: number;
    business: number;
    system: number;
  };
  byLevel: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  recoverable: number;
  retryable: number;
}

/**
 * 错误构建器
 */
export class ErrorBuilder {
  private definition: Partial<ErrorDefinition> = {};

  constructor(code: number) {
    this.definition.code = code;
  }

  name(name: string): this {
    this.definition.name = name;
    return this;
  }

  level(level: ErrorLevel): this {
    this.definition.level = level;
    return this;
  }

  category(category: ErrorCategory): this {
    this.definition.category = category;
    return this;
  }

  message(messageZh: string, messageEn: string): this {
    this.definition.messageZh = messageZh;
    this.definition.messageEn = messageEn;
    return this;
  }

  description(description: string): this {
    this.definition.description = description;
    return this;
  }

  causes(...causes: string[]): this {
    this.definition.causes = causes;
    return this;
  }

  solutions(...solutions: string[]): this {
    this.definition.solutions = solutions;
    return this;
  }

  docLink(link: string): this {
    this.definition.docLink = link;
    return this;
  }

  recoverable(recoverable: boolean): this {
    this.definition.recoverable = recoverable;
    return this;
  }

  shouldRetry(shouldRetry: boolean): this {
    this.definition.shouldRetry = shouldRetry;
    return this;
  }

  metadata(metadata: Record<string, any>): this {
    this.definition.metadata = metadata;
    return this;
  }

  build(): ErrorDefinition {
    if (!this.definition.name || !this.definition.messageZh || !this.definition.messageEn) {
      throw new Error('Missing required fields: name, messageZh, messageEn');
    }

    return {
      code: this.definition.code!,
      name: this.definition.name!,
      level: this.definition.level ?? ErrorLevel.ERROR,
      category: this.definition.category ?? ErrorCategory.BUSINESS,
      messageZh: this.definition.messageZh!,
      messageEn: this.definition.messageEn!,
      description: this.definition.description,
      causes: this.definition.causes,
      solutions: this.definition.solutions,
      docLink: this.definition.docLink,
      recoverable: this.definition.recoverable,
      shouldRetry: this.definition.shouldRetry,
      metadata: this.definition.metadata,
    };
  }
}

/**
 * 创建错误构建器的快捷函数
 */
export function createError(code: number): ErrorBuilder {
  return new ErrorBuilder(code);
}

/**
 * 标准错误定义集合
 */
export const StandardErrors = {
  // 客户端错误
  INVALID_REQUEST: createError(4000)
    .name('INVALID_REQUEST')
    .level(ErrorLevel.WARNING)
    .category(ErrorCategory.CLIENT)
    .message('请求参数无效', 'Invalid request parameters')
    .causes('参数格式错误', '缺少必填字段', '参数类型不匹配')
    .solutions('检查请求参数格式', '确认必填字段已填写', '验证参数类型')
    .recoverable(true)
    .build(),

  UNAUTHORIZED: createError(4001)
    .name('UNAUTHORIZED')
    .level(ErrorLevel.WARNING)
    .category(ErrorCategory.CLIENT)
    .message('未授权访问', 'Unauthorized access')
    .causes('Token 缺失', 'Token 无效', 'Token 过期')
    .solutions('重新登录获取 Token', '检查 Token 格式', '刷新 Token')
    .recoverable(true)
    .shouldRetry(false)
    .build(),

  FORBIDDEN: createError(4003)
    .name('FORBIDDEN')
    .level(ErrorLevel.WARNING)
    .category(ErrorCategory.CLIENT)
    .message('禁止访问', 'Forbidden')
    .causes('权限不足', '角色不允许', '资源不属于当前用户')
    .solutions('申请相应权限', '切换账号', '联系管理员')
    .recoverable(false)
    .build(),

  NOT_FOUND: createError(4004)
    .name('NOT_FOUND')
    .level(ErrorLevel.INFO)
    .category(ErrorCategory.CLIENT)
    .message('资源不存在', 'Resource not found')
    .causes('资源已被删除', '资源 ID 错误', '资源未创建')
    .solutions('检查资源 ID', '确认资源已创建')
    .recoverable(false)
    .build(),

  // 业务错误
  BUSINESS_ERROR: createError(4400)
    .name('BUSINESS_ERROR')
    .level(ErrorLevel.ERROR)
    .category(ErrorCategory.BUSINESS)
    .message('业务处理失败', 'Business operation failed')
    .causes('业务规则不满足', '业务逻辑错误', '数据状态异常')
    .solutions('检查业务规则', '验证数据状态', '联系技术支持')
    .recoverable(false)
    .build(),

  // 服务端错误
  INTERNAL_ERROR: createError(5000)
    .name('INTERNAL_ERROR')
    .level(ErrorLevel.CRITICAL)
    .category(ErrorCategory.SERVER)
    .message('服务器内部错误', 'Internal server error')
    .causes('代码逻辑错误', '系统资源不足', '依赖服务异常')
    .solutions('查看服务器日志', '检查系统资源', '重启服务')
    .recoverable(true)
    .shouldRetry(true)
    .docLink('https://docs.example.com/errors/5000')
    .build(),

  SERVICE_UNAVAILABLE: createError(5003)
    .name('SERVICE_UNAVAILABLE')
    .level(ErrorLevel.CRITICAL)
    .category(ErrorCategory.SERVER)
    .message('服务不可用', 'Service unavailable')
    .causes('服务宕机', '服务过载', '网络问题')
    .solutions('检查服务状态', '等待服务恢复', '联系运维人员')
    .recoverable(true)
    .shouldRetry(true)
    .build(),

  // 数据库错误
  DATABASE_ERROR: createError(5100)
    .name('DATABASE_ERROR')
    .level(ErrorLevel.ERROR)
    .category(ErrorCategory.SYSTEM)
    .message('数据库错误', 'Database error')
    .causes('连接失败', '查询超时', '约束冲突')
    .solutions('检查数据库连接', '优化查询语句', '检查数据完整性')
    .recoverable(true)
    .shouldRetry(true)
    .build(),
};
