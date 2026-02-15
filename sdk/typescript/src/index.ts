/**
 * OpenChat TypeScript SDK
 * 
 * 高内聚低耦合的即时通讯SDK
 * 
 * 核心特性：
 * - 基于悟空IM EasySDK实现实时通讯
 * - 支持浏览器、Node.js、小程序等多平台
 * - 完整的即时通讯基础能力（消息、会话、好友、群组）
 * - 支持AI时代MediaResource标准
 * - 支持多RTC Provider（火山引擎、Agora等）
 * - 类型安全的API设计
 * - 无UI框架耦合
 * 
 * 架构设计：
 * - Core层：基础服务、重试策略、工具函数
 * - 服务层：IM服务、RTC服务、API服务
 * - 客户端层：统一API入口
 * 
 * @example
 * ```typescript
 * import { createOpenChatClient, ResourceBuilder } from '@openchat/typescript-sdk';
 * 
 * const client = createOpenChatClient({
 *   apiBaseUrl: 'https://api.openchat.com',    // OpenChat REST API地址
 *   imWsUrl: 'wss://im.openchat.com/ws',       // 悟空IM WebSocket地址
 *   uid: 'user-uid',
 *   token: 'user-token',
 * });
 * 
 * await client.init();
 * 
 * // 发送消息
 * await client.im.sendText({
 *   toUserId: 'user-123',
 *   text: 'Hello, World!'
 * });
 * ```
 * 
 * @module @openchat/typescript-sdk
 * @version 1.0.0
 * @license MIT
 */

// ==================== 版本信息 ====================
export const VERSION = '1.0.0';

// ==================== 核心架构 ====================
export * from './core';

// ==================== 类型定义 ====================
export * from './types';

// ==================== 核心客户端 ====================
export { 
  OpenChatClient, 
  createOpenChatClient 
} from './openchat-client';

// ==================== 服务层 ====================
export * from './services';

// ==================== RTC模块 ====================
export * from './rtc';

// ==================== 工具函数 ====================
export {
  detectPlatform,
  isBrowser,
  isNode,
  isMiniProgram,
  isWeChat,
  isAlipay,
  isBaidu,
  isByteDance,
  Platform
} from './utils/platform-detector';

export {
  createHttpClient
} from './utils/http-client';

export type {
  HttpRequestConfig,
  HttpResponse,
  HttpClient
} from './utils/http-client';

// ==================== 默认导出 ====================
import { OpenChatClient } from './openchat-client';
export default OpenChatClient;

// ==================== 类型导出（用于TypeScript）====================
export type { 
  OpenChatClient as OpenChatClientType 
} from './openchat-client';
