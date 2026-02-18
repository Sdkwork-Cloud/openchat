import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConfigSchema {
  [key: string]: ConfigFieldSchema;
}

export interface ConfigFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  transform?: (value: any) => any;
  validate?: (value: any) => boolean | string;
  description?: string;
  deprecated?: boolean;
  replacement?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{
    key: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    key: string;
    message: string;
    value?: any;
  }>;
  config: Record<string, any>;
}

export interface ConfigDiff {
  key: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'changed';
}

@Injectable()
export class ConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidationService.name);
  private readonly schemas = new Map<string, ConfigSchema>();
  private readonly configCache = new Map<string, any>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.registerDefaultSchemas();
    this.validateAll();
    this.logger.log('ConfigValidationService initialized');
  }

  registerSchema(name: string, schema: ConfigSchema): void {
    this.schemas.set(name, schema);
    this.logger.debug(`Config schema registered: ${name}`);
  }

  validate(schemaName: string, config?: Record<string, any>): ConfigValidationResult {
    const schema = this.schemas.get(schemaName);

    if (!schema) {
      return {
        valid: false,
        errors: [{ key: schemaName, message: 'Schema not found' }],
        warnings: [],
        config: {},
      };
    }

    const errors: ConfigValidationResult['errors'] = [];
    const warnings: ConfigValidationResult['warnings'] = [];
    const result: Record<string, any> = {};

    for (const [key, fieldSchema] of Object.entries(schema)) {
      const envValue = this.configService.get(key);
      const value = config?.[key] ?? envValue;

      if (value === undefined || value === null) {
        if (fieldSchema.required && fieldSchema.default === undefined) {
          errors.push({
            key,
            message: `Required configuration '${key}' is missing`,
          });
          continue;
        }

        if (fieldSchema.default !== undefined) {
          result[key] = fieldSchema.default;
        }
        continue;
      }

      if (fieldSchema.deprecated) {
        warnings.push({
          key,
          message: `Configuration '${key}' is deprecated${fieldSchema.replacement ? `. Use '${fieldSchema.replacement}' instead` : ''}`,
          value,
        });
      }

      const validation = this.validateField(key, value, fieldSchema);

      if (validation.error) {
        errors.push({
          key,
          message: validation.error,
          value,
        });
        continue;
      }

      result[key] = validation.value;
    }

    if (config) {
      for (const [key] of Object.entries(config)) {
        if (!schema[key]) {
          warnings.push({
            key,
            message: `Unknown configuration key '${key}'`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config: result,
    };
  }

  validateAll(): Map<string, ConfigValidationResult> {
    const results = new Map<string, ConfigValidationResult>();

    for (const [name] of this.schemas) {
      const result = this.validate(name);
      results.set(name, result);

      if (!result.valid) {
        this.logger.error(`Configuration validation failed for '${name}':`);
        result.errors.forEach((e) => this.logger.error(`  - ${e.key}: ${e.message}`));
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => this.logger.warn(`  - ${w.key}: ${w.message}`));
      }
    }

    return results;
  }

  get<T = any>(key: string, defaultValue?: T): T {
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }

    const value = this.configService.get(key);
    const result = (value !== undefined ? value : defaultValue) as T;
    this.configCache.set(key, result);

    return result;
  }

  getOrThrow<T = any>(key: string): T {
    const value = this.get<T>(key);

    if (value === undefined || value === null) {
      throw new Error(`Configuration '${key}' is required but not set`);
    }

    return value;
  }

  diff(oldConfig: Record<string, any>, newConfig: Record<string, any>): ConfigDiff[] {
    const diffs: ConfigDiff[] = [];
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);

    for (const key of allKeys) {
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];

      if (oldValue === undefined && newValue !== undefined) {
        diffs.push({ key, oldValue: undefined, newValue, type: 'added' });
      } else if (oldValue !== undefined && newValue === undefined) {
        diffs.push({ key, oldValue, newValue: undefined, type: 'removed' });
      } else if (oldValue !== newValue) {
        diffs.push({ key, oldValue, newValue, type: 'changed' });
      }
    }

    return diffs;
  }

  getSchema(name: string): ConfigSchema | undefined {
    return this.schemas.get(name);
  }

  getAllSchemas(): Map<string, ConfigSchema> {
    return new Map(this.schemas);
  }

  clearCache(): void {
    this.configCache.clear();
  }

  private validateField(
    key: string,
    value: any,
    schema: ConfigFieldSchema,
  ): { value?: any; error?: string } {
    let processedValue = value;

    if (schema.transform) {
      try {
        processedValue = schema.transform(value);
      } catch (error: any) {
        return { error: `Transform failed: ${error.message}` };
      }
    }

    if (!this.checkType(processedValue, schema.type)) {
      return { error: `Expected type '${schema.type}', got '${typeof processedValue}'` };
    }

    if (schema.enum && !schema.enum.includes(processedValue)) {
      return { error: `Value must be one of: ${schema.enum.join(', ')}` };
    }

    if (schema.type === 'number' || schema.type === 'string') {
      if (schema.min !== undefined && processedValue < schema.min) {
        return { error: `Value must be at least ${schema.min}` };
      }
      if (schema.max !== undefined && processedValue > schema.max) {
        return { error: `Value must be at most ${schema.max}` };
      }
    }

    if (schema.type === 'string') {
      if (schema.minLength !== undefined && processedValue.length < schema.minLength) {
        return { error: `String must be at least ${schema.minLength} characters` };
      }
      if (schema.maxLength !== undefined && processedValue.length > schema.maxLength) {
        return { error: `String must be at most ${schema.maxLength} characters` };
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(processedValue)) {
        return { error: `String must match pattern: ${schema.pattern}` };
      }
    }

    if (schema.validate) {
      const result = schema.validate(processedValue);
      if (result !== true) {
        return { error: typeof result === 'string' ? result : 'Validation failed' };
      }
    }

    return { value: processedValue };
  }

  private checkType(value: any, type: ConfigFieldSchema['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  private registerDefaultSchemas(): void {
    this.registerSchema('database', {
      DB_HOST: {
        type: 'string',
        required: true,
        default: 'localhost',
        description: 'Database host',
      },
      DB_PORT: {
        type: 'number',
        required: false,
        default: 3306,
        min: 1,
        max: 65535,
        description: 'Database port',
      },
      DB_USERNAME: {
        type: 'string',
        required: true,
        description: 'Database username',
      },
      DB_PASSWORD: {
        type: 'string',
        required: true,
        description: 'Database password',
      },
      DB_DATABASE: {
        type: 'string',
        required: true,
        description: 'Database name',
      },
    });

    this.registerSchema('redis', {
      REDIS_HOST: {
        type: 'string',
        required: false,
        default: 'localhost',
        description: 'Redis host',
      },
      REDIS_PORT: {
        type: 'number',
        required: false,
        default: 6379,
        min: 1,
        max: 65535,
        description: 'Redis port',
      },
      REDIS_PASSWORD: {
        type: 'string',
        required: false,
        description: 'Redis password',
      },
    });

    this.registerSchema('jwt', {
      JWT_SECRET: {
        type: 'string',
        required: true,
        minLength: 32,
        description: 'JWT secret key',
      },
      JWT_EXPIRES_IN: {
        type: 'string',
        required: false,
        default: '7d',
        pattern: '^\\d+[smhd]$',
        description: 'JWT expiration time',
      },
    });

    this.registerSchema('server', {
      PORT: {
        type: 'number',
        required: false,
        default: 3000,
        min: 1,
        max: 65535,
        description: 'Server port',
      },
      NODE_ENV: {
        type: 'string',
        required: false,
        default: 'development',
        enum: ['development', 'staging', 'production', 'test'],
        description: 'Environment',
      },
    });
  }
}

export function ValidateConfig(schemaName: string) {
  return function (target: any) {
    const original = target;

    return class extends original {
      constructor(...args: any[]) {
        super(...args);

        const configValidationService = args.find(
          (arg) => arg instanceof ConfigValidationService,
        ) as ConfigValidationService | undefined;

        if (configValidationService) {
          const result = configValidationService.validate(schemaName);
          if (!result.valid) {
            throw new Error(
              `Configuration validation failed: ${result.errors.map((e) => e.message).join(', ')}`,
            );
          }
        }
      }
    };
  };
}
