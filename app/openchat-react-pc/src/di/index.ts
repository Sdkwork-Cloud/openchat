/**
 * 依赖注入系统
 */

import container from './container';
import type { Token, Factory } from './types';

export { container };
export { DIContainer } from './container';
export type { Container, Token, Factory, Module } from './types';
export { CoreModule } from './modules/core.module';

export function inject<T>(token: Token<T>): T {
  return container.resolve(token);
}

export function register<T>(token: Token<T>, factory: Factory<T>): void {
  container.register(token, factory);
}

export function registerSingleton<T>(token: Token<T>, factory: Factory<T>): void {
  container.registerSingleton(token, factory);
}
