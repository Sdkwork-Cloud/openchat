/**
 * 插件健康检查服务
 *
 * 职责：
 * 1. 定期检查插件健康状态
 * 2. 提供健康检查 API
 * 3. 支持自定义健康检查逻辑
 * 4. 自动恢复不健康的插件
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExtensionRegistry } from './extension-registry.service';
import { ExtensionLifecycleManager } from './extension-lifecycle.manager';
import {
  IExtension,
  ExtensionStatus,
  ExtensionHealthCheck,
} from './extension.interface';

/**
 * 插件健康状态
 */
export interface ExtensionHealthStatus {
  /** 插件ID */
  extensionId: string;
  /** 插件名称 */
  name: string;
  /** 插件类型 */
  type: string;
  /** 插件状态 */
  status: ExtensionStatus;
  /** 是否健康 */
  healthy: boolean;
  /** 健康检查结果 */
  healthCheck?: ExtensionHealthCheck;
  /** 最后检查时间 */
  lastChecked?: Date;
  /** 连续失败次数 */
  consecutiveFailures: number;
  /** 最后错误 */
  lastError?: string;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  /** 是否启用健康检查 */
  enabled: boolean;
  /** 检查间隔（毫秒） */
  interval: number;
  /** 不健康阈值（连续失败次数） */
  unhealthyThreshold: number;
  /** 是否启用自动恢复 */
  autoRecovery: boolean;
  /** 恢复重试次数 */
  recoveryRetries: number;
  /** 恢复重试间隔（毫秒） */
  recoveryInterval: number;
}

/**
 * 系统健康报告
 */
export interface SystemHealthReport {
  /** 总体是否健康 */
  healthy: boolean;
  /** 检查时间 */
  timestamp: Date;
  /** 插件总数 */
  totalExtensions: number;
  /** 健康插件数 */
  healthyExtensions: number;
  /** 不健康插件数 */
  unhealthyExtensions: number;
  /** 各插件健康状态 */
  extensions: ExtensionHealthStatus[];
}

@Injectable()
export class ExtensionHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExtensionHealthService.name);
  private readonly healthStatus: Map<string, ExtensionHealthStatus> = new Map();
  private readonly config: HealthCheckConfig;
  private isRunning = false;

  constructor(
    private readonly extensionRegistry: ExtensionRegistry,
    private readonly lifecycleManager: ExtensionLifecycleManager,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      enabled: this.configService.get<boolean>('EXTENSION_HEALTH_CHECK_ENABLED', true),
      interval: this.configService.get<number>('EXTENSION_HEALTH_CHECK_INTERVAL', 60000),
      unhealthyThreshold: this.configService.get<number>('EXTENSION_UNHEALTHY_THRESHOLD', 3),
      autoRecovery: this.configService.get<boolean>('EXTENSION_AUTO_RECOVERY', true),
      recoveryRetries: this.configService.get<number>('EXTENSION_RECOVERY_RETRIES', 3),
      recoveryInterval: this.configService.get<number>('EXTENSION_RECOVERY_INTERVAL', 5000),
    };
  }

  async onModuleInit() {
    if (this.config.enabled) {
      this.isRunning = true;
      this.logger.log('Extension health check service started');
    }
  }

  async onModuleDestroy() {
    this.isRunning = false;
    this.logger.log('Extension health check service stopped');
  }

  /**
   * 定时健康检查
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthCheck() {
    if (!this.isRunning || !this.config.enabled) {
      return;
    }

    const extensions = this.extensionRegistry.getAll();

    for (const extension of extensions) {
      if (extension.status === ExtensionStatus.ACTIVE) {
        await this.checkExtensionHealth(extension);
      }
    }
  }

  /**
   * 检查单个插件健康状态
   */
  async checkExtensionHealth(extension: IExtension): Promise<ExtensionHealthStatus> {
    const extensionId = extension.meta.id;
    let status = this.healthStatus.get(extensionId);

    if (!status) {
      status = {
        extensionId,
        name: extension.meta.name,
        type: extension.type,
        status: extension.status,
        healthy: true,
        consecutiveFailures: 0,
      };
      this.healthStatus.set(extensionId, status);
    }

    status.status = extension.status;
    status.lastChecked = new Date();

    try {
      if (extension.healthCheck) {
        const healthCheck = await extension.healthCheck();
        status.healthCheck = healthCheck;
        status.healthy = healthCheck.healthy;

        if (!healthCheck.healthy) {
          status.consecutiveFailures++;
          status.lastError = healthCheck.message;
          this.logger.warn(
            `Extension '${extensionId}' health check failed: ${healthCheck.message}`,
          );
        } else {
          status.consecutiveFailures = 0;
          status.lastError = undefined;
        }
      } else {
        status.healthy = extension.status === ExtensionStatus.ACTIVE;
        status.consecutiveFailures = 0;
      }
    } catch (error) {
      status.healthy = false;
      status.consecutiveFailures++;
      status.lastError = (error as Error).message;
      this.logger.error(
        `Extension '${extensionId}' health check threw an error: ${(error as Error).message}`,
      );
    }

    if (
      !status.healthy &&
      status.consecutiveFailures >= this.config.unhealthyThreshold &&
      this.config.autoRecovery
    ) {
      await this.attemptRecovery(extension);
    }

    return status;
  }

  /**
   * 尝试恢复插件
   */
  private async attemptRecovery(extension: IExtension): Promise<boolean> {
    const extensionId = extension.meta.id;
    this.logger.log(`Attempting to recover extension '${extensionId}'...`);

    for (let attempt = 1; attempt <= this.config.recoveryRetries; attempt++) {
      this.logger.log(
        `Recovery attempt ${attempt}/${this.config.recoveryRetries} for extension '${extensionId}'`,
      );

      try {
        const context = (this.extensionRegistry as any).extensions
          ?.get(extensionId)
          ?.context;

        if (!context) {
          this.logger.warn(`No context found for extension '${extensionId}'`);
          continue;
        }

        await this.lifecycleManager.executeRestart(extension, context);

        const status = await this.checkExtensionHealth(extension);
        if (status.healthy) {
          this.logger.log(`Extension '${extensionId}' recovered successfully`);
          return true;
        }
      } catch (error) {
        this.logger.error(
          `Recovery attempt ${attempt} failed for extension '${extensionId}': ${(error as Error).message}`,
        );
      }

      if (attempt < this.config.recoveryRetries) {
        await this.sleep(this.config.recoveryInterval);
      }
    }

    this.logger.error(
      `Failed to recover extension '${extensionId}' after ${this.config.recoveryRetries} attempts`,
    );
    return false;
  }

  /**
   * 获取插件健康状态
   */
  getExtensionHealth(extensionId: string): ExtensionHealthStatus | undefined {
    return this.healthStatus.get(extensionId);
  }

  /**
   * 获取所有插件健康状态
   */
  getAllHealthStatus(): ExtensionHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * 获取系统健康报告
   */
  async getSystemHealthReport(): Promise<SystemHealthReport> {
    const extensions = this.extensionRegistry.getAll();
    const extensionStatuses: ExtensionHealthStatus[] = [];

    for (const extension of extensions) {
      const status = await this.checkExtensionHealth(extension);
      extensionStatuses.push(status);
    }

    const healthyCount = extensionStatuses.filter((s) => s.healthy).length;
    const unhealthyCount = extensionStatuses.length - healthyCount;

    return {
      healthy: unhealthyCount === 0,
      timestamp: new Date(),
      totalExtensions: extensionStatuses.length,
      healthyExtensions: healthyCount,
      unhealthyExtensions: unhealthyCount,
      extensions: extensionStatuses,
    };
  }

  /**
   * 手动触发健康检查
   */
  async triggerHealthCheck(): Promise<SystemHealthReport> {
    this.logger.log('Manual health check triggered');
    return this.getSystemHealthReport();
  }

  /**
   * 重置插件健康状态
   */
  resetExtensionHealth(extensionId: string): void {
    this.healthStatus.delete(extensionId);
    this.logger.log(`Health status reset for extension '${extensionId}'`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
