/**
 * 验证相关常量
 * 统一正则表达式和验证规则
 */

/**
 * 正则表达式模式
 */
export const REGEX_PATTERNS = {
  /**
   * 邮箱格式
   */
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  /**
   * 手机号格式（中国大陆）
   */
  PHONE: /^1[3-9]\d{9}$/,

  /**
   * 验证码格式（6位数字）
   */
  VERIFICATION_CODE: /^\d{6}$/,

  /**
   * 用户名格式（字母、数字、下划线、横线）
   */
  USERNAME: /^[a-zA-Z0-9_-]+$/,

  /**
   * UUID格式
   */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /**
   * 密码强度（至少8位，包含大小写字母、数字、特殊字符）
   */
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,

  /**
   * URL格式
   */
  URL: /^https?:\/\/.+/,

  /**
   * 颜色代码（HEX）
   */
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const;

/**
 * 验证错误消息
 */
export const VALIDATION_MESSAGES = {
  EMAIL: '邮箱格式不正确',
  PHONE: '手机号格式不正确',
  VERIFICATION_CODE: '验证码格式不正确，应为6位数字',
  USERNAME: '用户名只能包含字母、数字、下划线和横线',
  PASSWORD_MIN_LENGTH: '密码长度不能少于6个字符',
  PASSWORD_MAX_LENGTH: '密码长度不能超过100个字符',
  USERNAME_MIN_LENGTH: '用户名长度不能少于3个字符',
  USERNAME_MAX_LENGTH: '用户名长度不能超过50个字符',
  NICKNAME_MIN_LENGTH: '昵称长度不能少于1个字符',
  NICKNAME_MAX_LENGTH: '昵称长度不能超过100个字符',
} as const;

/**
 * 验证长度限制
 */
export const VALIDATION_LIMITS = {
  /**
   * 用户名长度
   */
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,

  /**
   * 密码长度
   */
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 100,

  /**
   * 昵称长度
   */
  NICKNAME_MIN: 1,
  NICKNAME_MAX: 100,

  /**
   * 验证码长度
   */
  VERIFICATION_CODE_LENGTH: 6,

  /**
   * 分页默认值
   */
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
