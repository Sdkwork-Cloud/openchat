/**
 * 插件配置验证器
 *
 * 职责：
 * 1. 验证插件配置是否符合 Schema
 * 2. 提供配置默认值填充
 * 3. 支持配置迁移和升级
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IExtension,
  ExtensionConfig,
  ExtensionCapabilities,
  ConfigFieldSchema,
} from './extension.interface';

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 验证错误 */
  errors: ConfigValidationError[];
  /** 警告信息 */
  warnings: string[];
  /** 处理后的配置（包含默认值） */
  processedConfig?: ExtensionConfig;
}

/**
 * 配置验证错误
 */
export interface ConfigValidationError {
  /** 字段路径 */
  path: string;
  /** 错误类型 */
  type: 'required' | 'type' | 'format' | 'range' | 'enum' | 'custom';
  /** 错误消息 */
  message: string;
  /** 当前值 */
  value?: any;
  /** 期望值 */
  expected?: any;
}

@Injectable()
export class ExtensionConfigValidator {
  private readonly logger = new Logger(ExtensionConfigValidator.name);

  /**
   * 验证插件配置
   */
  validate(
    extension: IExtension,
    config: Partial<ExtensionConfig>,
  ): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];
    const capabilities = extension.capabilities;
    const schema = capabilities?.configSchema;

    if (!config.enabled) {
      warnings.push('Plugin is disabled');
    }

    if (!schema) {
      return {
        valid: true,
        errors: [],
        warnings,
        processedConfig: this.applyDefaults(config, {}),
      };
    }

    const settings = config.settings || {};

    for (const [key, fieldSchema] of Object.entries(schema)) {
      const value = settings[key];
      const fieldErrors = this.validateField(key, value, fieldSchema);
      errors.push(...fieldErrors);
    }

    const processedConfig = this.applyDefaults(config, schema);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      processedConfig,
    };
  }

  /**
   * 验证单个字段
   */
  private validateField(
    path: string,
    value: any,
    schema: ConfigFieldSchema,
  ): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (value === undefined || value === null) {
      if (schema.required) {
        errors.push({
          path,
          type: 'required',
          message: `Field '${path}' is required`,
        });
      }
      return errors;
    }

    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            path,
            type: 'type',
            message: `Field '${path}' must be a string`,
            value,
            expected: 'string',
          });
        } else {
          if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push({
              path,
              type: 'range',
              message: `Field '${path}' must be at least ${schema.minLength} characters`,
              value,
              expected: `>= ${schema.minLength}`,
            });
          }
          if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push({
              path,
              type: 'range',
              message: `Field '${path}' must be at most ${schema.maxLength} characters`,
              value,
              expected: `<= ${schema.maxLength}`,
            });
          }
          if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
            errors.push({
              path,
              type: 'format',
              message: `Field '${path}' does not match pattern ${schema.pattern}`,
              value,
              expected: schema.pattern,
            });
          }
          if (schema.enum && !schema.enum.includes(value)) {
            errors.push({
              path,
              type: 'enum',
              message: `Field '${path}' must be one of: ${schema.enum.join(', ')}`,
              value,
              expected: schema.enum,
            });
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            path,
            type: 'type',
            message: `Field '${path}' must be a number`,
            value,
            expected: 'number',
          });
        } else {
          if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push({
              path,
              type: 'range',
              message: `Field '${path}' must be >= ${schema.minimum}`,
              value,
              expected: `>= ${schema.minimum}`,
            });
          }
          if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push({
              path,
              type: 'range',
              message: `Field '${path}' must be <= ${schema.maximum}`,
              value,
              expected: `<= ${schema.maximum}`,
            });
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            path,
            type: 'type',
            message: `Field '${path}' must be a boolean`,
            value,
            expected: 'boolean',
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            path,
            type: 'type',
            message: `Field '${path}' must be an array`,
            value,
            expected: 'array',
          });
        } else {
          if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push({
              path,
              type: 'range',
              message: `Field '${path}' must have at least ${schema.minLength} items`,
              value,
              expected: `>= ${schema.minLength} items`,
            });
          }
          if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push({
              path,
              type: 'range',
              message: `Field '${path}' must have at most ${schema.maxLength} items`,
              value,
              expected: `<= ${schema.maxLength} items`,
            });
          }
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push({
            path,
            type: 'type',
            message: `Field '${path}' must be an object`,
            value,
            expected: 'object',
          });
        }
        break;
    }

    return errors;
  }

  /**
   * 应用默认值
   */
  private applyDefaults(
    config: Partial<ExtensionConfig>,
    schema: Record<string, ConfigFieldSchema>,
  ): ExtensionConfig {
    const settings = { ...config.settings };

    for (const [key, fieldSchema] of Object.entries(schema)) {
      if (settings[key] === undefined && fieldSchema.default !== undefined) {
        settings[key] = fieldSchema.default;
      }
    }

    return {
      enabled: config.enabled ?? true,
      priority: config.priority,
      settings,
    };
  }

  /**
   * 合并配置
   */
  mergeConfigs(
    base: ExtensionConfig,
    override: Partial<ExtensionConfig>,
  ): ExtensionConfig {
    return {
      enabled: override.enabled ?? base.enabled,
      priority: override.priority ?? base.priority,
      settings: {
        ...base.settings,
        ...override.settings,
      },
    };
  }
}
