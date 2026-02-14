/**
 * 插件生命周期管理器
 *
 * 职责：
 * 1. 管理插件的完整生命周期
 * 2. 处理插件状态转换
 * 3. 提供状态机验证
 * 4. 支持事务性操作
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IExtension,
  ExtensionStatus,
  ExtensionEvent,
  ExtensionError,
  ExtensionContext,
} from './extension.interface';

/**
 * 状态转换规则
 */
const STATE_TRANSITIONS: Record<ExtensionStatus, ExtensionStatus[]> = {
  [ExtensionStatus.UNLOADED]: [ExtensionStatus.LOADING],
  [ExtensionStatus.LOADING]: [ExtensionStatus.LOADED, ExtensionStatus.ERROR, ExtensionStatus.UNLOADED],
  [ExtensionStatus.LOADED]: [ExtensionStatus.ACTIVATING, ExtensionStatus.UNLOADED],
  [ExtensionStatus.ACTIVATING]: [ExtensionStatus.ACTIVE, ExtensionStatus.ERROR, ExtensionStatus.LOADED],
  [ExtensionStatus.ACTIVE]: [ExtensionStatus.DEACTIVATING],
  [ExtensionStatus.DEACTIVATING]: [ExtensionStatus.INACTIVE, ExtensionStatus.ERROR, ExtensionStatus.ACTIVE],
  [ExtensionStatus.INACTIVE]: [ExtensionStatus.ACTIVATING, ExtensionStatus.UNLOADED],
  [ExtensionStatus.ERROR]: [ExtensionStatus.UNLOADED, ExtensionStatus.LOADING],
};

/**
 * 生命周期操作类型
 */
export enum LifecycleOperation {
  LOAD = 'load',
  UNLOAD = 'unload',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  RELOAD = 'reload',
  RESTART = 'restart',
}

/**
 * 生命周期操作结果
 */
export interface LifecycleResult {
  /** 操作是否成功 */
  success: boolean;
  /** 操作类型 */
  operation: LifecycleOperation;
  /** 插件ID */
  extensionId: string;
  /** 操作前状态 */
  previousStatus: ExtensionStatus;
  /** 操作后状态 */
  currentStatus: ExtensionStatus;
  /** 错误信息 */
  error?: Error;
  /** 耗时（毫秒） */
  duration: number;
}

/**
 * 生命周期钩子上下文
 */
export interface LifecycleHookContext {
  /** 插件实例 */
  extension: IExtension;
  /** 插件上下文 */
  context: ExtensionContext;
  /** 操作类型 */
  operation: LifecycleOperation;
  /** 开始时间 */
  startTime: number;
}

@Injectable()
export class ExtensionLifecycleManager {
  private readonly logger = new Logger(ExtensionLifecycleManager.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * 验证状态转换是否有效
   */
  canTransition(from: ExtensionStatus, to: ExtensionStatus): boolean {
    const allowedTransitions = STATE_TRANSITIONS[from] || [];
    return allowedTransitions.includes(to);
  }

  /**
   * 获取允许的下一状态列表
   */
  getAllowedTransitions(current: ExtensionStatus): ExtensionStatus[] {
    return STATE_TRANSITIONS[current] || [];
  }

  /**
   * 执行加载操作
   */
  async executeLoad(
    extension: IExtension,
    context: ExtensionContext,
  ): Promise<LifecycleResult> {
    const startTime = Date.now();
    const previousStatus = extension.status;
    const extensionId = extension.meta.id;

    try {
      if (!this.canTransition(previousStatus, ExtensionStatus.LOADING)) {
        throw new ExtensionError(
          extensionId,
          'INVALID_STATE_TRANSITION',
          `Cannot load extension from state '${previousStatus}'`,
        );
      }

      await this.transitionStatus(extension, ExtensionStatus.LOADING);

      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_LOAD, {
        extensionId,
        extension,
      });

      if (extension.onLoad) {
        await extension.onLoad(context);
      }

      await this.transitionStatus(extension, ExtensionStatus.LOADED);

      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_LOAD, {
        extensionId,
        extension,
      });

      return {
        success: true,
        operation: LifecycleOperation.LOAD,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.handleError(extension, error as Error);

      return {
        success: false,
        operation: LifecycleOperation.LOAD,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行卸载操作
   */
  async executeUnload(
    extension: IExtension,
    context: ExtensionContext,
  ): Promise<LifecycleResult> {
    const startTime = Date.now();
    const previousStatus = extension.status;
    const extensionId = extension.meta.id;

    try {
      if (previousStatus === ExtensionStatus.ACTIVE) {
        await this.executeDeactivate(extension, context);
      }

      if (!this.canTransition(extension.status, ExtensionStatus.UNLOADED)) {
        throw new ExtensionError(
          extensionId,
          'INVALID_STATE_TRANSITION',
          `Cannot unload extension from state '${extension.status}'`,
        );
      }

      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_UNLOAD, {
        extensionId,
        extension,
      });

      if (extension.onUnload) {
        await extension.onUnload(context);
      }

      await this.transitionStatus(extension, ExtensionStatus.UNLOADED);

      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_UNLOAD, {
        extensionId,
        extension,
      });

      return {
        success: true,
        operation: LifecycleOperation.UNLOAD,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.handleError(extension, error as Error);

      return {
        success: false,
        operation: LifecycleOperation.UNLOAD,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行激活操作
   */
  async executeActivate(
    extension: IExtension,
    context: ExtensionContext,
  ): Promise<LifecycleResult> {
    const startTime = Date.now();
    const previousStatus = extension.status;
    const extensionId = extension.meta.id;

    try {
      if (previousStatus === ExtensionStatus.UNLOADED) {
        await this.executeLoad(extension, context);
      }

      if (!this.canTransition(extension.status, ExtensionStatus.ACTIVATING)) {
        throw new ExtensionError(
          extensionId,
          'INVALID_STATE_TRANSITION',
          `Cannot activate extension from state '${extension.status}'`,
        );
      }

      await this.transitionStatus(extension, ExtensionStatus.ACTIVATING);

      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_ACTIVATE, {
        extensionId,
        extension,
      });

      if (extension.onActivate) {
        await extension.onActivate(context);
      }

      await this.transitionStatus(extension, ExtensionStatus.ACTIVE);

      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_ACTIVATE, {
        extensionId,
        extension,
      });

      this.logger.log(`Extension '${extensionId}' activated successfully`);

      return {
        success: true,
        operation: LifecycleOperation.ACTIVATE,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.handleError(extension, error as Error);

      return {
        success: false,
        operation: LifecycleOperation.ACTIVATE,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行停用操作
   */
  async executeDeactivate(
    extension: IExtension,
    context: ExtensionContext,
  ): Promise<LifecycleResult> {
    const startTime = Date.now();
    const previousStatus = extension.status;
    const extensionId = extension.meta.id;

    try {
      if (!this.canTransition(previousStatus, ExtensionStatus.DEACTIVATING)) {
        throw new ExtensionError(
          extensionId,
          'INVALID_STATE_TRANSITION',
          `Cannot deactivate extension from state '${previousStatus}'`,
        );
      }

      await this.transitionStatus(extension, ExtensionStatus.DEACTIVATING);

      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_DEACTIVATE, {
        extensionId,
        extension,
      });

      if (extension.onDeactivate) {
        await extension.onDeactivate(context);
      }

      await this.transitionStatus(extension, ExtensionStatus.INACTIVE);

      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_DEACTIVATE, {
        extensionId,
        extension,
      });

      return {
        success: true,
        operation: LifecycleOperation.DEACTIVATE,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.handleError(extension, error as Error);

      return {
        success: false,
        operation: LifecycleOperation.DEACTIVATE,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行重新加载操作
   */
  async executeReload(
    extension: IExtension,
    context: ExtensionContext,
  ): Promise<LifecycleResult> {
    const startTime = Date.now();
    const previousStatus = extension.status;
    const extensionId = extension.meta.id;

    try {
      await this.executeUnload(extension, context);
      await this.executeLoad(extension, context);

      if (previousStatus === ExtensionStatus.ACTIVE) {
        await this.executeActivate(extension, context);
      }

      return {
        success: true,
        operation: LifecycleOperation.RELOAD,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        operation: LifecycleOperation.RELOAD,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行重启操作
   */
  async executeRestart(
    extension: IExtension,
    context: ExtensionContext,
  ): Promise<LifecycleResult> {
    const startTime = Date.now();
    const extensionId = extension.meta.id;
    const previousStatus = extension.status;

    try {
      await this.executeDeactivate(extension, context);
      await this.executeActivate(extension, context);

      return {
        success: true,
        operation: LifecycleOperation.RESTART,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        operation: LifecycleOperation.RESTART,
        extensionId,
        previousStatus,
        currentStatus: extension.status,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 转换状态
   */
  private async transitionStatus(
    extension: IExtension,
    newStatus: ExtensionStatus,
  ): Promise<void> {
    const oldStatus = extension.status;

    if (!this.canTransition(oldStatus, newStatus)) {
      throw new ExtensionError(
        extension.meta.id,
        'INVALID_STATE_TRANSITION',
        `Invalid state transition from '${oldStatus}' to '${newStatus}'`,
      );
    }

    (extension as any)._status = newStatus;

    this.logger.debug(
      `Extension '${extension.meta.id}' state changed: ${oldStatus} -> ${newStatus}`,
    );
  }

  /**
   * 处理错误
   */
  private async handleError(extension: IExtension, error: Error): Promise<void> {
    (extension as any)._status = ExtensionStatus.ERROR;

    await this.eventEmitter.emitAsync(ExtensionEvent.ERROR, {
      extensionId: extension.meta.id,
      error,
    });

    this.logger.error(
      `Extension '${extension.meta.id}' encountered an error: ${error.message}`,
      error.stack,
    );
  }

  /**
   * 检查插件是否处于可用状态
   */
  isOperational(status: ExtensionStatus): boolean {
    return status === ExtensionStatus.ACTIVE || status === ExtensionStatus.INACTIVE;
  }

  /**
   * 检查插件是否处于活动状态
   */
  isActive(status: ExtensionStatus): boolean {
    return status === ExtensionStatus.ACTIVE;
  }

  /**
   * 检查插件是否处于过渡状态
   */
  isTransitioning(status: ExtensionStatus): boolean {
    return (
      status === ExtensionStatus.LOADING ||
      status === ExtensionStatus.ACTIVATING ||
      status === ExtensionStatus.DEACTIVATING
    );
  }

  /**
   * 检查插件是否处于错误状态
   */
  isError(status: ExtensionStatus): boolean {
    return status === ExtensionStatus.ERROR;
  }
}
