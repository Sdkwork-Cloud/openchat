/**
 * 环境变量配置
 * 
 * 定义应用运行所需的环境变量
 * 支持多环境：development, test, production
 */

// ============================================
// 应用信息
// ============================================

// 应用名称
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'OpenChat';

// 应用版本
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// ============================================
// 环境判断
// ============================================

// 是否开发环境
export const IS_DEV = import.meta.env.DEV;

// 是否生产环境
export const IS_PROD = import.meta.env.PROD;

// 当前环境模式 (development, test, production)
export const MODE = import.meta.env.MODE;

// ============================================
// 调试配置
// ============================================

// 调试模式
export const DEBUG = import.meta.env.VITE_DEBUG === 'true' || IS_DEV;

// 日志级别 (debug, info, warn, error)
export const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || (IS_DEV ? 'debug' : 'error');

// ============================================
// 服务端点配置
// ============================================

// OpenChat Server API 地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// 悟空IM WebSocket 地址
export const IM_WS_URL = import.meta.env.VITE_IM_WS_URL || 'ws://localhost:5200';

// ============================================
// RTC 配置
// ============================================

export const RTC_CONFIG = {
  appId: import.meta.env.VITE_RTC_APP_ID || '',
  provider: import.meta.env.VITE_RTC_PROVIDER || 'volcengine',
};

// ============================================
// 环境信息输出 (开发环境)
// ============================================

if (IS_DEV || DEBUG) {
  console.log('[Env] ========================================');
  console.log('[Env] APP_NAME:', APP_NAME);
  console.log('[Env] APP_VERSION:', APP_VERSION);
  console.log('[Env] MODE:', MODE);
  console.log('[Env] IS_DEV:', IS_DEV);
  console.log('[Env] IS_PROD:', IS_PROD);
  console.log('[Env] DEBUG:', DEBUG);
  console.log('[Env] LOG_LEVEL:', LOG_LEVEL);
  console.log('[Env] API_BASE_URL:', API_BASE_URL);
  console.log('[Env] IM_WS_URL:', IM_WS_URL);
  console.log('[Env] RTC_PROVIDER:', RTC_CONFIG.provider);
  console.log('[Env] ========================================');
}
