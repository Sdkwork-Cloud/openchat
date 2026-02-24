/**
 * 配置验证模块
 * 提供环境变量和配置的验证功能
 *
 * @framework
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync, IsString, IsOptional, IsNumber, IsBoolean, IsUrl, IsIn, Min, Max, IsEmail, Matches, IsInt, MinLength, MaxLength, ValidateNested } from 'class-validator';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

/**
 * 环境枚举
 */
export enum NodeEnv {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * 数据库配置
 */
export class DatabaseConfig {
  @IsString()
  @MinLength(1)
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsString()
  @MinLength(1)
  DB_USER: string = 'openchat';

  @IsString()
  @MinLength(1)
  DB_PASSWORD: string = 'openchat_password';

  @IsString()
  @MinLength(1)
  DB_NAME: string = 'openchat';

  @IsNumber()
  @Min(1)
  @Max(100)
  DB_POOL_MAX: number = 20;

  @IsNumber()
  @Min(0)
  DB_POOL_MIN: number = 5;

  @IsNumber()
  @Min(1000)
  DB_IDLE_TIMEOUT: number = 30000;

  @IsNumber()
  @Min(1000)
  DB_CONNECTION_TIMEOUT: number = 5000;

  @IsNumber()
  @Min(1000)
  DB_MAX_LIFETIME: number = 300000;

  @IsBoolean()
  DB_LOGGING: boolean = false;
}

/**
 * Redis 配置
 */
export class RedisConfig {
  @IsString()
  @MinLength(1)
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @Min(0)
  @Max(15)
  REDIS_DB: number = 0;

  @IsNumber()
  @Min(1)
  REDIS_POOL_MAX: number = 10;

  @IsNumber()
  @Min(1000)
  REDIS_TIMEOUT: number = 5000;
}

/**
 * JWT 配置
 */
export class JwtConfig {
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsNumber()
  @Min(60)
  JWT_EXPIRES_IN: number = 86400; // 24 小时

  @IsString()
  @IsOptional()
  JWT_ISSUER?: string = 'openchat';

  @IsString()
  @IsOptional()
  JWT_AUDIENCE?: string = 'openchat';
}

/**
 * 服务器配置
 */
export class ServerConfig {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsIn(['http', 'https'])
  PROTOCOL: 'http' | 'https' = 'http';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '*';

  @IsBoolean()
  COMPRESSION_ENABLED: boolean = true;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024)
  BODY_PARSER_LIMIT: number = 10 * 1024 * 1024; // 10MB
}

/**
 * 日志配置
 */
export class LogConfig {
  @IsString()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  LOG_LEVEL: LogLevel = LogLevel.INFO;

  @IsString()
  @IsIn(['json', 'text'])
  LOG_FORMAT: 'json' | 'text' = 'text';

  @IsString()
  @IsOptional()
  LOG_FILE_PATH?: string = 'logs';

  @IsBoolean()
  LOG_TO_FILE: boolean = false;

  @IsBoolean()
  LOG_TO_CONSOLE: boolean = true;

  @IsNumber()
  @Min(1)
  LOG_MAX_FILES: number = 30;

  @IsBoolean()
  LOG_REQUEST: boolean = false;
}

/**
 * 缓存配置
 */
export class CacheConfig {
  @IsBoolean()
  CACHE_ENABLED: boolean = true;

  @IsNumber()
  @Min(1)
  CACHE_TTL: number = 300; // 5 分钟

  @IsBoolean()
  CACHE_LOCAL_ENABLED: boolean = true;

  @IsNumber()
  @Min(1)
  CACHE_LOCAL_TTL: number = 60;

  @IsNumber()
  @Min(1)
  CACHE_LOCAL_MAX_SIZE: number = 1000;
}

/**
 * 限流配置
 */
export class RateLimitConfig {
  @IsBoolean()
  RATE_LIMIT_ENABLED: boolean = true;

  @IsNumber()
  @Min(1)
  RATE_LIMIT_TTL: number = 60;

  @IsNumber()
  @Min(1)
  RATE_LIMIT_MAX: number = 100;

  @IsBoolean()
  RATE_LIMIT_IGNORE_ADMIN: boolean = true;
}

/**
 * WukongIM 配置
 */
export class WukongIMConfig {
  @IsUrl()
  @IsOptional()
  WUKONGIM_API_URL?: string = 'http://localhost:5001';

  @IsString()
  @IsOptional()
  WUKONGIM_TCP_ADDR?: string = 'localhost:5100';

  @IsUrl()
  @IsOptional()
  WUKONGIM_WS_URL?: string = 'ws://localhost:5200';

  @IsString()
  @IsOptional()
  WUKONGIM_TOKEN?: string;
}

/**
 * 应用配置
 */
export class AppConfig {
  @IsString()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsString()
  @IsOptional()
  APP_NAME: string = 'OpenChat Server';

  @IsString()
  @IsOptional()
  APP_VERSION: string = '1.0.0';

  @IsString()
  @IsOptional()
  APP_DESCRIPTION: string = 'OpenChat IM Server';
}

/**
 * 完整配置接口
 */
export interface IAllConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  server: ServerConfig;
  log: LogConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  wukongim?: WukongIMConfig;
}

/**
 * 配置验证服务
 */
@Injectable()
export class ConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidationService.name);
  private validatedConfig: IAllConfig | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.validateAll();
  }

  /**
   * 验证所有配置
   */
  validateAll(): IAllConfig {
    if (this.validatedConfig) {
      return this.validatedConfig;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errors: string[] = [];

    try {
      const appConfig = this.validateAppConfig();
      const databaseConfig = this.validateDatabaseConfig();
      const redisConfig = this.validateRedisConfig();
      const jwtConfig = this.validateJwtConfig();
      const serverConfig = this.validateServerConfig();
      const logConfig = this.validateLogConfig();
      const cacheConfig = this.validateCacheConfig();
      const rateLimitConfig = this.validateRateLimitConfig();
      const wukongimConfig = this.validateWukongIMConfig();

      this.validatedConfig = {
        app: appConfig,
        database: databaseConfig,
        redis: redisConfig,
        jwt: jwtConfig,
        server: serverConfig,
        log: logConfig,
        cache: cacheConfig,
        rateLimit: rateLimitConfig,
        wukongim: wukongimConfig,
      };

      this.logger.log('Configuration validated successfully');
      return this.validatedConfig;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        BusinessErrorCode.INVALID_CONFIGURATION,
        {
          customMessage: 'Configuration validation failed',
          details: { error: (error as Error).message },
        },
      );
    }
  }

  /**
   * 获取验证后的配置
   */
  getValidatedConfig(): IAllConfig {
    if (!this.validatedConfig) {
      throw new Error('Configuration not validated yet');
    }
    return this.validatedConfig;
  }

  /**
   * 验证应用配置
   */
  private validateAppConfig(): AppConfig {
    const config = plainToInstance(AppConfig, {
      NODE_ENV: this.configService.get('NODE_ENV', 'development'),
      APP_NAME: this.configService.get('APP_NAME', 'OpenChat Server'),
      APP_VERSION: this.configService.get('APP_VERSION', '1.0.0'),
      APP_DESCRIPTION: this.configService.get('APP_DESCRIPTION', 'OpenChat IM Server'),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('App', errors);
    }

    return config;
  }

  /**
   * 验证数据库配置
   */
  private validateDatabaseConfig(): DatabaseConfig {
    const config = plainToInstance(DatabaseConfig, {
      DB_HOST: this.configService.get('DB_HOST', 'localhost'),
      DB_PORT: this.configService.get('DB_PORT', 5432),
      DB_USER: this.configService.get('DB_USER', 'openchat'),
      DB_PASSWORD: this.configService.get('DB_PASSWORD', 'openchat_password'),
      DB_NAME: this.configService.get('DB_NAME', 'openchat'),
      DB_POOL_MAX: this.configService.get('DB_POOL_MAX', 20),
      DB_POOL_MIN: this.configService.get('DB_POOL_MIN', 5),
      DB_IDLE_TIMEOUT: this.configService.get('DB_IDLE_TIMEOUT', 30000),
      DB_CONNECTION_TIMEOUT: this.configService.get('DB_CONNECTION_TIMEOUT', 5000),
      DB_MAX_LIFETIME: this.configService.get('DB_MAX_LIFETIME', 300000),
      DB_LOGGING: this.configService.get('DB_LOGGING', false),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('Database', errors);
    }

    return config;
  }

  /**
   * 验证 Redis 配置
   */
  private validateRedisConfig(): RedisConfig {
    const config = plainToInstance(RedisConfig, {
      REDIS_HOST: this.configService.get('REDIS_HOST', 'localhost'),
      REDIS_PORT: this.configService.get('REDIS_PORT', 6379),
      REDIS_PASSWORD: this.configService.get('REDIS_PASSWORD'),
      REDIS_DB: this.configService.get('REDIS_DB', 0),
      REDIS_POOL_MAX: this.configService.get('REDIS_POOL_MAX', 10),
      REDIS_TIMEOUT: this.configService.get('REDIS_TIMEOUT', 5000),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('Redis', errors);
    }

    return config;
  }

  /**
   * 验证 JWT 配置
   */
  private validateJwtConfig(): JwtConfig {
    const jwtSecret = this.configService.get('JWT_SECRET');

    if (!jwtSecret) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_CONFIGURATION,
        {
          customMessage: 'JWT_SECRET is required',
          details: { field: 'JWT_SECRET' },
        },
      );
    }

    const config = plainToInstance(JwtConfig, {
      JWT_SECRET: jwtSecret,
      JWT_EXPIRES_IN: this.configService.get('JWT_EXPIRES_IN', 86400),
      JWT_ISSUER: this.configService.get('JWT_ISSUER', 'openchat'),
      JWT_AUDIENCE: this.configService.get('JWT_AUDIENCE', 'openchat'),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('JWT', errors);
    }

    return config;
  }

  /**
   * 验证服务器配置
   */
  private validateServerConfig(): ServerConfig {
    const config = plainToInstance(ServerConfig, {
      PORT: this.configService.get('PORT', 3000),
      PROTOCOL: this.configService.get('PROTOCOL', 'http'),
      CORS_ORIGINS: this.configService.get('CORS_ORIGINS', '*'),
      COMPRESSION_ENABLED: this.configService.get('COMPRESSION_ENABLED', true),
      BODY_PARSER_LIMIT: this.configService.get('BODY_PARSER_LIMIT', 10 * 1024 * 1024),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('Server', errors);
    }

    return config;
  }

  /**
   * 验证日志配置
   */
  private validateLogConfig(): LogConfig {
    const config = plainToInstance(LogConfig, {
      LOG_LEVEL: this.configService.get('LOG_LEVEL', 'info'),
      LOG_FORMAT: this.configService.get('LOG_FORMAT', 'text'),
      LOG_FILE_PATH: this.configService.get('LOG_FILE_PATH', 'logs'),
      LOG_TO_FILE: this.configService.get('LOG_TO_FILE', false),
      LOG_TO_CONSOLE: this.configService.get('LOG_TO_CONSOLE', true),
      LOG_MAX_FILES: this.configService.get('LOG_MAX_FILES', 30),
      LOG_REQUEST: this.configService.get('LOG_REQUEST', false),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('Log', errors);
    }

    return config;
  }

  /**
   * 验证缓存配置
   */
  private validateCacheConfig(): CacheConfig {
    const config = plainToInstance(CacheConfig, {
      CACHE_ENABLED: this.configService.get('CACHE_ENABLED', true),
      CACHE_TTL: this.configService.get('CACHE_TTL', 300),
      CACHE_LOCAL_ENABLED: this.configService.get('CACHE_LOCAL_ENABLED', true),
      CACHE_LOCAL_TTL: this.configService.get('CACHE_LOCAL_TTL', 60),
      CACHE_LOCAL_MAX_SIZE: this.configService.get('CACHE_LOCAL_MAX_SIZE', 1000),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('Cache', errors);
    }

    return config;
  }

  /**
   * 验证限流配置
   */
  private validateRateLimitConfig(): RateLimitConfig {
    const config = plainToInstance(RateLimitConfig, {
      RATE_LIMIT_ENABLED: this.configService.get('RATE_LIMIT_ENABLED', true),
      RATE_LIMIT_TTL: this.configService.get('RATE_LIMIT_TTL', 60),
      RATE_LIMIT_MAX: this.configService.get('RATE_LIMIT_MAX', 100),
      RATE_LIMIT_IGNORE_ADMIN: this.configService.get('RATE_LIMIT_IGNORE_ADMIN', true),
    });

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('RateLimit', errors);
    }

    return config;
  }

  /**
   * 验证 WukongIM 配置
   */
  private validateWukongIMConfig(): WukongIMConfig | undefined {
    const config = plainToInstance(WukongIMConfig, {
      WUKONGIM_API_URL: this.configService.get('WUKONGIM_API_URL'),
      WUKONGIM_TCP_ADDR: this.configService.get('WUKONGIM_TCP_ADDR'),
      WUKONGIM_WS_URL: this.configService.get('WUKONGIM_WS_URL'),
      WUKONGIM_TOKEN: this.configService.get('WUKONGIM_TOKEN'),
    });

    // WukongIM 配置是可选的
    if (!config.WUKONGIM_API_URL) {
      return undefined;
    }

    const errors = validateSync(config);
    if (errors.length > 0) {
      this.throwValidationError('WukongIM', errors);
    }

    return config;
  }

  /**
   * 抛出验证错误
   */
  private throwValidationError(section: string, errors: any[]): never {
    const errorMessages = errors.map(err => {
      const constraints = Object.values(err.constraints || {});
      return `${err.property}: ${constraints.join(', ')}`;
    });

    throw new BusinessException(
      BusinessErrorCode.INVALID_CONFIGURATION,
      {
        customMessage: `${section} configuration validation failed`,
        details: {
          section,
          errors: errorMessages,
        },
      },
    );
  }
}

// 注意：INVALID_CONFIGURATION 错误码已在 business.exception.ts 中定义为 9000
// 此处不再重复定义，避免只读属性错误
