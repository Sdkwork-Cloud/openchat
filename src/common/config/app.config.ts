import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEmail,
  Min,
  Max,
  MinLength,
  MaxLength,
  validateSync,
} from 'class-validator';

export class DatabaseConfig {
  @IsString()
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsString()
  DB_USERNAME: string = 'postgres';

  @IsString()
  DB_PASSWORD: string = '';

  @IsString()
  DB_DATABASE: string = 'openchat';

  @IsBoolean()
  @IsOptional()
  DB_SSL?: boolean = false;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  DB_POOL_SIZE?: number = 20;

  @IsNumber()
  @Min(1000)
  @IsOptional()
  DB_CONNECTION_TIMEOUT?: number = 30000;
}

export class RedisConfig {
  @IsString()
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
  @IsOptional()
  REDIS_DB?: number = 0;

  @IsString()
  @IsOptional()
  REDIS_PREFIX?: string = 'openchat:';
}

export class JwtConfig {
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '1h';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  @IsString()
  @IsOptional()
  JWT_ISSUER?: string = 'openchat';

  @IsString()
  @IsOptional()
  JWT_AUDIENCE?: string = 'openchat-users';
}

export class ServerConfig {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  HOST?: string = '0.0.0.0';

  @IsBoolean()
  @IsOptional()
  CORS_ENABLED?: boolean = true;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = '*';

  @IsBoolean()
  @IsOptional()
  HELMET_ENABLED?: boolean = true;

  @IsBoolean()
  @IsOptional()
  COMPRESSION_ENABLED?: boolean = true;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  BODY_LIMIT_MB?: number = 10;
}

export class RateLimitConfig {
  @IsBoolean()
  @IsOptional()
  RATE_LIMIT_ENABLED?: boolean = true;

  @IsNumber()
  @Min(1)
  @IsOptional()
  RATE_LIMIT_POINTS?: number = 100;

  @IsNumber()
  @Min(1)
  @IsOptional()
  RATE_LIMIT_DURATION?: number = 60;
}

export class LoggingConfig {
  @IsString()
  @IsOptional()
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error' = 'info';

  @IsBoolean()
  @IsOptional()
  LOG_FILE_ENABLED?: boolean = false;

  @IsString()
  @IsOptional()
  LOG_FILE_PATH?: string = './logs';

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  LOG_MAX_FILES?: number = 7;

  @IsNumber()
  @Min(1)
  @IsOptional()
  LOG_MAX_SIZE_MB?: number = 10;
}

export class AppConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  server: ServerConfig;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;

  @IsString()
  @IsOptional()
  NODE_ENV?: 'development' | 'production' | 'test' = 'development';

  @IsBoolean()
  @IsOptional()
  DEBUG?: boolean = false;

  static fromEnv(): AppConfig {
    const config = new AppConfig();
    config.database = plainToInstance(DatabaseConfig, {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
      DB_USERNAME: process.env.DB_USERNAME,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_DATABASE: process.env.DB_DATABASE,
      DB_SSL: process.env.DB_SSL === 'true',
      DB_POOL_SIZE: parseInt(process.env.DB_POOL_SIZE || '20', 10),
      DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    });

    config.redis = plainToInstance(RedisConfig, {
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
      REDIS_PREFIX: process.env.REDIS_PREFIX,
    });

    config.jwt = plainToInstance(JwtConfig, {
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
      JWT_ISSUER: process.env.JWT_ISSUER,
      JWT_AUDIENCE: process.env.JWT_AUDIENCE,
    });

    config.server = plainToInstance(ServerConfig, {
      PORT: parseInt(process.env.PORT || '3000', 10),
      HOST: process.env.HOST,
      CORS_ENABLED: process.env.CORS_ENABLED !== 'false',
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      HELMET_ENABLED: process.env.HELMET_ENABLED !== 'false',
      COMPRESSION_ENABLED: process.env.COMPRESSION_ENABLED !== 'false',
      BODY_LIMIT_MB: parseInt(process.env.BODY_LIMIT_MB || '10', 10),
    });

    config.rateLimit = plainToInstance(RateLimitConfig, {
      RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
      RATE_LIMIT_POINTS: parseInt(process.env.RATE_LIMIT_POINTS || '100', 10),
      RATE_LIMIT_DURATION: parseInt(process.env.RATE_LIMIT_DURATION || '60', 10),
    });

    config.logging = plainToInstance(LoggingConfig, {
      LOG_LEVEL: process.env.LOG_LEVEL as any,
      LOG_FILE_ENABLED: process.env.LOG_FILE_ENABLED === 'true',
      LOG_FILE_PATH: process.env.LOG_FILE_PATH,
      LOG_MAX_FILES: parseInt(process.env.LOG_MAX_FILES || '7', 10),
      LOG_MAX_SIZE_MB: parseInt(process.env.LOG_MAX_SIZE_MB || '10', 10),
    });

    config.NODE_ENV = process.env.NODE_ENV as any;
    config.DEBUG = process.env.DEBUG === 'true';

    return config;
  }

  validate(): void {
    const errors: string[] = [];

    const validateSection = (section: any, name: string) => {
      const sectionErrors = validateSync(section);
      if (sectionErrors.length > 0) {
        sectionErrors.forEach((error) => {
          Object.values(error.constraints || {}).forEach((msg) => {
            errors.push(`${name}.${error.property}: ${msg}`);
          });
        });
      }
    };

    validateSection(this.database, 'database');
    validateSection(this.redis, 'redis');
    validateSection(this.jwt, 'jwt');
    validateSection(this.server, 'server');
    validateSection(this.rateLimit, 'rateLimit');
    validateSection(this.logging, 'logging');

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }

  get isTest(): boolean {
    return this.NODE_ENV === 'test';
  }
}
