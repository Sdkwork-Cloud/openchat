/**
 * 错误消息常量
 * 统一管理系统中所有错误消息
 */

/**
 * 认证相关错误
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: '用户名或密码错误',
  USER_NOT_FOUND: '用户不存在',
  USER_ALREADY_EXISTS: '用户名已存在',
  EMAIL_ALREADY_EXISTS: '邮箱已存在',
  PHONE_ALREADY_EXISTS: '手机号已存在',
  INVALID_TOKEN: '无效的令牌',
  TOKEN_EXPIRED: '令牌已过期',
  INVALID_REFRESH_TOKEN: '无效的刷新令牌',
  UNAUTHORIZED: '未授权',
  FORBIDDEN: '禁止访问',
  INVALID_VERIFICATION_CODE: '验证码错误或已过期',
  PASSWORD_TOO_WEAK: '密码强度不足',
  OLD_PASSWORD_INCORRECT: '旧密码错误',
} as const;

/**
 * 用户相关错误
 */
export const USER_ERRORS = {
  NOT_FOUND: '用户不存在',
  ALREADY_EXISTS: '用户已存在',
  CREATE_FAILED: '创建用户失败',
  UPDATE_FAILED: '更新用户信息失败',
  DELETE_FAILED: '删除用户失败',
  INVALID_STATUS: '无效的用户状态',
} as const;

/**
 * 好友相关错误
 */
export const FRIEND_ERRORS = {
  NOT_FOUND: '好友不存在',
  ALREADY_EXISTS: '已经是好友',
  REQUEST_NOT_FOUND: '好友请求不存在',
  REQUEST_ALREADY_SENT: '好友请求已发送',
  CANNOT_ADD_SELF: '不能添加自己为好友',
  NO_PERMISSION: '无权操作此好友关系',
} as const;

/**
 * 群组相关错误
 */
export const GROUP_ERRORS = {
  NOT_FOUND: '群组不存在',
  ALREADY_EXISTS: '群组已存在',
  MEMBER_NOT_FOUND: '群成员不存在',
  ALREADY_MEMBER: '已经是群成员',
  NOT_MEMBER: '不是群成员',
  NO_PERMISSION: '无权操作此群组',
  OWNER_CANNOT_LEAVE: '群主不能退出群组',
  INVITATION_NOT_FOUND: '邀请不存在',
  INVITATION_EXPIRED: '邀请已过期',
} as const;

/**
 * 消息相关错误
 */
export const MESSAGE_ERRORS = {
  NOT_FOUND: '消息不存在',
  SEND_FAILED: '发送消息失败',
  RECALL_FAILED: '撤回消息失败',
  RECALL_EXPIRED: '消息已超过可撤回时间',
  NO_PERMISSION: '无权操作此消息',
  INVALID_TYPE: '无效的消息类型',
  EMPTY_CONTENT: '消息内容不能为空',
} as const;

/**
 * 智能体相关错误
 */
export const AGENT_ERRORS = {
  NOT_FOUND: '智能体不存在',
  ALREADY_EXISTS: '智能体已存在',
  SESSION_NOT_FOUND: '会话不存在',
  NO_PERMISSION: '无权访问此智能体',
  CHAT_FAILED: '对话失败',
  INVALID_CONFIG: '无效的智能体配置',
} as const;

/**
 * Bot相关错误
 */
export const BOT_ERRORS = {
  NOT_FOUND: (id: string) => `Bot with id '${id}' not found`,
  ALREADY_EXISTS: 'Bot已存在',
  NO_PERMISSION: (action: string) => `You do not have permission to ${action}`,
  PLATFORM_NOT_SUPPORTED: (platform: string) => `Platform '${platform}' not supported`,
  WEBHOOK_FAILED: 'Webhook处理失败',
} as const;

/**
 * 第三方平台相关错误
 */
export const THIRD_PARTY_ERRORS = {
  PLATFORM_NOT_SUPPORTED: (platform: string) => `Platform '${platform}' not supported`,
  AUTH_FAILED: '认证失败',
  API_ERROR: '第三方API错误',
  WEBHOOK_FAILED: 'Webhook处理失败',
} as const;

/**
 * 系统相关错误
 */
export const SYSTEM_ERRORS = {
  INTERNAL_ERROR: '系统内部错误',
  SERVICE_UNAVAILABLE: '服务暂不可用',
  DATABASE_ERROR: '数据库错误',
  CACHE_ERROR: '缓存错误',
  NETWORK_ERROR: '网络错误',
  TIMEOUT: '请求超时',
  INVALID_PARAMS: '无效的参数',
  MISSING_PARAMS: '缺少必要的参数',
} as const;

/**
 * IM相关错误
 */
export const IM_ERRORS = {
  CONNECTION_FAILED: 'IM连接失败',
  SEND_FAILED: '发送消息失败',
  SYNC_FAILED: '同步用户失败',
  TOKEN_GENERATE_FAILED: '生成IM令牌失败',
  PROVIDER_NOT_FOUND: 'IM提供商不存在',
} as const;
