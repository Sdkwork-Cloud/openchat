/**
 * 应用主入口
 * 
 * 职责：初始化应用，加载全局配置
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { container, CoreModule } from './di';
import './index.css';

// 导入国际化配置（必须在 App 渲染前加载）
import './i18n';

// 初始化依赖注入容器
const coreModule = new CoreModule();
container.registerModule(coreModule);

// 初始化所有服务
const services = [
  'errorService',
  'securityService',
  'fileService',
  'memoryService',
  'pluginManager',
  'websocketClient',
  'cacheService',
  'algorithmService',
  'performanceService',
  'featureService',
  'toolchainService'
];

services.forEach(serviceName => {
  const service = container.resolve(serviceName);
  if (service && typeof service.initialize === 'function') {
    service.initialize();
  }
});

// 配置内存服务
const memoryService = container.resolve('memoryService');
memoryService.initialize({
  cacheSizeLimit: 1000,
  cacheByteLimit: 50 * 1024 * 1024, // 50MB
  memoryThreshold: 80,
  gcInterval: 60 * 1000, // 1分钟
  leakDetectionInterval: 5 * 60 * 1000, // 5分钟
});

// 监听内存警告
memoryService.on('memoryWarning', (stats) => {
  console.warn('[App] Memory warning:', stats);
});

// 监听内存泄漏检测
memoryService.on('memoryLeakDetected', (stats) => {
  console.error('[App] Memory leak detected:', stats);
  // 可以在这里添加告警逻辑，如发送到监控系统
});

// 配置性能服务
const performanceService = container.resolve('performanceService');

// 监听性能阈值超出事件
performanceService.onPerformanceThresholdExceeded((metrics) => {
  console.warn('[Performance] 性能阈值超出:', metrics);
  // 可以在这里添加告警逻辑，如发送到监控系统
});

// 定期执行性能分析
setInterval(() => {
  const analysis = performanceService.analyzePerformance();
  if (analysis.insights.length > 0) {
    console.log('[Performance] 性能分析:', analysis);
  }
}, 60 * 1000); // 每分钟分析一次

// 配置功能开关服务
const featureService = container.resolve('featureService');

// 监听功能开关变化事件
featureService.onFeatureChanged((feature) => {
  console.log('[Feature] 功能开关变化:', feature);
});

// 检查默认功能开关状态
const defaultFeatures = featureService.getAllFeatures();
console.log('[Feature] 默认功能开关状态:', defaultFeatures);

// 执行安全扫描
const securityService = container.resolve('securityService');
securityService.scanSecurityVulnerabilities().then(result => {
  console.log('[Security] 安全扫描完成:', result.summary);
  if (result.vulnerabilities.length > 0) {
    console.log('[Security] 发现安全问题:', result.vulnerabilities);
  }
});

// 初始化插件管理器并测试热插拔功能
const pluginManager = container.resolve('pluginManager');
// 注册插件加载事件
pluginManager.on('plugin:loaded', (plugin) => {
  console.log('[Plugin] 插件加载成功:', plugin.metadata.name);
});
pluginManager.on('plugin:activated', (plugin) => {
  console.log('[Plugin] 插件激活成功:', plugin.metadata.name);
});
pluginManager.on('plugin:hotLoaded', (plugin) => {
  console.log('[Plugin] 插件热加载成功:', plugin.metadata.name);
});
pluginManager.on('plugin:hotUnloaded', (pluginId) => {
  console.log('[Plugin] 插件热卸载成功:', pluginId);
});
pluginManager.on('plugin:hotUpdated', (plugin) => {
  console.log('[Plugin] 插件热更新成功:', plugin.metadata.name);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
