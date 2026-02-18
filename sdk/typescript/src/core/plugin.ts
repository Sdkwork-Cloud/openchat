/**
 * 插件系统
 * 让SDK具有可扩展性
 */

import { EventEmitter } from 'eventemitter3';

export interface PluginContext {
  client: any;
  config: any;
  logger: any;
}

export interface Plugin {
  name: string;
  version: string;
  
  install?: (context: PluginContext) => void | Promise<void>;
  uninstall?: () => void | Promise<void>;
  
  onConnect?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  onMessage?: (message: any) => any | Promise<any>;
  onError?: (error: any) => void;
}

export interface PluginManagerOptions {
  plugins?: Plugin[];
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private context: PluginContext;
  private installed: boolean = false;

  constructor(context: PluginContext, options?: PluginManagerOptions) {
    super();
    this.context = context;
    
    if (options?.plugins) {
      options.plugins.forEach(plugin => this.register(plugin));
    }
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    this.context.logger?.debug(`Plugin registered: ${plugin.name}@${plugin.version}`);
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    if (plugin.uninstall) {
      plugin.uninstall();
    }

    this.plugins.delete(name);
    this.context.logger?.debug(`Plugin unregistered: ${name}`);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  async installAll(): Promise<void> {
    if (this.installed) {
      return;
    }

    for (const plugin of this.plugins.values()) {
      if (plugin.install) {
        await plugin.install(this.context);
        this.context.logger?.info(`Plugin installed: ${plugin.name}`);
      }
    }

    this.installed = true;
  }

  async uninstallAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.uninstall) {
        await plugin.uninstall();
        this.context.logger?.info(`Plugin uninstalled: ${plugin.name}`);
      }
    }

    this.plugins.clear();
    this.installed = false;
  }

  async onConnect(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onConnect) {
        try {
          await plugin.onConnect();
        } catch (error) {
          this.context.logger?.error(`Plugin ${plugin.name} onConnect failed:`, error);
        }
      }
    }
  }

  async onDisconnect(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onDisconnect) {
        try {
          await plugin.onDisconnect();
        } catch (error) {
          this.context.logger?.error(`Plugin ${plugin.name} onDisconnect failed:`, error);
        }
      }
    }
  }

  async onMessage(message: any): Promise<any> {
    let result = message;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.onMessage) {
        try {
          result = await plugin.onMessage(result) ?? result;
        } catch (error) {
          this.context.logger?.error(`Plugin ${plugin.name} onMessage failed:`, error);
        }
      }
    }
    
    return result;
  }

  onError(error: any): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onError) {
        try {
          plugin.onError(error);
        } catch (pluginError) {
          this.context.logger?.error(`Plugin ${plugin.name} onError failed:`, pluginError);
        }
      }
    }
  }
}

export function createPluginManager(context: PluginContext, options?: PluginManagerOptions): PluginManager {
  return new PluginManager(context, options);
}
