export * from './core/extension.interface';
export { ExtensionRegistry } from './core/extension-registry.service';
export { ExtensionConfigValidator } from './core/extension-config.validator';
export {
  ExtensionLifecycleManager,
  LifecycleOperation,
  LifecycleResult,
} from './core/extension-lifecycle.manager';
export { ExtensionHealthService } from './core/extension-health.service';
export * from './user-center/user-center.interface';
export { DefaultUserCenterExtension } from './user-center/default-user-center.extension';
export { RemoteUserCenterExtension } from './user-center/remote-user-center.extension';
export { UserCenterProxy, UserCenterStatus } from './user-center/user-center.proxy';
export { ExtensionsModule, ExtensionsModuleOptions } from './extensions.module';
export { EXTENSIONS_OPTIONS } from './extensions.options';
