/**
 * 插件系统类型定义
 *
 * 定义插件的基本结构、生命周期方法和扩展点
 */

export type PluginStatus = 'loaded' | 'activated' | 'deactivated' | 'error';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  dependencies?: string[];
  conflicts?: string[];
  category?: string;
  permissions?: string[];
  [key: string]: any;
}

export interface PluginContext {
  app: any;
  services: {
    [key: string]: any;
  };
  config: PluginConfig;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };
}

export interface PluginConfig {
  [key: string]: any;
}

export interface PluginApi {
  [key: string]: any;
}

export interface PluginHook {
  name: string;
  callback: (...args: any[]) => any;
  priority?: number;
}

export interface Plugin {
  metadata: PluginMetadata;
  status: PluginStatus;
  context?: PluginContext;
  config: PluginConfig;
  api: PluginApi;
  hooks: PluginHook[];
  error?: string;

  /**
   * 初始化插件
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * 激活插件
   */
  activate(): Promise<void>;

  /**
   * 停用插件
   */
  deactivate(): Promise<void>;

  /**
   * 卸载插件
   */
  uninstall(): Promise<void>;

  /**
   * 处理配置变更
   */
  onConfigChange(config: PluginConfig): Promise<void>;

  /**
   * 注册钩子
   */
  registerHook(hook: PluginHook): void;

  /**
   * 获取 API
   */
  getApi(): PluginApi;

  /**
   * 获取当前状态
   */
  getStatus(): PluginStatus;

  /**
   * 设置错误
   */
  setError(error: string): void;

  /**
   * 清除错误
   */
  clearError(): void;
}

export interface PluginLoader {
  load(pluginPath: string): Promise<Plugin | null>;
  unload(plugin: Plugin): Promise<void>;
}

export interface PluginManager {
  loadPlugin(id: string): Promise<Plugin>;
  unloadPlugin(id: string): Promise<void>;
  activatePlugin(id: string): Promise<void>;
  deactivatePlugin(id: string): Promise<void>;
  getPlugin(id: string): Plugin | null;
  getPlugins(): Plugin[];
  getPluginsByStatus(status: PluginStatus): Plugin[];
  getPluginsByCategory(category: string): Plugin[];
  registerHook(name: string, callback: (...args: any[]) => any, priority?: number): void;
  triggerHook(name: string, ...args: any[]): Promise<any[]>;
  loadAllPlugins(): Promise<void>;
  unloadAllPlugins(): Promise<void>;
  getPluginConfig(id: string): PluginConfig;
  updatePluginConfig(id: string, config: PluginConfig): Promise<void>;
  getPluginDependencies(id: string): string[];
  getPluginConflicts(id: string): string[];
  hotLoadPlugin(id: string, pluginPath: string): Promise<Plugin>;
  hotUnloadPlugin(id: string): Promise<void>;
  hotUpdatePlugin(id: string, pluginPath: string): Promise<Plugin>;
  loadPluginFromUrl(id: string, url: string): Promise<Plugin>;
}

export interface PluginManifest {
  plugin: PluginMetadata;
  entry: string;
  configSchema?: {
    [key: string]: {
      type: string;
      default?: any;
      description?: string;
      required?: boolean;
    };
  };
  hooks?: string[];
  api?: string[];
}

export interface PluginRegistry {
  [pluginId: string]: {
    manifest: PluginManifest;
    path: string;
    status: PluginStatus;
  };
}

export type HookType = 
  | 'app:init'
  | 'app:ready'
  | 'app:shutdown'
  | 'auth:login'
  | 'auth:logout'
  | 'chat:message:send'
  | 'chat:message:receive'
  | 'chat:message:render'
  | 'chat:conversation:create'
  | 'chat:conversation:update'
  | 'contact:add'
  | 'contact:remove'
  | 'rtc:call:start'
  | 'rtc:call:end'
  | 'ui:render'
  | 'ui:theme:change'
  | 'settings:change'
  | 'plugin:load'
  | 'plugin:unload'
  | 'plugin:activate'
  | 'plugin:deactivate';

export interface PluginError {
  pluginId: string;
  error: string;
  stack?: string;
  timestamp: number;
}
