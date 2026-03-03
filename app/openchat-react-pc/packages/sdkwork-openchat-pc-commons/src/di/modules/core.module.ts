/**
 * 核心服务模块
 */

import { Module } from '../types';
import {
  errorService,
  securityService,
  fileService,
  memoryService,
  websocketClient,
  cacheService,
  algorithmService,
  performanceService,
  featureService,
  toolchainService,
} from '../../services';
import { pluginManager } from '../../plugins/plugin-manager';

export class CoreModule implements Module {
  configure(container: any): void {
    // 注册核心服务
    container.registerSingleton('errorService', () => errorService);
    container.registerSingleton('securityService', () => securityService);
    container.registerSingleton('fileService', () => fileService);
    container.registerSingleton('memoryService', () => memoryService);
    container.registerSingleton('pluginManager', () => pluginManager);
    container.registerSingleton('websocketClient', () => websocketClient);
    container.registerSingleton('cacheService', () => cacheService);
    container.registerSingleton('algorithmService', () => algorithmService);
    container.registerSingleton('performanceService', () => performanceService);
    container.registerSingleton('featureService', () => featureService);
    container.registerSingleton('toolchainService', () => toolchainService);

    // 注册服务类型
    container.registerSingleton('ErrorService', () => errorService);
    container.registerSingleton('SecurityService', () => securityService);
    container.registerSingleton('FileService', () => fileService);
    container.registerSingleton('MemoryService', () => memoryService);
    container.registerSingleton('PluginManager', () => pluginManager);
    container.registerSingleton('WebSocketClient', () => websocketClient);
    container.registerSingleton('CacheService', () => cacheService);
    container.registerSingleton('AlgorithmService', () => algorithmService);
    container.registerSingleton('PerformanceService', () => performanceService);
    container.registerSingleton('FeatureService', () => featureService);
    container.registerSingleton('ToolchainService', () => toolchainService);
  }
}
