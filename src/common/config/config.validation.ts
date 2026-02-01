import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 配置验证服务
 * 在应用启动时验证关键配置项
 */
@Injectable()
export class ConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 模块初始化时执行验证
   */
  onModuleInit() {
    this.logger.log('Validating configuration...');

    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证数据库配置
    if (!this.configService.get('DB_HOST')) {
      errors.push('DB_HOST is required');
    }
    if (!this.configService.get('DB_PASSWORD')) {
      warnings.push('DB_PASSWORD is not set, using default');
    }

    // 验证 Redis 配置
    if (!this.configService.get('REDIS_HOST')) {
      warnings.push('REDIS_HOST is not set, using default (localhost)');
    }

    // 验证 JWT 密钥
    const jwtSecret = this.configService.get('JWT_SECRET');
    if (!jwtSecret) {
      errors.push('JWT_SECRET is required');
    } else if (jwtSecret === 'your-secret-key-change-this-in-production') {
      warnings.push('JWT_SECRET is using default value, please change it in production');
    }

    // 验证生产环境配置
    const nodeEnv = this.configService.get('NODE_ENV');
    if (nodeEnv === 'production') {
      if (this.configService.get('DB_SYNCHRONIZE') === 'true') {
        errors.push('DB_SYNCHRONIZE should be false in production');
      }
      if (!this.configService.get('DB_PASSWORD')) {
        errors.push('DB_PASSWORD is required in production');
      }
    }

    // 输出验证结果
    if (warnings.length > 0) {
      warnings.forEach((warn) => this.logger.warn(`Config Warning: ${warn}`));
    }

    if (errors.length > 0) {
      errors.forEach((err) => this.logger.error(`Config Error: ${err}`));
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    this.logger.log('Configuration validation passed');
  }

  /**
   * 获取配置摘要（用于日志输出）
   */
  getConfigSummary(): Record<string, any> {
    return {
      environment: this.configService.get('NODE_ENV', 'development'),
      port: this.configService.get('PORT', 3000),
      database: {
        host: this.configService.get('DB_HOST'),
        port: this.configService.get('DB_PORT', 5432),
        name: this.configService.get('DB_NAME'),
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
