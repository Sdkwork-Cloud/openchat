/**
 * 核心服务模块
 */

import { Module } from '../types';
import { errorService } from '../../services/error.service';
import { securityService } from '../../services/security.service';
import { fileService } from '../../services/file.service';
import { memoryService } from '../../services/memory.service';
import { pluginManager } from '../../plugins/plugin-manager';
import { websocketClient } from '../../services/websocket.client';
import { cacheService } from '../../services/cache.service';
import { algorithmService } from '../../services/algorithm.service';
import { performanceService } from '../../services/performance.service';
import { featureService } from '../../services/feature.service';
import { toolchainService } from '../../services/toolchain.service';

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
