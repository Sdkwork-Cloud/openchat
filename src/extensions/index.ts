/**
 * 扩展插件体系 - 入口文件
 *
 * 导出所有扩展相关的接口、类和服务
 */

// 核心接口和类型
export * from './core/extension.interface';

// 核心服务
export { ExtensionRegistry } from './core/extension-registry.service';
export { ExtensionConfigValidator } from './core/extension-config.validator';
export { ExtensionLifecycleManager, LifecycleOperation, LifecycleResult } from './core/extension-lifecycle.manager';
export { ExtensionHealthService } from './core/extension-health.service';

// 用户中心插件
export * from './user-center/user-center.interface';
export { DefaultUserCenterExtension } from './user-center/default-user-center.extension';
export { RemoteUserCenterExtension } from './user-center/remote-user-center.extension';
export { UserCenterProxy, UserCenterStatus } from './user-center/user-center.proxy';

// 扩展模块
export { ExtensionsModule, ExtensionsModuleOptions } from './extensions.module';
