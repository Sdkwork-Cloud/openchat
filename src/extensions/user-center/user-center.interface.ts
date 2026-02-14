/**
 * 用户中心插件接口
 *
 * 职责：
 * 1. 定义用户中心插件的核心能力
 * 2. 支持本地用户中心和远程用户中心的统一抽象
 * 3. 提供用户认证、管理、同步等完整生命周期
 */

import {
  IExtension,
  ExtensionType,
  ExtensionMeta,
  ExtensionCapabilities,
  ExtensionStatus,
  ExtensionConfig,
  ExtensionContext,
} from '../core/extension.interface';

/**
 * 用户信息
 */
export interface UserInfo {
  /** 用户唯一标识 */
  id: string;
  /** 用户UUID */
  uuid?: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 昵称 */
  nickname?: string;
  /** 头像 - 支持字符串URL或结构化图片资源 */
  avatar?: string | AvatarMediaResource;
  /** 用户状态 */
  status?: UserOnlineStatus;
  /** 扩展属性 */
  extra?: Record<string, any>;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}

/**
 * 用户在线状态
 */
export type UserOnlineStatus = 'online' | 'offline' | 'busy' | 'away';

/**
 * 头像媒体资源
 * 与 ImageMediaResource 设计规范保持一致
 */
export interface AvatarMediaResource {
  /** 资源类型 */
  type: 'IMAGE';
  /** 资源唯一标识 */
  id?: string;
  /** 资源UUID */
  uuid?: string;
  /** 图片URL */
  url?: string;
  /** 图片字节数据 */
  bytes?: number[];
  /** Base64编码数据 */
  base64?: string;
  /** 本地文件对象 */
  localFile?: object;
  /** MIME类型 */
  mimeType?: string;
  /** 文件大小（字符串格式） */
  size?: string;
  /** 文件名 */
  name?: string;
  /** 文件扩展名 */
  extension?: string;
  /** 图片宽度（字符串格式） */
  width?: string;
  /** 图片高度（字符串格式） */
  height?: string;
  /** 宽高比 */
  aspectRatio?: string;
  /** 缩略图URL */
  thumbnailUrl?: string;
  /** 缩略图宽度 */
  thumbnailWidth?: string;
  /** 缩略图高度 */
  thumbnailHeight?: string;
  /** 分割图片 */
  splitImages?: AvatarMediaResource[];
  /** 提示词 */
  prompt?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
  /** 标签 */
  tags?: string[];
  /** 扩展字段 */
  extras?: Record<string, any>;
}

/**
 * 用户认证结果
 */
export interface UserAuthResult {
  /** 是否成功 */
  success: boolean;
  /** 用户信息 */
  user?: UserInfo;
  /** 访问令牌 */
  accessToken?: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** 令牌过期时间（秒） */
  expiresIn?: number;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: UserCenterErrorCode;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  /** 用户名/邮箱/手机号 */
  username: string;
  /** 密码 */
  password: string;
  /** 登录设备信息 */
  deviceInfo?: DeviceInfo;
  /** 登录IP */
  ip?: string;
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 昵称 */
  nickname?: string;
  /** 验证码 */
  verificationCode?: string;
  /** 验证码类型 */
  verificationType?: 'email' | 'phone';
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  /** 设备ID */
  deviceId?: string;
  /** 设备名称 */
  deviceName?: string;
  /** 设备类型 */
  deviceType?: 'web' | 'desktop' | 'mobile' | 'tablet';
  /** 操作系统 */
  os?: string;
  /** 浏览器 */
  browser?: string;
  /** 用户代理 */
  userAgent?: string;
}

/**
 * 用户查询选项
 */
export interface UserQueryOptions {
  /** 是否包含已删除用户 */
  includeDeleted?: boolean;
  /** 是否包含敏感信息（如密码哈希） */
  includeSensitive?: boolean;
  /** 缓存策略 */
  cacheStrategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
}

/**
 * 用户更新数据
 */
export interface UserUpdateData {
  /** 昵称 */
  nickname?: string;
  /** 头像 - 支持字符串URL或结构化图片资源 */
  avatar?: string | AvatarMediaResource;
  /** 状态 */
  status?: UserOnlineStatus;
  /** 扩展属性 */
  extra?: Record<string, any>;
}

/**
 * 密码修改请求
 */
export interface PasswordChangeRequest {
  /** 用户ID */
  userId: string;
  /** 旧密码 */
  oldPassword: string;
  /** 新密码 */
  newPassword: string;
}

/**
 * 密码重置请求
 */
export interface PasswordResetRequest {
  /** 邮箱或手机号 */
  target: string;
  /** 目标类型 */
  targetType: 'email' | 'phone';
  /** 新密码 */
  newPassword: string;
  /** 验证码 */
  verificationCode: string;
}

/**
 * 验证码发送请求
 */
export interface VerificationCodeRequest {
  /** 目标（邮箱或手机号） */
  target: string;
  /** 目标类型 */
  targetType: 'email' | 'phone';
  /** 验证码类型 */
  codeType: 'register' | 'reset-password' | 'verify' | 'login';
}

/**
 * 验证码验证请求
 */
export interface VerifyCodeRequest {
  /** 目标（邮箱或手机号） */
  target: string;
  /** 目标类型 */
  targetType: 'email' | 'phone';
  /** 验证码 */
  code: string;
  /** 验证码类型 */
  codeType: 'register' | 'reset-password' | 'verify' | 'login';
}

/**
 * 用户中心插件能力
 */
export interface UserCenterCapabilities extends ExtensionCapabilities {
  /** 支持的登录方式 */
  supportedLoginMethods?: LoginMethod[];
  /** 是否支持注册 */
  supportsRegistration?: boolean;
  /** 是否支持密码重置 */
  supportsPasswordReset?: boolean;
  /** 是否支持多因素认证 */
  supportsMFA?: boolean;
  /** 是否支持用户搜索 */
  supportsUserSearch?: boolean;
  /** 是否支持批量操作 */
  supportsBatchOperations?: boolean;
  /** 是否支持用户在线状态 */
  supportsOnlineStatus?: boolean;
  /** 是否支持用户同步 */
  supportsUserSync?: boolean;
  /** 最大批量查询数量 */
  maxBatchSize?: number;
}

/**
 * 登录方式
 */
export type LoginMethod = 'password' | 'sms' | 'email' | 'oauth' | 'ldap';

/**
 * 用户中心插件接口
 *
 * 实现此接口可以：
 * 1. 集成已有的用户中心系统
 * 2. 使用第三方认证服务
 * 3. 自定义用户管理逻辑
 */
export interface IUserCenterExtension extends IExtension {
  /** 插件类型固定为用户中心 */
  readonly type: ExtensionType.USER_CENTER;

  /** 用户中心能力声明 */
  readonly capabilities: UserCenterCapabilities;

  /**
   * 用户登录
   * @param request 登录请求
   * @returns 认证结果
   */
  login(request: LoginRequest): Promise<UserAuthResult>;

  /**
   * 用户注册
   * @param request 注册请求
   * @returns 认证结果
   */
  register(request: RegisterRequest): Promise<UserAuthResult>;

  /**
   * 用户登出
   * @param userId 用户ID
   * @param deviceInfo 设备信息（可选，用于单设备登出）
   */
  logout(userId: string, deviceInfo?: DeviceInfo): Promise<void>;

  /**
   * 刷新令牌
   * @param refreshToken 刷新令牌
   * @returns 新的认证结果
   */
  refreshToken(refreshToken: string): Promise<UserAuthResult>;

  /**
   * 验证访问令牌
   * @param token 访问令牌
   * @returns 用户信息，验证失败返回null
   */
  validateToken(token: string): Promise<UserInfo | null>;

  /**
   * 根据ID获取用户
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 用户信息
   */
  getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null>;

  /**
   * 根据用户名获取用户
   * @param username 用户名
   * @param options 查询选项
   * @returns 用户信息
   */
  getUserByUsername(username: string, options?: UserQueryOptions): Promise<UserInfo | null>;

  /**
   * 根据邮箱获取用户
   * @param email 邮箱
   * @param options 查询选项
   * @returns 用户信息
   */
  getUserByEmail?(email: string, options?: UserQueryOptions): Promise<UserInfo | null>;

  /**
   * 根据手机号获取用户
   * @param phone 手机号
   * @param options 查询选项
   * @returns 用户信息
   */
  getUserByPhone?(phone: string, options?: UserQueryOptions): Promise<UserInfo | null>;

  /**
   * 批量获取用户
   * @param userIds 用户ID列表
   * @param options 查询选项
   * @returns 用户信息列表
   */
  getUsers(userIds: string[], options?: UserQueryOptions): Promise<UserInfo[]>;

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param data 更新数据
   * @returns 更新后的用户信息
   */
  updateUser(userId: string, data: UserUpdateData): Promise<UserInfo>;

  /**
   * 删除用户（软删除）
   * @param userId 用户ID
   */
  deleteUser(userId: string): Promise<void>;

  /**
   * 搜索用户
   * @param keyword 搜索关键词
   * @param limit 返回数量限制
   * @returns 用户列表
   */
  searchUsers(keyword: string, limit?: number): Promise<UserInfo[]>;

  /**
   * 修改密码
   * @param request 密码修改请求
   */
  changePassword(request: PasswordChangeRequest): Promise<void>;

  /**
   * 重置密码
   * @param request 密码重置请求
   */
  resetPassword(request: PasswordResetRequest): Promise<void>;

  /**
   * 发送验证码
   * @param request 验证码请求
   */
  sendVerificationCode(request: VerificationCodeRequest): Promise<void>;

  /**
   * 验证验证码
   * @param request 验证请求
   * @returns 是否验证通过
   */
  verifyCode(request: VerifyCodeRequest): Promise<boolean>;

  /**
   * 获取用户在线状态
   * @param userIds 用户ID列表
   * @returns 用户在线状态映射
   */
  getOnlineStatus?(userIds: string[]): Promise<Record<string, UserOnlineStatus>>;

  /**
   * 设置用户在线状态
   * @param userId 用户ID
   * @param status 在线状态
   */
  setOnlineStatus?(userId: string, status: UserOnlineStatus): Promise<void>;

  /**
   * 同步用户到IM系统
   * @param userId 用户ID
   * @returns IM系统用户Token
   */
  syncUserToIM?(userId: string): Promise<string>;

  /**
   * 准备用户IM连接配置
   * @param userId 用户ID
   * @returns IM连接配置
   */
  prepareIMConnection?(userId: string): Promise<IMConnectionConfig>;
}

/**
 * IM连接配置
 */
export interface IMConnectionConfig {
  /** WebSocket地址 */
  wsUrl: string;
  /** API地址 */
  apiUrl?: string;
  /** 用户ID */
  uid: string;
  /** IM Token */
  token: string;
  /** 设备ID */
  deviceId?: string;
  /** 设备标识 */
  deviceFlag?: number;
}

/**
 * 用户中心插件基础类
 * 提供默认实现和工具方法
 */
export abstract class BaseUserCenterExtension implements IUserCenterExtension {
  abstract readonly meta: ExtensionMeta;
  readonly type = ExtensionType.USER_CENTER;
  abstract readonly capabilities: UserCenterCapabilities;

  private _status: ExtensionStatus = ExtensionStatus.UNLOADED;
  private _config: ExtensionConfig = { enabled: true };
  protected context: ExtensionContext | null = null;

  get status(): ExtensionStatus {
    return this._status;
  }

  getConfig(): ExtensionConfig {
    return this._config;
  }

  async updateConfig(config: Partial<ExtensionConfig>): Promise<void> {
    const oldConfig = { ...this._config };
    this._config = { ...this._config, ...config };
    if (this.onConfigChange) {
      await this.onConfigChange(oldConfig, this._config);
    }
  }

  async onLoad?(context: ExtensionContext): Promise<void>;
  async onUnload?(context: ExtensionContext): Promise<void>;
  async onActivate?(context: ExtensionContext): Promise<void>;
  async onDeactivate?(context: ExtensionContext): Promise<void>;
  async onConfigChange?(oldConfig: ExtensionConfig, newConfig: ExtensionConfig): Promise<void>;

  abstract login(request: LoginRequest): Promise<UserAuthResult>;
  abstract register(request: RegisterRequest): Promise<UserAuthResult>;
  abstract logout(userId: string, deviceInfo?: DeviceInfo): Promise<void>;
  abstract refreshToken(refreshToken: string): Promise<UserAuthResult>;
  abstract validateToken(token: string): Promise<UserInfo | null>;
  abstract getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null>;
  abstract getUserByUsername(username: string, options?: UserQueryOptions): Promise<UserInfo | null>;
  abstract getUsers(userIds: string[], options?: UserQueryOptions): Promise<UserInfo[]>;
  abstract updateUser(userId: string, data: UserUpdateData): Promise<UserInfo>;
  abstract deleteUser(userId: string): Promise<void>;
  abstract searchUsers(keyword: string, limit?: number): Promise<UserInfo[]>;
  abstract changePassword(request: PasswordChangeRequest): Promise<void>;
  abstract resetPassword(request: PasswordResetRequest): Promise<void>;
  abstract sendVerificationCode(request: VerificationCodeRequest): Promise<void>;
  abstract verifyCode(request: VerifyCodeRequest): Promise<boolean>;
}

/**
 * 用户中心事件
 */
export enum UserCenterEvent {
  /** 用户登录 */
  USER_LOGIN = 'user-center:user-login',
  /** 用户登出 */
  USER_LOGOUT = 'user-center:user-logout',
  /** 用户注册 */
  USER_REGISTER = 'user-center:user-register',
  /** 用户信息更新 */
  USER_UPDATE = 'user-center:user-update',
  /** 用户删除 */
  USER_DELETE = 'user-center:user-delete',
  /** 用户上线 */
  USER_ONLINE = 'user-center:user-online',
  /** 用户下线 */
  USER_OFFLINE = 'user-center:user-offline',
  /** 密码修改 */
  PASSWORD_CHANGE = 'user-center:password-change',
  /** 密码重置 */
  PASSWORD_RESET = 'user-center:password-reset',
  /** Token刷新 */
  TOKEN_REFRESH = 'user-center:token-refresh',
}

/**
 * 用户中心错误代码
 */
export enum UserCenterErrorCode {
  /** 用户不存在 */
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  /** 密码错误 */
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  /** 用户名已存在 */
  USERNAME_EXISTS = 'USERNAME_EXISTS',
  /** 邮箱已存在 */
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  /** 手机号已存在 */
  PHONE_EXISTS = 'PHONE_EXISTS',
  /** 验证码错误 */
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE',
  /** 验证码过期 */
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED',
  /** Token无效 */
  INVALID_TOKEN = 'INVALID_TOKEN',
  /** Token过期 */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** 刷新Token无效 */
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  /** 用户已禁用 */
  USER_DISABLED = 'USER_DISABLED',
  /** 密码强度不足 */
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  /** 旧密码错误 */
  INCORRECT_OLD_PASSWORD = 'INCORRECT_OLD_PASSWORD',
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** 操作不支持 */
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  /** 参数错误 */
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  /** 权限不足 */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** 请求过于频繁 */
  RATE_LIMITED = 'RATE_LIMITED',
}

/**
 * 用户中心异常类
 */
export class UserCenterError extends Error {
  constructor(
    public readonly code: UserCenterErrorCode,
    message: string,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'UserCenterError';
  }

  static fromCode(code: UserCenterErrorCode, details?: Record<string, any>): UserCenterError {
    const messages: Record<UserCenterErrorCode, string> = {
      [UserCenterErrorCode.USER_NOT_FOUND]: '用户不存在',
      [UserCenterErrorCode.INVALID_PASSWORD]: '密码错误',
      [UserCenterErrorCode.USERNAME_EXISTS]: '用户名已存在',
      [UserCenterErrorCode.EMAIL_EXISTS]: '邮箱已被注册',
      [UserCenterErrorCode.PHONE_EXISTS]: '手机号已被注册',
      [UserCenterErrorCode.INVALID_VERIFICATION_CODE]: '验证码错误',
      [UserCenterErrorCode.VERIFICATION_CODE_EXPIRED]: '验证码已过期',
      [UserCenterErrorCode.INVALID_TOKEN]: '无效的令牌',
      [UserCenterErrorCode.TOKEN_EXPIRED]: '令牌已过期',
      [UserCenterErrorCode.INVALID_REFRESH_TOKEN]: '无效的刷新令牌',
      [UserCenterErrorCode.USER_DISABLED]: '用户已被禁用',
      [UserCenterErrorCode.WEAK_PASSWORD]: '密码强度不足',
      [UserCenterErrorCode.INCORRECT_OLD_PASSWORD]: '原密码错误',
      [UserCenterErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
      [UserCenterErrorCode.NOT_SUPPORTED]: '该操作不支持',
      [UserCenterErrorCode.INVALID_PARAMETER]: '参数错误',
      [UserCenterErrorCode.PERMISSION_DENIED]: '权限不足',
      [UserCenterErrorCode.RATE_LIMITED]: '请求过于频繁，请稍后重试',
    };

    return new UserCenterError(code, messages[code] || '未知错误', details);
  }
}
