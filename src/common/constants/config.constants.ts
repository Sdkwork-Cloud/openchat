/**
 * 配置相关常量
 * 统一管理配置项的默认值和常量
 */

/**
 * JWT配置
 */
export const JWT_CONFIG = {
  /**
   * 默认JWT密钥（仅用于开发环境）
   */
  DEFAULT_SECRET: 'default-secret-key-change-in-production',

  /**
   * 默认访问令牌过期时间
   */
  DEFAULT_EXPIRES_IN: '1h',

  /**
   * 默认刷新令牌过期时间
   */
  DEFAULT_REFRESH_EXPIRES_IN: '7d',

  /**
   * 默认过期时间（秒）
   */
  DEFAULT_EXPIRY_SECONDS: 3600,

  /**
   * 刷新令牌过期时间（秒）
   */
  REFRESH_EXPIRY_SECONDS: 604800, // 7天
} as const;

/**
 * 密码加密配置
 */
export const PASSWORD_CONFIG = {
  /**
   * bcrypt salt rounds
   */
  SALT_ROUNDS: 10,

  /**
   * 最小长度
   */
  MIN_LENGTH: 6,

  /**
   * 最大长度
   */
  MAX_LENGTH: 100,
} as const;

/**
 * 验证码配置
 */
export const VERIFICATION_CODE_CONFIG = {
  /**
   * 验证码长度
   */
  LENGTH: 6,

  /**
   * 过期时间（秒）
   */
  EXPIRY_SECONDS: 600, // 10分钟

  /**
   * 发送间隔（秒）
   */
  SEND_INTERVAL_SECONDS: 60,
} as const;

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  /**
   * 本地缓存TTL（毫秒）
   */
  LOCAL_TTL_MS: 60000, // 1分钟

  /**
   * Redis缓存TTL（秒）
   */
  REDIS_TTL_SECONDS: 300, // 5分钟

  /**
   * 本地缓存最大条目数
   */
  LOCAL_MAX_SIZE: 10000,
} as const;

/**
 * WebSocket配置
 */
export const WS_CONFIG = {
  /**
   * ping超时时间（毫秒）
   */
  PING_TIMEOUT_MS: 60000,

  /**
   * ping间隔（毫秒）
   */
  PING_INTERVAL_MS: 25000,

  /**
   * 最大HTTP缓冲区大小
   */
  MAX_HTTP_BUFFER_SIZE: 1e6, // 1MB

  /**
   * 每个IP最大连接数
   */
  MAX_CONNECTIONS_PER_IP: 10,

  /**
   * IP连接限制TTL（秒）
   */
  IP_CONNECTION_TTL_SECONDS: 300, // 5分钟
} as const;

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  /**
   * 默认页码
   */
  DEFAULT_PAGE: 1,

  /**
   * 默认每页条数
   */
  DEFAULT_PAGE_SIZE: 20,

  /**
   * 最大每页条数
   */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * 时间常量（秒）
 */
export const TIME_CONSTANTS = {
  /**
   * 一分钟
   */
  ONE_MINUTE: 60,

  /**
   * 一小时
   */
  ONE_HOUR: 3600,

  /**
   * 一天
   */
  ONE_DAY: 86400,

  /**
   * 一周
   */
  ONE_WEEK: 604800,

  /**
   * 一个月（30天）
   */
  ONE_MONTH: 2592000,
} as const;

/**
 * 悟空IM配置
 */
export const WUKONGIM_CONFIG = {
  /**
   * 默认连接超时（毫秒）
   */
  DEFAULT_TIMEOUT_MS: 30000,

  /**
   * 最大重试次数
   */
  MAX_RETRY_COUNT: 3,

  /**
   * 消息确认超时（毫秒）
   */
  ACK_TIMEOUT_MS: 30000,

  /**
   * 令牌过期时间（秒）
   */
  TOKEN_EXPIRY_SECONDS: 86400, // 1天
} as const;

/**
 * CORS配置
 */
export const CORS_CONFIG = {
  /**
   * 默认允许的源
   */
  DEFAULT_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5172',
  ],

  /**
   * 允许的HTTP方法
   */
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  /**
   * 允许的请求头
   */
  ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
} as const;
