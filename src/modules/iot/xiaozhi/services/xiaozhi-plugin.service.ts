/**
 * 小智插件管理服务
 * 负责插件的加载、管理和生命周期
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService, EventType, EventPriority } from '../../../../common/events/event-bus.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 插件接口
 */
interface XiaoZhiPlugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  initialize: () => Promise<void>;
  destroy: () => Promise<void>;
  handleEvent?: (event: any) => Promise<void>;
  [key: string]: any;
}

/**
 * 插件配置接口
 */
interface PluginConfig {
  name: string;
  enabled: boolean;
  config: any;
}

@Injectable()
export class XiaoZhiPluginService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XiaoZhiPluginService.name);
  private readonly plugins = new Map<string, XiaoZhiPlugin>();
  private readonly pluginConfigs = new Map<string, PluginConfig>();
  private readonly pluginDir: string;

  constructor(
    private configService: ConfigService,
    private eventBusService: EventBusService
  ) {
    this.pluginDir = this.configService.get<string>('XIAOZHI_PLUGIN_DIR') || path.join(__dirname, '..', 'plugins');
  }

  async onModuleInit() {
    this.logger.log('Plugin service initialized');
    await this.loadPlugins();
    await this.initializePlugins();
  }

  async onModuleDestroy() {
    this.logger.log('Plugin service destroying');
    await this.destroyPlugins();
  }

  /**
   * 加载插件
   */
  private async loadPlugins(): Promise<void> {
    try {
      // 确保插件目录存在
      if (!fs.existsSync(this.pluginDir)) {
        fs.mkdirSync(this.pluginDir, { recursive: true });
        this.logger.log(`Created plugin directory: ${this.pluginDir}`);
        return;
      }

      // 读取插件目录
      const pluginFiles = fs.readdirSync(this.pluginDir);
      this.logger.log(`Found ${pluginFiles.length} potential plugins`);

      for (const file of pluginFiles) {
        const pluginPath = path.join(this.pluginDir, file);
        const stats = fs.statSync(pluginPath);

        if (stats.isDirectory()) {
          // 目录形式的插件
          await this.loadDirectoryPlugin(pluginPath);
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
          // 文件形式的插件
          await this.loadFilePlugin(pluginPath);
        }
      }

      this.logger.log(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      this.logger.error('Failed to load plugins:', error);
    }
  }

  /**
   * 加载目录形式的插件
   */
  private async loadDirectoryPlugin(pluginPath: string): Promise<void> {
    try {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const mainFile = path.join(pluginPath, packageJson.main || 'index.js');
        
        if (fs.existsSync(mainFile)) {
          await this.loadPluginFromFile(mainFile, packageJson);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load directory plugin ${pluginPath}:`, error);
    }
  }

  /**
   * 加载文件形式的插件
   */
  private async loadFilePlugin(pluginPath: string): Promise<void> {
    try {
      await this.loadPluginFromFile(pluginPath);
    } catch (error) {
      this.logger.error(`Failed to load file plugin ${pluginPath}:`, error);
    }
  }

  /**
   * 从文件加载插件
   */
  private async loadPluginFromFile(pluginPath: string, packageJson?: any): Promise<void> {
    try {
      // 动态导入插件
      const pluginModule = await import(pluginPath);
      const pluginExports = pluginModule.default || pluginModule;

      // 检查插件是否符合接口
      if (pluginExports.name && pluginExports.initialize && pluginExports.destroy) {
        const plugin: XiaoZhiPlugin = {
          name: pluginExports.name,
          version: pluginExports.version || '1.0.0',
          description: pluginExports.description || '',
          author: pluginExports.author,
          enabled: pluginExports.enabled !== false,
          initialize: pluginExports.initialize,
          destroy: pluginExports.destroy,
          handleEvent: pluginExports.handleEvent,
          ...pluginExports,
        };

        this.plugins.set(plugin.name, plugin);
        this.logger.log(`Loaded plugin: ${plugin.name} v${plugin.version}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load plugin from file ${pluginPath}:`, error);
    }
  }

  /**
   * 初始化插件
   */
  private async initializePlugins(): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      if (plugin.enabled) {
        try {
          await plugin.initialize();
          this.logger.log(`Initialized plugin: ${name}`);
        } catch (error) {
          this.logger.error(`Failed to initialize plugin ${name}:`, error);
        }
      }
    }
  }

  /**
   * 销毁插件
   */
  private async destroyPlugins(): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        await plugin.destroy();
        this.logger.log(`Destroyed plugin: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to destroy plugin ${name}:`, error);
      }
    }
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn(`Plugin ${pluginName} not found`);
      return false;
    }

    if (!plugin.enabled) {
      plugin.enabled = true;
      try {
        await plugin.initialize();
        this.logger.log(`Enabled plugin: ${pluginName}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to enable plugin ${pluginName}:`, error);
        plugin.enabled = false;
        return false;
      }
    }

    return true;
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn(`Plugin ${pluginName} not found`);
      return false;
    }

    if (plugin.enabled) {
      plugin.enabled = false;
      try {
        await plugin.destroy();
        this.logger.log(`Disabled plugin: ${pluginName}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to disable plugin ${pluginName}:`, error);
        plugin.enabled = true;
        return false;
      }
    }

    return true;
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn(`Plugin ${pluginName} not found`);
      return false;
    }

    try {
      // 销毁现有插件
      await plugin.destroy();
      // 重新加载插件
      await this.loadPlugins();
      const reloadedPlugin = this.plugins.get(pluginName);
      if (reloadedPlugin && reloadedPlugin.enabled) {
        await reloadedPlugin.initialize();
      }
      this.logger.log(`Reloaded plugin: ${pluginName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to reload plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * 处理事件
   */
  async handleEvent(event: any): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      if (plugin.enabled && plugin.handleEvent) {
        try {
          await plugin.handleEvent(event);
        } catch (error) {
          this.logger.error(`Plugin ${name} failed to handle event:`, error);
        }
      }
    }
  }

  /**
   * 获取插件列表
   */
  getPlugins(): Array<XiaoZhiPlugin> {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取单个插件
   */
  getPlugin(pluginName: string): XiaoZhiPlugin | null {
    return this.plugins.get(pluginName) || null;
  }

  /**
   * 检查插件是否存在
   */
  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * 检查插件是否启用
   */
  isPluginEnabled(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    return plugin ? plugin.enabled : false;
  }

  /**
   * 获取插件配置
   */
  getPluginConfig(pluginName: string): PluginConfig | null {
    return this.pluginConfigs.get(pluginName) || null;
  }

  /**
   * 更新插件配置
   */
  updatePluginConfig(pluginName: string, config: any): boolean {
    const pluginConfig = this.pluginConfigs.get(pluginName);
    if (!pluginConfig) {
      this.logger.warn(`Plugin config not found for ${pluginName}`);
      return false;
    }

    pluginConfig.config = { ...pluginConfig.config, ...config };
    this.pluginConfigs.set(pluginName, pluginConfig);
    this.logger.log(`Updated config for plugin ${pluginName}`);
    return true;
  }

  /**
   * 注册插件
   */
  registerPlugin(plugin: XiaoZhiPlugin): boolean {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn(`Plugin ${plugin.name} already registered`);
      return false;
    }

    this.plugins.set(plugin.name, plugin);
    this.logger.log(`Registered plugin: ${plugin.name} v${plugin.version}`);
    return true;
  }

  /**
   * 卸载插件
   */
  async unregisterPlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn(`Plugin ${pluginName} not found`);
      return false;
    }

    try {
      if (plugin.enabled) {
        await plugin.destroy();
      }
      this.plugins.delete(pluginName);
      this.logger.log(`Unregistered plugin: ${pluginName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * 扫描插件目录
   */
  scanPlugins(): string[] {
    try {
      if (!fs.existsSync(this.pluginDir)) {
        return [];
      }

      const pluginFiles = fs.readdirSync(this.pluginDir);
      return pluginFiles.filter(file => {
        const pluginPath = path.join(this.pluginDir, file);
        const stats = fs.statSync(pluginPath);
        return stats.isDirectory() || file.endsWith('.js') || file.endsWith('.ts');
      });
    } catch (error) {
      this.logger.error('Failed to scan plugins:', error);
      return [];
    }
  }

  /**
   * 获取插件统计信息
   */
  getPluginStats(): {
    total: number;
    enabled: number;
    disabled: number;
    names: string[];
  } {
    const plugins = Array.from(this.plugins.values());
    const enabled = plugins.filter(p => p.enabled).length;
    const disabled = plugins.filter(p => !p.enabled).length;

    return {
      total: plugins.length,
      enabled,
      disabled,
      names: plugins.map(p => p.name),
    };
  }
}
