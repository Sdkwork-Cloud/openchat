/**
 * 依赖注入系统类型定义
 */

export interface Container {
  register<T>(token: Token<T>, factory: Factory<T>): void;
  registerSingleton<T>(token: Token<T>, factory: Factory<T>): void;
  resolve<T>(token: Token<T>): T;
  has<T>(token: Token<T>): boolean;
  unregister<T>(token: Token<T>): void;
  clear(): void;
}

export type Token<T> = string | symbol | (new (...args: any[]) => T);

export type Factory<T> = (container: Container) => T;

export interface ServiceMetadata {
  token: Token<any>;
  factory: Factory<any>;
  isSingleton: boolean;
  instance?: any;
}

export interface Module {
  configure(container: Container): void;
}
