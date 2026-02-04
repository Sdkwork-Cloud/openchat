/**
 * 微前端加载器实现
 * 
 * 负责微前端的加载、挂载、卸载和更新操作
 */

import { MicroFrontend, MicroFrontendConfig, MicroFrontendStatus, MicroFrontendLoader, MicroFrontendLifecycleEvent } from './types';
import { microFrontendChannel } from './channel';
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

export class DefaultMicroFrontend implements MicroFrontend {
  name: string;
  config: MicroFrontendConfig;
  status: MicroFrontendStatus;
  instance?: any;
  manifest?: any;
  error?: string;
  mountProps?: Record<string, any>;
  private scriptElements: HTMLScriptElement[] = [];
  private styleElements: HTMLLinkElement[] = [];

  constructor(config: MicroFrontendConfig) {
    this.name = config.name;
    this.config = config;
    this.status = 'not_loaded';
  }

  /**
   * 加载微前端
   */
  async load(): Promise<void> {
    if (this.status === 'loading' || this.status === 'loaded') {
      return;
    }

    this.status = 'loading';

    try {
      console.log(`[MicroFrontend] 加载微前端: ${this.name} 从 ${this.config.entry}`);

      // 加载HTML入口
      if (this.config.entry.endsWith('.html')) {
        await this.loadHtmlEntry();
      }
      // 加载JS入口
      else if (this.config.entry.endsWith('.js')) {
        await this.loadJsEntry();
      }
      // 加载其他类型的入口
      else {
        await this.loadGenericEntry();
      }

      this.status = 'loaded';
      console.log(`[MicroFrontend] 微前端加载成功: ${this.name}`);
    } catch (error: any) {
      this.status = 'error';
      this.error = error.message || '加载微前端失败';
      console.error(`[MicroFrontend] 加载微前端失败: ${this.name}`, error);
      throw error;
    }
  }

  /**
   * 加载HTML入口
   */
  private async loadHtmlEntry(): Promise<void> {
    const response = await fetch(this.config.entry);
    if (!response.ok) {
      throw new Error(`加载微前端失败: ${response.statusText}`);
    }

    const html = await response.text();
    const container = this.getContainer();
    container.innerHTML = html;

    // 加载脚本和样式
    await this.loadScriptsAndStyles(container);
  }

  /**
   * 加载JS入口
   */
  private async loadJsEntry(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.config.entry;
      script.type = 'module';
      script.onload = () => {
        this.scriptElements.push(script);
        resolve();
      };
      script.onerror = () => {
        reject(new Error(`加载微前端脚本失败: ${this.config.entry}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * 加载通用入口
   */
  private async loadGenericEntry(): Promise<void> {
    // 这里可以实现其他类型入口的加载逻辑
    throw new Error(`不支持的入口类型: ${this.config.entry}`);
  }

  /**
   * 加载脚本和样式
   */
  private async loadScriptsAndStyles(container: HTMLElement): Promise<void> {
    const scripts = container.querySelectorAll('script');
    const styles = container.querySelectorAll('link[rel="stylesheet"]');

    // 加载脚本
    for (const script of scripts) {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
        await new Promise((resolve, reject) => {
          newScript.onload = resolve;
          newScript.onerror = reject;
          document.head.appendChild(newScript);
        });
        this.scriptElements.push(newScript);
      } else {
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
        this.scriptElements.push(newScript);
      }
    }

    // 加载样式
    for (const style of styles) {
      const newStyle = document.createElement('link');
      newStyle.rel = 'stylesheet';
      newStyle.href = style.href;
      await new Promise((resolve, reject) => {
        newStyle.onload = resolve;
        newStyle.onerror = reject;
        document.head.appendChild(newStyle);
      });
      this.styleElements.push(newStyle);
    }
  }

  /**
   * 挂载微前端
   */
  async mount(props?: Record<string, any>): Promise<void> {
    if (this.status === 'mounted') {
      return;
    }

    if (this.status !== 'loaded') {
      await this.load();
    }

    try {
      console.log(`[MicroFrontend] 挂载微前端: ${this.name}`);

      this.mountProps = {
        ...this.config.props,
        ...props,
        channel: microFrontendChannel,
      };

      // 调用微前端的 mount 方法
      if (window[this.name] && typeof window[this.name].mount === 'function') {
        await window[this.name].mount(this.getContainer(), this.mountProps);
      }

      this.status = 'mounted';
      console.log(`[MicroFrontend] 微前端挂载成功: ${this.name}`);
    } catch (error: any) {
      this.status = 'error';
      this.error = error.message || '挂载微前端失败';
      console.error(`[MicroFrontend] 挂载微前端失败: ${this.name}`, error);
      throw error;
    }
  }

  /**
   * 卸载微前端
   */
  async unmount(): Promise<void> {
    if (this.status !== 'mounted') {
      return;
    }

    try {
      console.log(`[MicroFrontend] 卸载微前端: ${this.name}`);

      // 调用微前端的 unmount 方法
      if (window[this.name] && typeof window[this.name].unmount === 'function') {
        await window[this.name].unmount(this.getContainer());
      }

      // 清理脚本和样式
      this.cleanupResources();

      this.status = 'unmounted';
      console.log(`[MicroFrontend] 微前端卸载成功: ${this.name}`);
    } catch (error: any) {
      this.status = 'error';
      this.error = error.message || '卸载微前端失败';
      console.error(`[MicroFrontend] 卸载微前端失败: ${this.name}`, error);
      throw error;
    }
  }

  /**
   * 更新微前端
   */
  async update(props?: Record<string, any>): Promise<void> {
    if (this.status !== 'mounted') {
      return;
    }

    try {
      console.log(`[MicroFrontend] 更新微前端: ${this.name}`);

      this.mountProps = {
        ...this.mountProps,
        ...props,
      };

      // 调用微前端的 update 方法
      if (window[this.name] && typeof window[this.name].update === 'function') {
        await window[this.name].update(this.mountProps);
      }

      console.log(`[MicroFrontend] 微前端更新成功: ${this.name}`);
    } catch (error: any) {
      this.status = 'error';
      this.error = error.message || '更新微前端失败';
      console.error(`[MicroFrontend] 更新微前端失败: ${this.name}`, error);
      throw error;
    }
  }

  /**
   * 获取状态
   */
  getStatus(): MicroFrontendStatus {
    return this.status;
  }

  /**
   * 设置错误
   */
  setError(error: string): void {
    this.error = error;
    this.status = 'error';
  }

  /**
   * 清除错误
   */
  clearError(): void {
    this.error = undefined;
  }

  /**
   * 获取容器
   */
  private getContainer(): HTMLElement {
    if (typeof this.config.container === 'string') {
      const container = document.querySelector(this.config.container);
      if (!container) {
        throw new Error(`找不到微前端容器: ${this.config.container}`);
      }
      return container as HTMLElement;
    }
    return this.config.container;
  }

  /**
   * 清理资源
   */
  private cleanupResources(): void {
    // 清理脚本
    this.scriptElements.forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
    this.scriptElements = [];

    // 清理样式
    this.styleElements.forEach(style => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    });
    this.styleElements = [];

    // 清理全局变量
    if (window[this.name]) {
      delete window[this.name];
    }
  }
}

export class DefaultMicroFrontendLoader extends EventEmitter implements MicroFrontendLoader {
  private microFrontends: Map<string, MicroFrontend> = new Map();

  /**
   * 加载微前端
   */
  async load(config: MicroFrontendConfig): Promise<MicroFrontend> {
    try {
      // 检查是否已经加载
      if (this.microFrontends.has(config.name)) {
        return this.microFrontends.get(config.name)!;
      }

      // 创建微前端实例
      const microFrontend = new DefaultMicroFrontend(config);
      this.microFrontends.set(config.name, microFrontend);

      // 触发加载前事件
      this.emit('beforeLoad', {
        name: 'beforeLoad',
        microFrontend,
        timestamp: Date.now(),
      } as MicroFrontendLifecycleEvent);

      // 加载微前端
      await microFrontend.load();

      // 触发加载后事件
      this.emit('afterLoad', {
        name: 'afterLoad',
        microFrontend,
        timestamp: Date.now(),
      } as MicroFrontendLifecycleEvent);

      return microFrontend;
    } catch (error: any) {
      errorService.handleError(error, {
        context: `microfrontend:load:${config.name}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 获取微前端
   */
  get(name: string): MicroFrontend | undefined {
    return this.microFrontends.get(name);
  }

  /**
   * 获取所有微前端
   */
  getAll(): MicroFrontend[] {
    return Array.from(this.microFrontends.values());
  }

  /**
   * 移除微前端
   */
  async remove(name: string): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      return;
    }

    try {
      // 卸载微前端
      await microFrontend.unmount();

      // 从映射中移除
      this.microFrontends.delete(name);

      console.log(`[MicroFrontendLoader] 移除微前端: ${name}`);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `microfrontend:remove:${name}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 清除所有微前端
   */
  async clear(): Promise<void> {
    for (const [name, microFrontend] of this.microFrontends) {
      try {
        await microFrontend.unmount();
      } catch (error) {
        errorService.handleError(error, {
          context: `microfrontend:clear:${name}`,
          showNotification: false,
          reportError: true,
        });
      }
    }

    this.microFrontends.clear();
    console.log('[MicroFrontendLoader] 清除所有微前端');
  }

  /**
   * 挂载微前端
   */
  async mount(name: string, props?: Record<string, any>): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      throw new Error(`微前端未加载: ${name}`);
    }

    // 触发挂载前事件
    this.emit('beforeMount', {
      name: 'beforeMount',
      microFrontend,
      timestamp: Date.now(),
    } as MicroFrontendLifecycleEvent);

    await microFrontend.mount(props);

    // 触发挂载后事件
    this.emit('afterMount', {
      name: 'afterMount',
      microFrontend,
      timestamp: Date.now(),
    } as MicroFrontendLifecycleEvent);
  }

  /**
   * 卸载微前端
   */
  async unmount(name: string): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      return;
    }

    // 触发卸载前事件
    this.emit('beforeUnmount', {
      name: 'beforeUnmount',
      microFrontend,
      timestamp: Date.now(),
    } as MicroFrontendLifecycleEvent);

    await microFrontend.unmount();

    // 触发卸载后事件
    this.emit('afterUnmount', {
      name: 'afterUnmount',
      microFrontend,
      timestamp: Date.now(),
    } as MicroFrontendLifecycleEvent);
  }

  /**
   * 更新微前端
   */
  async update(name: string, props?: Record<string, any>): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      throw new Error(`微前端未加载: ${name}`);
    }

    // 触发更新前事件
    this.emit('beforeUpdate', {
      name: 'beforeUpdate',
      microFrontend,
      timestamp: Date.now(),
    } as MicroFrontendLifecycleEvent);

    await microFrontend.update(props);

    // 触发更新后事件
    this.emit('afterUpdate', {
      name: 'afterUpdate',
      microFrontend,
      timestamp: Date.now(),
    } as MicroFrontendLifecycleEvent);
  }
}

// 导出单例
export const microFrontendLoader = new DefaultMicroFrontendLoader();

export default DefaultMicroFrontendLoader;
