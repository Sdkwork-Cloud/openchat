/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 * 所有环境变量必须以 VITE_ 开头才能在客户端使用
 */
interface ImportMetaEnv {
  // ============================================
  // 应用信息
  // ============================================
  /** 应用名称 */
  readonly VITE_APP_NAME: string
  /** 应用版本 */
  readonly VITE_APP_VERSION: string
  /** 是否开启调试模式 */
  readonly VITE_DEBUG: string
  /** 日志级别 */
  readonly VITE_LOG_LEVEL: string

  // ============================================
  // 服务端点配置
  // ============================================
  /** OpenChat Server API 地址 */
  readonly VITE_API_BASE_URL: string
  /** 悟空IM WebSocket 地址 */
  readonly VITE_IM_WS_URL: string

  // ============================================
  // RTC 配置
  // ============================================
  /** RTC App ID */
  readonly VITE_RTC_APP_ID: string
  /** RTC 提供商 */
  readonly VITE_RTC_PROVIDER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
