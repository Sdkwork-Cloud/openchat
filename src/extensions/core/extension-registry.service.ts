/**
 * 扩展插件注册中心
 *
 * 职责：
 * 1. 管理插件的生命周期
 * 2. 处理插件的依赖关系
 * 3. 提供插件发现和获取能力
 * 4. 发送插件相关事件
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IExtension,
  ExtensionType,
  ExtensionStatus,
  ExtensionPriority,
  ExtensionMeta,
  ExtensionConfig,
  ExtensionContext,
  ExtensionLogger,
  ExtensionRegistration,
  ExtensionEvent,
  ExtensionError,
  ExtensionNotFoundError,
  ExtensionDependencyError,
} from './extension.interface';

/**
 * 插件配置接口
 */
export interface ExtensionsConfig {
  /** 是否启用插件系统 */
  enabled: boolean;
  /** 插件配置目录 */
  configDir?: string;
  /** 插件列表 */
  extensions?: Record<string, ExtensionConfig>;
}

/**
 * 扩展注册中心
 */
@Injectable()
export class ExtensionRegistry implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExtensionRegistry.name);
  private readonly extensions: Map<string, ExtensionRegistration> = new Map();
  private readonly typeIndex: Map<ExtensionType, Set<string>> = new Map();
  private readonly config: ExtensionsConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = this.configService.get<ExtensionsConfig>('extensions') || {
      enabled: true,
      extensions: {},
    };
  }

  async onModuleInit() {
    if (!this.config.enabled) {
      this.logger.log('Extension system is disabled');
      return;
    }
    this.logger.log('Extension registry initialized');
  }

  async onModuleDestroy() {
    await this.deactivateAll();
    await this.unloadAll();
    this.extensions.clear();
    this.typeIndex.clear();
  }

  /**
   * 注册插件
   */
  async register(extension: IExtension, config?: Partial<ExtensionConfig>): Promise<void> {
    const meta = extension.meta;

    if (this.extensions.has(meta.id)) {
      throw new ExtensionError(meta.id, 'ALREADY_REGISTERED', `Extension '${meta.id}' is already registered`);
    }

    const extensionConfig: ExtensionConfig = {
      enabled: true,
      priority: ExtensionPriority.NORMAL,
      ...this.config.extensions?.[meta.id],
      ...config,
    };

    const context = this.createContext(extension, extensionConfig);

    const registration: ExtensionRegistration = {
      extension,
      context,
      registeredAt: new Date(),
      updatedAt: new Date(),
    };

    this.extensions.set(meta.id, registration);

    this.addToTypeIndex(meta.id, extension.type);

    this.logger.log(`Extension '${meta.id}' (${extension.type}) registered`);

    if (extensionConfig.enabled) {
      await this.load(meta.id);
    }
  }

  /**
   * 注销插件
   */
  async unregister(extensionId: string): Promise<void> {
    const registration = this.extensions.get(extensionId);
    if (!registration) {
      return;
    }

    await this.deactivate(extensionId);
    await this.unload(extensionId);

    this.removeFromTypeIndex(extensionId, registration.extension.type);
    this.extensions.delete(extensionId);

    this.logger.log(`Extension '${extensionId}' unregistered`);
  }

  /**
   * 加载插件
   */
  async load(extensionId: string): Promise<void> {
    const registration = this.extensions.get(extensionId);
    if (!registration) {
      throw new ExtensionNotFoundError(extensionId);
    }

    const { extension, context } = registration;

    if (extension.status !== ExtensionStatus.UNLOADED) {
      return;
    }

    await this.setStatus(extension, ExtensionStatus.LOADING);

    try {
      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_LOAD, { extensionId, extension });

      if (extension.onLoad) {
        await extension.onLoad(context);
      }

      await this.setStatus(extension, ExtensionStatus.LOADED);
      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_LOAD, { extensionId, extension });

      this.logger.log(`Extension '${extensionId}' loaded`);
    } catch (error) {
      await this.setStatus(extension, ExtensionStatus.ERROR);
      await this.eventEmitter.emitAsync(ExtensionEvent.ERROR, { extensionId, error });
      throw new ExtensionError(extensionId, 'LOAD_FAILED', `Failed to load extension '${extensionId}'`, error);
    }
  }

  /**
   * 卸载插件
   */
  async unload(extensionId: string): Promise<void> {
    const registration = this.extensions.get(extensionId);
    if (!registration) {
      return;
    }

    const { extension, context } = registration;

    if (extension.status === ExtensionStatus.UNLOADED) {
      return;
    }

    if (extension.status === ExtensionStatus.ACTIVE) {
      await this.deactivate(extensionId);
    }

    await this.setStatus(extension, ExtensionStatus.LOADING);

    try {
      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_UNLOAD, { extensionId, extension });

      if (extension.onUnload) {
        await extension.onUnload(context);
      }

      await this.setStatus(extension, ExtensionStatus.UNLOADED);
      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_UNLOAD, { extensionId, extension });

      this.logger.log(`Extension '${extensionId}' unloaded`);
    } catch (error) {
      await this.setStatus(extension, ExtensionStatus.ERROR);
      await this.eventEmitter.emitAsync(ExtensionEvent.ERROR, { extensionId, error });
      throw new ExtensionError(extensionId, 'UNLOAD_FAILED', `Failed to unload extension '${extensionId}'`, error);
    }
  }

  /**
   * 激活插件
   */
  async activate(extensionId: string): Promise<void> {
    const registration = this.extensions.get(extensionId);
    if (!registration) {
      throw new ExtensionNotFoundError(extensionId);
    }

    const { extension, context } = registration;

    if (extension.status === ExtensionStatus.ACTIVE) {
      return;
    }

    if (extension.status !== ExtensionStatus.LOADED && extension.status !== ExtensionStatus.INACTIVE) {
      await this.load(extensionId);
    }

    await this.checkDependencies(extension);

    await this.setStatus(extension, ExtensionStatus.ACTIVATING);

    try {
      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_ACTIVATE, { extensionId, extension });

      if (extension.onActivate) {
        await extension.onActivate(context);
      }

      await this.setStatus(extension, ExtensionStatus.ACTIVE);
      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_ACTIVATE, { extensionId, extension });

      this.logger.log(`Extension '${extensionId}' activated`);
    } catch (error) {
      await this.setStatus(extension, ExtensionStatus.ERROR);
      await this.eventEmitter.emitAsync(ExtensionEvent.ERROR, { extensionId, error });
      throw new ExtensionError(extensionId, 'ACTIVATE_FAILED', `Failed to activate extension '${extensionId}'`, error);
    }
  }

  /**
   * 停用插件
   */
  async deactivate(extensionId: string): Promise<void> {
    const registration = this.extensions.get(extensionId);
    if (!registration) {
      return;
    }

    const { extension, context } = registration;

    if (extension.status !== ExtensionStatus.ACTIVE) {
      return;
    }

    await this.setStatus(extension, ExtensionStatus.DEACTIVATING);

    try {
      await this.eventEmitter.emitAsync(ExtensionEvent.BEFORE_DEACTIVATE, { extensionId, extension });

      if (extension.onDeactivate) {
        await extension.onDeactivate(context);
      }

      await this.setStatus(extension, ExtensionStatus.INACTIVE);
      await this.eventEmitter.emitAsync(ExtensionEvent.AFTER_DEACTIVATE, { extensionId, extension });

      this.logger.log(`Extension '${extensionId}' deactivated`);
    } catch (error) {
      await this.setStatus(extension, ExtensionStatus.ERROR);
      await this.eventEmitter.emitAsync(ExtensionEvent.ERROR, { extensionId, error });
      throw new ExtensionError(extensionId, 'DEACTIVATE_FAILED', `Failed to deactivate extension '${extensionId}'`, error);
    }
  }

  /**
   * 获取插件
   */
  get(extensionId: string): IExtension | null {
    const registration = this.extensions.get(extensionId);
    return registration?.extension || null;
  }

  /**
   * 获取所有指定类型的插件
   */
  getByType(type: ExtensionType): IExtension[] {
    const ids = this.typeIndex.get(type);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.extensions.get(id)?.extension)
      .filter((ext): ext is IExtension => ext !== undefined);
  }

  /**
   * 获取所有激活状态的插件
   */
  getActive(): IExtension[] {
    return Array.from(this.extensions.values())
      .filter((r) => r.extension.status === ExtensionStatus.ACTIVE)
      .map((r) => r.extension);
  }

  /**
   * 获取指定类型的激活插件（按优先级排序）
   */
  getActiveByType(type: ExtensionType): IExtension[] {
    return this.getByType(type)
      .filter((ext) => ext.status === ExtensionStatus.ACTIVE)
      .sort((a, b) => {
        const priorityA = a.getConfig().priority ?? ExtensionPriority.NORMAL;
        const priorityB = b.getConfig().priority ?? ExtensionPriority.NORMAL;
        return priorityA - priorityB;
      });
  }

  /**
   * 获取最高优先级的激活插件
   */
  getPrimary<T extends IExtension = IExtension>(type: ExtensionType): T | null {
    const active = this.getActiveByType(type);
    return (active[0] as T) || null;
  }

  /**
   * 检查插件是否存在
   */
  has(extensionId: string): boolean {
    return this.extensions.has(extensionId);
  }

  /**
   * 获取所有插件信息
   */
  getAll(): IExtension[] {
    return Array.from(this.extensions.values()).map((r) => r.extension);
  }

  /**
   * 更新插件配置
   */
  async updateConfig(extensionId: string, config: Partial<ExtensionConfig>): Promise<void> {
    const registration = this.extensions.get(extensionId);
    if (!registration) {
      throw new ExtensionNotFoundError(extensionId);
    }

    const { extension } = registration;
    const oldConfig = extension.getConfig();

    await extension.updateConfig(config);

    registration.updatedAt = new Date();

    await this.eventEmitter.emitAsync(ExtensionEvent.CONFIG_CHANGED, {
      extensionId,
      oldConfig,
      newConfig: extension.getConfig(),
    });
  }

  /**
   * 停用所有插件
   */
  private async deactivateAll(): Promise<void> {
    const active = Array.from(this.extensions.keys()).filter(
      (id) => this.extensions.get(id)?.extension.status === ExtensionStatus.ACTIVE,
    );

    for (const id of active.reverse()) {
      try {
        await this.deactivate(id);
      } catch (error) {
        this.logger.error(`Failed to deactivate extension '${id}':`, error);
      }
    }
  }

  /**
   * 卸载所有插件
   */
  private async unloadAll(): Promise<void> {
    const loaded = Array.from(this.extensions.keys()).filter(
      (id) => this.extensions.get(id)?.extension.status !== ExtensionStatus.UNLOADED,
    );

    for (const id of loaded.reverse()) {
      try {
        await this.unload(id);
      } catch (error) {
        this.logger.error(`Failed to unload extension '${id}':`, error);
      }
    }
  }

  /**
   * 创建插件上下文
   */
  private createContext(extension: IExtension, config: ExtensionConfig): ExtensionContext {
    const extensionLogger: ExtensionLogger = {
      debug: (message, ...args) => this.logger.debug(`[${extension.meta.id}] ${message}`, ...args),
      info: (message, ...args) => this.logger.log(`[${extension.meta.id}] ${message}`, ...args),
      warn: (message, ...args) => this.logger.warn(`[${extension.meta.id}] ${message}`, ...args),
      error: (message, ...args) => this.logger.error(`[${extension.meta.id}] ${message}`, ...args),
    };

    return {
      config,
      logger: extensionLogger,
      getExtension: (id: string) => this.get(id),
      getExtensionsByType: (type: ExtensionType) => this.getByType(type),
      emit: (event: string, ...args: any[]) => this.eventEmitter.emit(event, ...args),
      on: (event: string, listener: (...args: any[]) => void) => this.eventEmitter.on(event, listener),
      off: (event: string, listener: (...args: any[]) => void) => this.eventEmitter.off(event, listener),
      appConfig: this.configService.get('app'),
    };
  }

  /**
   * 设置插件状态
   */
  private async setStatus(extension: IExtension, status: ExtensionStatus): Promise<void> {
    (extension as any)._status = status;
  }

  /**
   * 添加到类型索引
   */
  private addToTypeIndex(extensionId: string, type: ExtensionType): void {
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(extensionId);
  }

  /**
   * 从类型索引移除
   */
  private removeFromTypeIndex(extensionId: string, type: ExtensionType): void {
    const set = this.typeIndex.get(type);
    if (set) {
      set.delete(extensionId);
      if (set.size === 0) {
        this.typeIndex.delete(type);
      }
    }
  }

  /**
   * 检查依赖
   */
  private async checkDependencies(extension: IExtension): Promise<void> {
    const dependencies = extension.meta.dependencies || [];

    for (const dep of dependencies) {
      const depExtension = this.get(dep.extensionId);

      if (!depExtension && dep.required !== false) {
        throw new ExtensionDependencyError(extension.meta.id, dep.extensionId);
      }

      if (depExtension && depExtension.status !== ExtensionStatus.ACTIVE && dep.required !== false) {
        await this.activate(dep.extensionId);
      }
    }
  }
}
