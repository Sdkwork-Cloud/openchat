/**
 * 插件管理器
 *
 * 功能：
 * 1. 插件的加载、激活、停用、卸载
 * 2. 钩子的注册和触发
 * 3. 插件配置管理
 * 4. 插件依赖和冲突检测
 * 5. 插件状态管理
 */

import { Plugin, PluginManager as PluginManagerInterface, PluginStatus, PluginConfig, PluginHook, HookType, PluginError } from './types';
import { errorService } from '../services/error.service';

// 浏览器兼容的 EventEmitter 实现
class EventEmitter {
  private events: Map<string, Function[]>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  once(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
    return this;
  }

  off(event: string, listener: Function): this {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      for (const listener of listeners) {
        listener(...args);
      }
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  getMaxListeners(): number {
    return 0;
  }

  setMaxListeners(n: number): this {
    return this;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  rawListeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  prependListener(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(onceListener);
    return this;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

class PluginManager extends EventEmitter implements PluginManagerInterface {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private hooks: Map<string, PluginHook[]> = new Map();
  private pluginErrors: PluginError[] = [];
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * 初始化插件管理器
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 加载内置插件
    this.loadBuiltInPlugins();
    
    // 启动插件热插拔监控
    this.startHotPlugMonitoring();
    
    this.isInitialized = true;
    console.log('[PluginManager] Initialized');
  }

  /**
   * 加载内置插件
   */
  private loadBuiltInPlugins(): void {
    // 这里可以加载内置插件
    console.log('[PluginManager] Loading built-in plugins');
  }

  /**
   * 加载插件
   */
  async loadPlugin(id: string): Promise<Plugin> {
    // 检查插件是否已加载
    if (this.plugins.has(id)) {
      return this.plugins.get(id)!;
    }

    try {
      // 这里应该从插件路径加载插件
      // 暂时返回一个模拟插件
      const plugin = this.createMockPlugin(id);
      this.plugins.set(id, plugin);

      // 初始化插件
      await plugin.initialize({
        app: {},
        services: {},
        config: plugin.config,
        logger: {
          info: (message: string) => console.log(`[Plugin ${id}] ${message}`),
          warn: (message: string) => console.warn(`[Plugin ${id}] ${message}`),
          error: (message: string) => console.error(`[Plugin ${id}] ${message}`),
          debug: (message: string) => console.debug(`[Plugin ${id}] ${message}`),
        },
      });

      plugin.status = 'loaded';
      this.emit('plugin:loaded', plugin);
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to load plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      // 停用插件
      if (plugin.status === 'activated') {
        await plugin.deactivate();
      }

      // 卸载插件
      await plugin.uninstall();

      // 移除插件
      this.plugins.delete(id);

      // 移除插件注册的钩子
      this.removePluginHooks(id);

      this.emit('plugin:unloaded', id);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 激活插件
   */
  async activatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      // 检查依赖
      const dependencies = this.getPluginDependencies(id);
      for (const depId of dependencies) {
        if (!this.plugins.has(depId)) {
          await this.loadPlugin(depId);
        }
        const depPlugin = this.plugins.get(depId);
        if (depPlugin?.status !== 'activated') {
          await this.activatePlugin(depId);
        }
      }

      // 检查冲突
      const conflicts = this.getPluginConflicts(id);
      for (const conflictId of conflicts) {
        if (this.plugins.has(conflictId)) {
          const conflictPlugin = this.plugins.get(conflictId);
          if (conflictPlugin?.status === 'activated') {
            throw new Error(`Plugin ${id} conflicts with ${conflictId}`);
          }
        }
      }

      // 激活插件
      await plugin.activate();
      plugin.status = 'activated';

      this.emit('plugin:activated', plugin);
    } catch (error: any) {
      plugin.setError(error.message);
      plugin.status = 'error';
      this.emit('plugin:error', plugin);
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      await plugin.deactivate();
      plugin.status = 'deactivated';

      this.emit('plugin:deactivated', plugin);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 获取插件
   */
  getPlugin(id: string): Plugin | null {
    return this.plugins.get(id) || null;
  }

  /**
   * 获取所有插件
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 根据状态获取插件
   */
  getPluginsByStatus(status: PluginStatus): Plugin[] {
    return this.getPlugins().filter(plugin => plugin.status === status);
  }

  /**
   * 根据类别获取插件
   */
  getPluginsByCategory(category: string): Plugin[] {
    return this.getPlugins().filter(plugin => plugin.metadata.category === category);
  }

  /**
   * 注册钩子
   */
  registerHook(name: string, callback: (...args: any[]) => any, priority: number = 0): void {
    const hook: PluginHook = {
      name,
      callback,
      priority,
    };

    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    this.hooks.get(name)!.push(hook);
    // 按优先级排序
    this.hooks.get(name)!.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * 触发钩子
   */
  async triggerHook(name: string, ...args: any[]): Promise<any[]> {
    const hookCallbacks = this.hooks.get(name) || [];
    const results: any[] = [];

    for (const hook of hookCallbacks) {
      try {
        const result = await hook.callback(...args);
        results.push(result);
      } catch (error: any) {
        errorService.handleError(error, {
          context: `hook:${name}`,
          showNotification: false,
          reportError: true,
        });
      }
    }

    return results;
  }

  /**
   * 加载所有插件
   */
  async loadAllPlugins(): Promise<void> {
    // 这里可以加载所有插件
    console.log('[PluginManager] Loading all plugins');
  }

  /**
   * 卸载所有插件
   */
  async unloadAllPlugins(): Promise<void> {
    for (const plugin of this.getPlugins()) {
      try {
        await this.unloadPlugin(plugin.metadata.id);
      } catch (error) {
        errorService.handleError(error, {
          context: 'plugin:unloadAll',
          showNotification: false,
          reportError: true,
        });
      }
    }
  }

  /**
   * 获取插件配置
   */
  getPluginConfig(id: string): PluginConfig {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }
    return plugin.config;
  }

  /**
   * 更新插件配置
   */
  async updatePluginConfig(id: string, config: PluginConfig): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      plugin.config = { ...plugin.config, ...config };
      await plugin.onConfigChange(plugin.config);
      this.emit('plugin:configChanged', plugin);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `plugin:${id}:config`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 获取插件依赖
   */
  getPluginDependencies(id: string): string[] {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return [];
    }
    return plugin.metadata.dependencies || [];
  }

  /**
   * 获取插件冲突
   */
  getPluginConflicts(id: string): string[] {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return [];
    }
    return plugin.metadata.conflicts || [];
  }

  /**
   * 移除插件的钩子
   */
  private removePluginHooks(pluginId: string): void {
    // 这里应该移除插件注册的钩子
    console.log(`[PluginManager] Removing hooks for plugin ${pluginId}`);
  }

  /**
   * 创建模拟插件
   */
  private createMockPlugin(id: string): Plugin {
    return {
      metadata: {
        id,
        name: `Mock Plugin ${id}`,
        version: '1.0.0',
        description: 'A mock plugin',
        author: 'OpenChat Team',
        homepage: 'https://openchat.com',
        dependencies: [],
        conflicts: [],
        category: 'general',
        permissions: [],
      },
      status: 'loaded',
      config: {},
      api: {},
      hooks: [],

      async initialize(context) {
        this.context = context;
        console.log(`[Plugin ${id}] Initialized`);
      },

      async activate() {
        console.log(`[Plugin ${id}] Activated`);
      },

      async deactivate() {
        console.log(`[Plugin ${id}] Deactivated`);
      },

      async uninstall() {
        console.log(`[Plugin ${id}] Uninstalled`);
      },

      async onConfigChange(config) {
        console.log(`[Plugin ${id}] Config changed:`, config);
      },

      registerHook(hook) {
        this.hooks.push(hook);
      },

      getApi() {
        return this.api;
      },

      getStatus() {
        return this.status;
      },

      setError(error) {
        this.error = error;
      },

      clearError() {
        this.error = undefined;
      },
    };
  }

  /**
   * 获取插件错误
   */
  getPluginErrors(): PluginError[] {
    return this.pluginErrors;
  }

  /**
   * 清除插件错误
   */
  clearPluginErrors(): void {
    this.pluginErrors = [];
  }

  /**
   * 启动插件热插拔监控
   */
  private startHotPlugMonitoring(): void {
    console.log('[PluginManager] Starting hot plug monitoring');
    // 这里可以实现插件目录的监控，如使用 chokidar 等库
    // 暂时使用定时扫描的方式
    this.schedulePluginScan();
  }

  /**
   * 定时扫描插件目录
   */
  private schedulePluginScan(): void {
    setInterval(async () => {
      await this.scanForNewPlugins();
    }, 5000); // 每5秒扫描一次
  }

  /**
   * 扫描新插件
   */
  private async scanForNewPlugins(): Promise<void> {
    console.log('[PluginManager] Scanning for new plugins');
    // 这里可以实现插件目录的扫描
    // 暂时模拟扫描
  }

  /**
   * 热加载插件
   */
  async hotLoadPlugin(id: string, pluginPath: string): Promise<Plugin> {
    try {
      console.log(`[PluginManager] Hot loading plugin ${id} from ${pluginPath}`);
      
      // 检查插件是否已加载
      if (this.plugins.has(id)) {
        // 先卸载旧插件
        await this.hotUnloadPlugin(id);
      }

      // 加载新插件
      const plugin = await this.loadPlugin(id);
      
      // 激活插件
      await this.activatePlugin(id);
      
      this.emit('plugin:hotLoaded', plugin);
      console.log(`[PluginManager] Hot loaded plugin ${id}`);
      
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to hot load plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:hotLoad:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 热卸载插件
   */
  async hotUnloadPlugin(id: string): Promise<void> {
    try {
      console.log(`[PluginManager] Hot unloading plugin ${id}`);
      
      // 检查插件是否已加载
      if (!this.plugins.has(id)) {
        console.warn(`[PluginManager] Plugin ${id} not found for hot unload`);
        return;
      }

      // 卸载插件
      await this.unloadPlugin(id);
      
      this.emit('plugin:hotUnloaded', id);
      console.log(`[PluginManager] Hot unloaded plugin ${id}`);
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to hot unload plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:hotUnload:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 热更新插件
   */
  async hotUpdatePlugin(id: string, pluginPath: string): Promise<Plugin> {
    try {
      console.log(`[PluginManager] Hot updating plugin ${id}`);
      
      // 热加载插件（会自动卸载旧插件）
      const plugin = await this.hotLoadPlugin(id, pluginPath);
      
      this.emit('plugin:hotUpdated', plugin);
      console.log(`[PluginManager] Hot updated plugin ${id}`);
      
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to hot update plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:hotUpdate:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 从远程URL加载插件
   */
  async loadPluginFromUrl(id: string, url: string): Promise<Plugin> {
    try {
      console.log(`[PluginManager] Loading plugin ${id} from URL ${url}`);
      
      // 下载插件
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download plugin: ${response.statusText}`);
      }
      
      // 解析插件
      const pluginCode = await response.text();
      
      // 这里可以实现插件的动态加载
      // 暂时返回模拟插件
      const plugin = this.createMockPlugin(id);
      this.plugins.set(id, plugin);
      
      // 初始化插件
      await plugin.initialize({
        app: {},
        services: {},
        config: plugin.config,
        logger: {
          info: (message: string) => console.log(`[Plugin ${id}] ${message}`),
          warn: (message: string) => console.warn(`[Plugin ${id}] ${message}`),
          error: (message: string) => console.error(`[Plugin ${id}] ${message}`),
          debug: (message: string) => console.debug(`[Plugin ${id}] ${message}`),
        },
      });
      
      plugin.status = 'loaded';
      this.emit('plugin:loadedFromUrl', plugin);
      console.log(`[PluginManager] Loaded plugin ${id} from URL`);
      
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to load plugin from URL',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:loadFromUrl:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 获取插件管理器状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      pluginCount: this.plugins.size,
      activePlugins: this.getPluginsByStatus('activated').length,
      loadedPlugins: this.getPluginsByStatus('loaded').length,
      errorPlugins: this.getPluginsByStatus('error').length,
      hookCount: Array.from(this.hooks.values()).reduce((sum, hooks) => sum + hooks.length, 0),
    };
  }
}

export const pluginManager = PluginManager.getInstance();

export default PluginManager;