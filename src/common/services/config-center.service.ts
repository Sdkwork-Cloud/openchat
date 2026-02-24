/**
 * 配置中心服务
 * 
 * 提供统一的配置管理，支持多来源配置、配置热更新、配置验证、命名空间隔离等功能
 * 支持从环境变量、配置文件、远程配置中心等多种来源加载配置
 * 
 * @framework
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { readFileSync, watch, FSWatcher } from 'fs';
import { join } from 'path';

/**
 * 配置来源类型
 */
export type ConfigSourceType = 'env' | 'file' | 'remote' | 'default' | 'override';

/**
 * 配置变更类型
 */
export type ConfigChangeType = 'set' | 'delete' | 'refresh' | 'reload';

/**
 * 配置条目
 */
export interface ConfigEntry<T = any> {
  /** 配置键 */
  key: string;
  /** 配置值 */
  value: T;
  /** 默认值 */
  defaultValue?: T;
  /** 来源类型 */
  source: ConfigSourceType;
  /** 最后更新时间 */
  updatedAt: number;
  /** 描述 */
  description?: string;
  /** 是否加密 */
  encrypted?: boolean;
  /** 验证模式 */
  validation?: RegExp | ((value: any) => boolean);
}

/**
 * 配置变更事件
 */
export interface ConfigChange {
  /** 配置键 */
  key: string;
  /** 旧值 */
  oldValue: any;
  /** 新值 */
  newValue: any;
  /** 变更类型 */
  changeType: ConfigChangeType;
  /** 时间戳 */
  timestamp: number;
  /** 来源 */
  source: ConfigSourceType;
}

/**
 * 配置命名空间
 */
export interface ConfigNamespace {
  /** 命名空间名称 */
  name: string;
  /** 配置前缀 */
  prefix: string;
  /** 配置条目 */
  entries: Map<string, ConfigEntry>;
  /** 描述 */
  description?: string;
}

/**
 * 配置中心选项
 */
export interface ConfigCenterOptions {
  /** 配置文件路径 */
  configPaths?: string[];
  /** 是否启用文件监听 */
  enableFileWatch?: boolean;
  /** 是否启用远程配置 */
  enableRemote?: boolean;
  /** 远程配置 URL */
  remoteUrl?: string;
  /** 远程配置拉取间隔（秒） */
  remotePullInterval?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存 TTL（秒） */
  cacheTTL?: number;
  /** 是否加密敏感配置 */
  enableEncryption?: boolean;
  /** 配置验证模式 */
  validationSchema?: Record<string, any>;
}

/**
 * 配置统计信息
 */
export interface ConfigStats {
  /** 配置条目总数 */
  totalEntries: number;
  /** 命名空间数量 */
  namespaceCount: number;
  /** 变更次数 */
  changeCount: number;
  /** 最后变更时间 */
  lastChangeTime: number;
  /** 来源统计 */
  sourceStats: Record<ConfigSourceType, number>;
}

/**
 * 配置中心服务
 */
@Injectable()
export class ConfigCenterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConfigCenterService.name);
  
  private readonly entries = new Map<string, ConfigEntry>();
  private readonly namespaces = new Map<string, ConfigNamespace>();
  private readonly changeHistory: ConfigChange[] = [];
  private readonly options: Required<ConfigCenterOptions>;
  
  private fileWatcher?: FSWatcher;
  private remotePullInterval?: NodeJS.Timeout;
  private changeCount = 0;
  private lastChangeTime = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.options = {
      configPaths: this.configService.get<string[]>('CONFIG_PATHS', ['config/default.json', 'config/production.json']),
      enableFileWatch: this.configService.get<boolean>('CONFIG_ENABLE_FILE_WATCH', true),
      enableRemote: this.configService.get<boolean>('CONFIG_ENABLE_REMOTE', false),
      remoteUrl: this.configService.get<string>('CONFIG_REMOTE_URL', ''),
      remotePullInterval: this.configService.get<number>('CONFIG_REMOTE_PULL_INTERVAL', 300),
      enableCache: this.configService.get<boolean>('CONFIG_ENABLE_CACHE', true),
      cacheTTL: this.configService.get<number>('CONFIG_CACHE_TTL', 300),
      enableEncryption: this.configService.get<boolean>('CONFIG_ENABLE_ENCRYPTION', false),
      validationSchema: this.configService.get('CONFIG_VALIDATION_SCHEMA', {}),
    };
  }

  onModuleInit() {
    this.loadDefaultConfig();
    this.loadFromEnv();
    this.loadFromFiles();
    this.setupFileWatcher();
    this.setupRemotePull();
    this.logger.log('ConfigCenterService initialized');
  }

  onModuleDestroy() {
    this.fileWatcher?.close();
    if (this.remotePullInterval) {
      clearInterval(this.remotePullInterval);
    }
  }

  /**
   * 获取配置值
   */
  get<T = any>(key: string, defaultValue?: T): T {
    // 先检查缓存
    const entry = this.entries.get(key);
    if (entry && this.isEntryValid(entry)) {
      return entry.value as T;
    }

    // 从 ConfigService 获取
    const value = this.configService.get<T>(key, defaultValue as any) as T;

    // 更新缓存
    if (value !== undefined) {
      this.setEntry(key, value, 'env');
    }

    return value as T;
  }

  /**
   * 获取命名空间配置
   */
  getNamespace<T = any>(namespace: string): Record<string, T> {
    const ns = this.namespaces.get(namespace);
    if (!ns) {
      return this.configService.get<Record<string, T>>(namespace, {} as any) as Record<string, T>;
    }

    const result: Record<string, T> = {};
    for (const [key, entry] of ns.entries.entries()) {
      result[key] = entry.value as T;
    }
    return result;
  }

  /**
   * 设置配置值
   */
  set<T>(key: string, value: T, options?: { source?: ConfigSourceType; description?: string }): boolean {
    const oldValue = this.get(key);
    
    // 验证
    const entry = this.entries.get(key);
    if (entry?.validation && !this.validateValue(value, entry.validation)) {
      this.logger.warn(`Config validation failed for key: ${key}`);
      return false;
    }

    this.setEntry(key, value, options?.source || 'override', options?.description);
    this.recordChange(key, oldValue, value, 'set', options?.source || 'override');
    
    return true;
  }

  /**
   * 删除配置
   */
  delete(key: string): boolean {
    const oldValue = this.get(key);
    const deleted = this.entries.delete(key);
    
    if (deleted) {
      this.recordChange(key, oldValue, undefined, 'delete', 'override');
    }
    
    return deleted;
  }

  /**
   * 刷新配置
   */
  async refresh(key?: string): Promise<void> {
    if (key) {
      // 刷新单个配置
      const entry = this.entries.get(key);
      if (entry) {
        const oldValue = entry.value;
        const newValue = this.configService.get(key);
        
        if (newValue !== undefined && newValue !== oldValue) {
          this.setEntry(key, newValue, entry.source);
          this.recordChange(key, oldValue, newValue, 'refresh', entry.source);
        }
      }
    } else {
      // 刷新所有配置
      this.loadFromEnv();
      this.loadFromFiles();
      
      this.eventEmitter.emit('config.refreshed', {
        timestamp: Date.now(),
        source: 'manual',
      });
    }
  }

  /**
   * 注册命名空间
   */
  registerNamespace(name: string, prefix: string, description?: string): ConfigNamespace {
    const namespace: ConfigNamespace = {
      name,
      prefix,
      entries: new Map(),
      description,
    };

    this.namespaces.set(name, namespace);
    this.logger.debug(`Registered config namespace: ${name} (prefix: ${prefix})`);

    // 加载命名空间配置
    this.loadNamespace(namespace);

    return namespace;
  }

  /**
   * 获取配置键列表
   */
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.entries.keys());
    
    if (!pattern) {
      return keys;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  /**
   * 获取配置条目
   */
  getEntry(key: string): ConfigEntry | undefined {
    return this.entries.get(key);
  }

  /**
   * 获取所有条目
   */
  getAllEntries(): Map<string, ConfigEntry> {
    return new Map(this.entries);
  }

  /**
   * 获取变更历史
   */
  getChangeHistory(limit: number = 100): ConfigChange[] {
    return this.changeHistory.slice(-limit);
  }

  /**
   * 获取统计信息
   */
  getStats(): ConfigStats {
    const sourceStats: Record<ConfigSourceType, number> = {
      env: 0,
      file: 0,
      remote: 0,
      default: 0,
      override: 0,
    };

    for (const entry of this.entries.values()) {
      sourceStats[entry.source]++;
    }

    return {
      totalEntries: this.entries.size,
      namespaceCount: this.namespaces.size,
      changeCount: this.changeCount,
      lastChangeTime: this.lastChangeTime,
      sourceStats,
    };
  }

  /**
   * 导出配置
   */
  exportConfig(options?: { format?: 'json' | 'env' | 'yaml'; excludeSource?: ConfigSourceType[] }): string {
    const excludeSource = options?.excludeSource || ['default'];
    const entries: Record<string, any> = {};

    for (const [key, entry] of this.entries.entries()) {
      if (!excludeSource.includes(entry.source)) {
        entries[key] = entry.value;
      }
    }

    switch (options?.format) {
      case 'env':
        return Object.entries(entries)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join('\n');
      case 'json':
      default:
        return JSON.stringify(entries, null, 2);
    }
  }

  /**
   * 导入配置
   */
  importConfig(config: Record<string, any>, source: ConfigSourceType = 'override'): number {
    let count = 0;

    for (const [key, value] of Object.entries(config)) {
      if (this.set(key, value, { source })) {
        count++;
      }
    }

    return count;
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, entry] of this.entries.entries()) {
      if (entry.validation && !this.validateValue(entry.value, entry.validation)) {
        errors.push(`Validation failed for key: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 加载默认配置
   */
  private loadDefaultConfig(): void {
    // 可以从默认配置文件加载
    this.logger.debug('Loaded default configuration');
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnv(): void {
    // 环境变量已经由 ConfigService 自动加载
    this.logger.debug('Loaded configuration from environment');
  }

  /**
   * 从文件加载配置
   */
  private loadFromFiles(): void {
    for (const configPath of this.options.configPaths) {
      try {
        const fullPath = join(process.cwd(), configPath);
        const content = readFileSync(fullPath, 'utf-8');
        const config = JSON.parse(content);
        this.importConfig(config, 'file');
        this.logger.debug(`Loaded configuration from file: ${configPath}`);
      } catch (error: any) {
        // 文件不存在时不报错
        if (error.code !== 'ENOENT') {
          this.logger.warn(`Failed to load config from ${configPath}:`, error.message);
        }
      }
    }
  }

  /**
   * 加载命名空间配置
   */
  private loadNamespace(namespace: ConfigNamespace): void {
    const prefix = namespace.prefix;
    // 使用 Object.keys 替代 configService.keys()
    const allKeys = Object.keys(process.env).filter(k => k.startsWith(prefix));

    for (const key of allKeys) {
      if (key.startsWith(prefix)) {
        const shortKey = key.substring(prefix.length + 1);
        const value = this.configService.get(key);

        namespace.entries.set(shortKey, {
          key: shortKey,
          value,
          source: 'env',
          updatedAt: Date.now(),
        });

        this.entries.set(key, {
          key,
          value,
          source: 'env',
          updatedAt: Date.now(),
        });
      }
    }
  }

  /**
   * 设置配置条目
   */
  private setEntry<T>(
    key: string,
    value: T,
    source: ConfigSourceType,
    description?: string,
  ): void {
    const now = Date.now();
    
    this.entries.set(key, {
      key,
      value,
      source,
      updatedAt: now,
      description,
    });

    // 更新命名空间
    for (const namespace of this.namespaces.values()) {
      if (key.startsWith(namespace.prefix)) {
        const shortKey = key.substring(namespace.prefix.length + 1);
        namespace.entries.set(shortKey, {
          key: shortKey,
          value,
          source,
          updatedAt: now,
        });
      }
    }
  }

  /**
   * 检查条目是否有效
   */
  private isEntryValid(entry: ConfigEntry): boolean {
    if (!this.options.enableCache) {
      return false;
    }

    const now = Date.now();
    const age = (now - entry.updatedAt) / 1000;

    return age < this.options.cacheTTL;
  }

  /**
   * 验证值
   */
  private validateValue(value: any, validation: RegExp | ((value: any) => boolean)): boolean {
    if (typeof validation === 'function') {
      return validation(value);
    }
    if (validation instanceof RegExp) {
      return typeof value === 'string' && validation.test(value);
    }
    return true;
  }

  /**
   * 记录变更
   */
  private recordChange(
    key: string,
    oldValue: any,
    newValue: any,
    changeType: ConfigChangeType,
    source: ConfigSourceType,
  ): void {
    const change: ConfigChange = {
      key,
      oldValue,
      newValue,
      changeType,
      timestamp: Date.now(),
      source,
    };

    this.changeHistory.push(change);
    this.changeCount++;
    this.lastChangeTime = change.timestamp;

    // 限制历史记录数量
    if (this.changeHistory.length > 1000) {
      this.changeHistory.shift();
    }

    // 发射事件
    this.eventEmitter.emit('config.changed', change);
    this.eventEmitter.emit(`config.changed.${key}`, change);
  }

  /**
   * 设置文件监听
   */
  private setupFileWatcher(): void {
    if (!this.options.enableFileWatch) {
      return;
    }

    try {
      const configDir = join(process.cwd(), 'config');
      this.fileWatcher = watch(configDir, { persistent: false }, (eventType, filename) => {
        if (eventType === 'change' && filename?.endsWith('.json')) {
          this.logger.debug(`Config file changed: ${filename}`);
          this.refresh();
        }
      });

      this.logger.log('Config file watcher started');
    } catch (error: any) {
      this.logger.warn('Failed to setup config file watcher:', error.message);
    }
  }

  /**
   * 设置远程配置拉取
   */
  private setupRemotePull(): void {
    if (!this.options.enableRemote || !this.options.remoteUrl) {
      return;
    }

    this.remotePullInterval = setInterval(async () => {
      try {
        await this.pullRemoteConfig();
      } catch (error: any) {
        this.logger.warn('Failed to pull remote config:', error.message);
      }
    }, this.options.remotePullInterval * 1000);

    this.logger.log('Remote config puller started');
  }

  /**
   * 拉取远程配置
   */
  private async pullRemoteConfig(): Promise<void> {
    // 实现远程配置拉取逻辑
    // 这里可以根据实际需求接入远程配置中心
  }
}

/**
 * 配置装饰器
 */
export function Config(key: string, defaultValue?: any) {
  return function (target: any, propertyKey: string) {
    const privateKey = `_${propertyKey}`;
    
    Object.defineProperty(target, propertyKey, {
      get() {
        const configService = (this as any).configCenter as ConfigCenterService;
        if (configService) {
          return configService.get(key, defaultValue);
        }
        return this[privateKey];
      },
    });
  };
}

/**
 * 配置命名空间装饰器
 */
export function ConfigNamespaceDecorator(namespace: string) {
  return function (target: any) {
    const configService = (target as any).configCenter as ConfigCenterService;
    if (configService) {
      return configService.getNamespace(namespace);
    }
    return {};
  };
}
