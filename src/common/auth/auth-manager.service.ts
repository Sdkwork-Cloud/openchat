import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthStrategy, AuthResult } from './auth-strategy.interface';

/**
 * 认证配置
 */
export interface AuthConfig {
  /**
   * 启用的认证策略（按优先级排序）
   */
  enabledStrategies: string[];

  /**
   * 默认认证策略
   */
  defaultStrategy?: string;

  /**
   * 是否允许匿名访问
   */
  allowAnonymous?: boolean;

  /**
   * 策略特定配置
   */
  strategyConfig?: Record<string, any>;
}

/**
 * 认证管理器服务
 * 统一管理多种认证策略
 */
@Injectable()
export class AuthManagerService implements OnModuleInit {
  private readonly logger = new Logger(AuthManagerService.name);
  private strategies: Map<string, AuthStrategy> = new Map();
  private config: AuthConfig;

  constructor(private configService: ConfigService) {}

  /**
   * 模块初始化
   */
  onModuleInit() {
    // 加载认证配置
    this.config = {
      enabledStrategies: this.configService.get<string[]>('AUTH_ENABLED_STRATEGIES', ['jwt', 'bot-token', 'api-key']),
      defaultStrategy: this.configService.get<string>('AUTH_DEFAULT_STRATEGY', 'jwt'),
      allowAnonymous: this.configService.get<boolean>('AUTH_ALLOW_ANONYMOUS', false),
      strategyConfig: this.configService.get<Record<string, any>>('AUTH_STRATEGY_CONFIG', {}),
    };

    this.logger.log(`AuthManager initialized with strategies: ${this.config.enabledStrategies.join(', ')}`);
  }

  /**
   * 注册认证策略
   */
  registerStrategy(strategy: AuthStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.log(`Registered auth strategy: ${strategy.name} (priority: ${strategy.priority})`);
  }

  /**
   * 注销认证策略
   */
  unregisterStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * 执行认证
   * 按照优先级尝试所有启用的策略
   */
  async authenticate(request: Request): Promise<AuthResult> {
    // 获取启用的策略并按优先级排序
    const enabledStrategies = this.getEnabledStrategies();

    if (enabledStrategies.length === 0) {
      return {
        success: false,
        error: 'No authentication strategies enabled'
      };
    }

    // 按优先级尝试每个策略
    for (const strategy of enabledStrategies) {
      if (strategy.canHandle(request)) {
        this.logger.debug(`Trying auth strategy: ${strategy.name}`);

        const result = await strategy.authenticate(request);

        if (result.success) {
          this.logger.debug(`Auth successful with strategy: ${strategy.name}`);

          // 添加策略信息到结果
          return {
            ...result,
            metadata: {
              ...result.metadata,
              authStrategy: strategy.name,
            }
          };
        }

        // 如果策略能处理但认证失败，记录错误
        this.logger.debug(`Auth failed with strategy ${strategy.name}: ${result.error}`);
      }
    }

    // 所有策略都失败
    return {
      success: false,
      error: 'Authentication failed'
    };
  }

  /**
   * 使用指定策略认证
   */
  async authenticateWithStrategy(
    request: Request,
    strategyName: string
  ): Promise<AuthResult> {
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      return {
        success: false,
        error: `Unknown auth strategy: ${strategyName}`
      };
    }

    if (!this.isStrategyEnabled(strategyName)) {
      return {
        success: false,
        error: `Auth strategy not enabled: ${strategyName}`
      };
    }

    const result = await strategy.authenticate(request);

    if (result.success) {
      return {
        ...result,
        metadata: {
          ...result.metadata,
          authStrategy: strategyName,
        }
      };
    }

    return result;
  }

  /**
   * 检查是否允许匿名访问
   */
  isAnonymousAllowed(): boolean {
    return this.config.allowAnonymous || false;
  }

  /**
   * 获取启用的策略列表
   */
  getEnabledStrategies(): AuthStrategy[] {
    return Array.from(this.strategies.values())
      .filter(strategy => this.isStrategyEnabled(strategy.name))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取所有已注册的策略
   */
  getAllStrategies(): AuthStrategy[] {
    return Array.from(this.strategies.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 检查策略是否启用
   */
  isStrategyEnabled(name: string): boolean {
    return this.config.enabledStrategies.includes(name);
  }

  /**
   * 启用策略
   */
  enableStrategy(name: string): void {
    if (!this.config.enabledStrategies.includes(name)) {
      this.config.enabledStrategies.push(name);
      this.logger.log(`Enabled auth strategy: ${name}`);
    }
  }

  /**
   * 禁用策略
   */
  disableStrategy(name: string): void {
    const index = this.config.enabledStrategies.indexOf(name);
    if (index > -1) {
      this.config.enabledStrategies.splice(index, 1);
      this.logger.log(`Disabled auth strategy: ${name}`);
    }
  }

  /**
   * 获取策略配置
   */
  getStrategyConfig<T = any>(strategyName: string): T | undefined {
    return this.config.strategyConfig?.[strategyName];
  }

  /**
   * 更新策略配置
   */
  setStrategyConfig(strategyName: string, config: any): void {
    if (!this.config.strategyConfig) {
      this.config.strategyConfig = {};
    }
    this.config.strategyConfig[strategyName] = config;
  }
}
