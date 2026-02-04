/**
 * 依赖注入系统
 */

export { default as container } from './container';
export { DIContainer } from './container';
export type { Container, Token, Factory, Module } from './types';
export { CoreModule } from './modules/core.module';

// 便捷函数
export function inject<T>(token: Token<T>): T {
  return container.resolve(token);
}

export function register<T>(token: Token<T>, factory: Factory<T>): void {
  container.register(token, factory);
}

export function registerSingleton<T>(token: Token<T>, factory: Factory<T>): void {
  container.registerSingleton(token, factory);
}
