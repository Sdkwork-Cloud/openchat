import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('Validating configuration...');

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.configService.get('DB_HOST')) {
      errors.push('DB_HOST is required');
    }
    if (!this.configService.get('DB_PASSWORD')) {
      warnings.push('DB_PASSWORD is not set, using default');
    }

    const dbPoolMax = this.configService.get('DB_POOL_MAX', 20);
    const dbPoolMin = this.configService.get('DB_POOL_MIN', 5);
    if (dbPoolMin > dbPoolMax) {
      errors.push('DB_POOL_MIN cannot be greater than DB_POOL_MAX');
    }
    if (dbPoolMax > 100) {
      warnings.push('DB_POOL_MAX is very high, consider reducing it');
    }

    if (!this.configService.get('REDIS_HOST')) {
      warnings.push('REDIS_HOST is not set, using default (localhost)');
    }

    const jwtSecret = this.configService.get('JWT_SECRET');
    if (!jwtSecret) {
      errors.push('JWT_SECRET is required');
    } else if (jwtSecret === 'your-secret-key-change-this-in-production') {
      warnings.push('JWT_SECRET is using default value, please change it in production');
    } else if (jwtSecret.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters for security');
    }

    const nodeEnv = this.configService.get('NODE_ENV');
    if (nodeEnv === 'production') {
      if (this.configService.get('DB_SYNCHRONIZE') === 'true') {
        errors.push('DB_SYNCHRONIZE should be false in production');
      }
      if (!this.configService.get('DB_PASSWORD')) {
        errors.push('DB_PASSWORD is required in production');
      }
      if (jwtSecret === 'your-secret-key-change-this-in-production') {
        errors.push('JWT_SECRET must be changed from default value in production');
      }
      if (!this.configService.get('REDIS_PASSWORD')) {
        warnings.push('REDIS_PASSWORD is recommended in production');
      }
      const logLevel = this.configService.get('LOG_LEVEL');
      if (logLevel === 'debug') {
        warnings.push('LOG_LEVEL=debug in production may expose sensitive information');
      }
    }

    if (warnings.length > 0) {
      warnings.forEach((warn) => this.logger.warn(`Config Warning: ${warn}`));
    }

    if (errors.length > 0) {
      errors.forEach((err) => this.logger.error(`Config Error: ${err}`));
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    this.logger.log('Configuration validation passed');
  }

  getConfigSummary(): Record<string, any> {
    return {
      environment: this.configService.get('NODE_ENV', 'development'),
      port: this.configService.get('PORT', 3000),
      database: {
        host: this.configService.get('DB_HOST'),
        port: this.configService.get('DB_PORT', 5432),
        name: this.configService.get('DB_NAME'),
        pool: {
          min: this.configService.get('DB_POOL_MIN', 5),
          max: this.configService.get('DB_POOL_MAX', 20),
        },
      },
      redis: {
        host: this.configService.get('REDIS_HOST'),
        port: this.configService.get('REDIS_PORT', 6379),
      },
      features: {
        queueEnabled: this.configService.get('QUEUE_ENABLED', 'true') === 'true',
      },
    };
  }
}
