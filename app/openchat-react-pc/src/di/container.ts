/**
 * 依赖注入容器实现
 */

import { Container, Token, Factory, ServiceMetadata, Module } from './types';

export class DIContainer implements Container {
  private services = new Map<any, ServiceMetadata>();

  register<T>(token: Token<T>, factory: Factory<T>): void {
    this.services.set(token, {
      token,
      factory,
      isSingleton: false,
    });
  }

  registerSingleton<T>(token: Token<T>, factory: Factory<T>): void {
    this.services.set(token, {
      token,
      factory,
      isSingleton: true,
    });
  }

  resolve<T>(token: Token<T>): T {
    const service = this.services.get(token);
    
    if (!service) {
      throw new Error(`Service not registered: ${String(token)}`);
    }

    if (service.isSingleton) {
      if (!service.instance) {
        service.instance = service.factory(this);
      }
      return service.instance as T;
    }

    return service.factory(this) as T;
  }

  has<T>(token: Token<T>): boolean {
    return this.services.has(token);
  }

  unregister<T>(token: Token<T>): void {
    this.services.delete(token);
  }

  clear(): void {
    this.services.clear();
  }

  /**
   * 注册模块
   */
  registerModule(module: Module): void {
    module.configure(this);
  }

  /**
   * 注册多个模块
   */
  registerModules(modules: Module[]): void {
    modules.forEach(module => this.registerModule(module));
  }

  /**
   * 获取所有注册的服务
   */
  getRegisteredServices(): Array<{ token: any; isSingleton: boolean }> {
    return Array.from(this.services.entries()).map(([token, metadata]) => ({
      token,
      isSingleton: metadata.isSingleton,
    }));
  }
}

// 创建全局容器实例
const container = new DIContainer();

export default container;
