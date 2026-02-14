/**
 * 远程用户中心插件
 *
 * 职责：
 * 1. 集成已有的远程用户中心系统
 * 2. 通过 HTTP API 调用远程服务
 * 3. 支持自定义认证流程
 * 4. 支持用户数据同步
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  IUserCenterExtension,
  UserInfo,
  UserAuthResult,
  LoginRequest,
  RegisterRequest,
  UserQueryOptions,
  UserUpdateData,
  PasswordChangeRequest,
  PasswordResetRequest,
  VerificationCodeRequest,
  VerifyCodeRequest,
  IMConnectionConfig,
  UserCenterCapabilities,
  AvatarMediaResource,
} from './user-center.interface';
import {
  ExtensionType,
  ExtensionMeta,
  ExtensionStatus,
  ExtensionPriority,
  ExtensionContext,
} from '../core/extension.interface';

/**
 * 远程用户中心配置
 */
export interface RemoteUserCenterConfig {
  /** 远程服务基础URL */
  baseUrl: string;
  /** API 路径前缀 */
  apiPrefix?: string;
  /** 认证方式 */
  authMethod?: 'bearer' | 'basic' | 'api-key' | 'custom';
  /** API Key (用于 api-key 认证) */
  apiKey?: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 请求超时时间 (毫秒) */
  timeout?: number;
  /** 是否启用本地 Token 签发 */
  localTokenSigning?: boolean;
  /** 本地 JWT 密钥 (localTokenSigning=true 时使用) */
  localJwtSecret?: string;
  /** Access Token 过期时间 (秒) */
  accessTokenExpiresIn?: number;
  /** Refresh Token 过期时间 (秒) */
  refreshTokenExpiresIn?: number;
  /** IM WebSocket 地址 */
  imWsUrl?: string;
  /** API 端点映射 */
  endpoints?: {
    login?: string;
    register?: string;
    logout?: string;
    validateToken?: string;
    getUser?: string;
    getUsers?: string;
    updateUser?: string;
    deleteUser?: string;
    searchUsers?: string;
    changePassword?: string;
    resetPassword?: string;
    sendCode?: string;
    verifyCode?: string;
  };
}

/**
 * 默认 API 端点
 */
const DEFAULT_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
  validateToken: '/auth/validate',
  getUser: '/users/{id}',
  getUsers: '/users/batch',
  updateUser: '/users/{id}',
  deleteUser: '/users/{id}',
  searchUsers: '/users/search',
  changePassword: '/users/{id}/password',
  resetPassword: '/auth/reset-password',
  sendCode: '/auth/send-code',
  verifyCode: '/auth/verify-code',
};

/**
 * 远程用户中心插件
 */
@Injectable()
export class RemoteUserCenterExtension implements IUserCenterExtension {
  private readonly logger = new Logger(RemoteUserCenterExtension.name);
  private _status: ExtensionStatus = ExtensionStatus.UNLOADED;
  private _config: any = { enabled: true, priority: ExtensionPriority.NORMAL };
  private context: ExtensionContext | null = null;
  private remoteConfig: RemoteUserCenterConfig;
  private endpoints: Required<typeof DEFAULT_ENDPOINTS>;

  readonly meta: ExtensionMeta = {
    id: 'openchat-user-center-remote',
    name: 'Remote User Center',
    version: '1.0.0',
    description: 'Remote user center integration for existing user systems',
    author: 'OpenChat Team',
    license: 'MIT',
    tags: ['user-center', 'authentication', 'remote', 'integration'],
  };

  readonly type = ExtensionType.USER_CENTER;

  readonly capabilities: UserCenterCapabilities = {
    supportedLoginMethods: ['password', 'oauth'],
    supportsRegistration: true,
    supportsPasswordReset: true,
    supportsMFA: false,
    supportsUserSearch: true,
    supportsBatchOperations: true,
    supportsOnlineStatus: true,
    supportsUserSync: true,
    maxBatchSize: 100,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.remoteConfig = this.loadConfig();
    this.endpoints = { ...DEFAULT_ENDPOINTS, ...this.remoteConfig.endpoints } as Required<typeof DEFAULT_ENDPOINTS>;
  }

  private loadConfig(): RemoteUserCenterConfig {
    return {
      baseUrl: this.configService.get<string>('REMOTE_USER_CENTER_URL', ''),
      apiPrefix: this.configService.get<string>('REMOTE_USER_CENTER_API_PREFIX', '/api/v1'),
      authMethod: this.configService.get<'bearer' | 'basic' | 'api-key' | 'custom'>(
        'REMOTE_USER_CENTER_AUTH_METHOD',
        'bearer',
      ),
      apiKey: this.configService.get<string>('REMOTE_USER_CENTER_API_KEY', ''),
      headers: {},
      timeout: this.configService.get<number>('REMOTE_USER_CENTER_TIMEOUT', 30000),
      localTokenSigning: this.configService.get<boolean>('REMOTE_USER_CENTER_LOCAL_TOKEN', true),
      localJwtSecret: this.configService.get<string>('JWT_SECRET', 'openchat-secret-key'),
      accessTokenExpiresIn: this.configService.get<number>('JWT_ACCESS_EXPIRES_IN', 7200),
      refreshTokenExpiresIn: this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800),
      imWsUrl: this.configService.get<string>('IM_WS_URL', 'ws://localhost:8000/ws'),
    };
  }

  get status(): ExtensionStatus {
    return this._status;
  }

  getConfig() {
    return this._config;
  }

  async updateConfig(config: any): Promise<void> {
    const oldConfig = { ...this._config };
    this._config = { ...this._config, ...config };
    if (this.onConfigChange) {
      await this.onConfigChange(oldConfig, this._config);
    }
  }

  async onLoad(context: ExtensionContext): Promise<void> {
    this.context = context;
    this._status = ExtensionStatus.LOADED;
    context.logger.info('Remote user center extension loaded');
  }

  async onUnload(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.UNLOADED;
    context.logger.info('Remote user center extension unloaded');
  }

  async onActivate(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.ACTIVE;
    context.logger.info('Remote user center extension activated');
  }

  async onDeactivate(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.INACTIVE;
    context.logger.info('Remote user center extension deactivated');
  }

  async onConfigChange(oldConfig: any, newConfig: any): Promise<void> {
    this.remoteConfig = this.loadConfig();
    this.context?.logger.info('Remote user center config reloaded');
  }

  async login(request: LoginRequest): Promise<UserAuthResult> {
    try {
      const response = await this.request('POST', this.endpoints.login, {
        username: request.username,
        password: request.password,
        deviceInfo: request.deviceInfo,
        ip: request.ip,
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || '登录失败',
          errorCode: response.errorCode,
        };
      }

      let accessToken = response.accessToken;
      let refreshToken = response.refreshToken;
      let expiresIn = response.expiresIn || this.remoteConfig.accessTokenExpiresIn;

      if (this.remoteConfig.localTokenSigning && response.user) {
        const tokens = await this.generateLocalTokens(response.user.id);
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
        expiresIn = tokens.expiresIn;
      }

      return {
        success: true,
        user: this.mapUserInfo(response.user),
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Remote login failed:', error);
      return {
        success: false,
        error: '远程登录服务不可用',
      };
    }
  }

  async register(request: RegisterRequest): Promise<UserAuthResult> {
    try {
      const response = await this.request('POST', this.endpoints.register, {
        username: request.username,
        password: request.password,
        email: request.email,
        phone: request.phone,
        nickname: request.nickname,
        verificationCode: request.verificationCode,
        verificationType: request.verificationType,
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || '注册失败',
          errorCode: response.errorCode,
        };
      }

      let accessToken = response.accessToken;
      let refreshToken = response.refreshToken;
      let expiresIn = response.expiresIn || this.remoteConfig.accessTokenExpiresIn;

      if (this.remoteConfig.localTokenSigning && response.user) {
        const tokens = await this.generateLocalTokens(response.user.id);
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
        expiresIn = tokens.expiresIn;
      }

      return {
        success: true,
        user: this.mapUserInfo(response.user),
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Remote registration failed:', error);
      return {
        success: false,
        error: '远程注册服务不可用',
      };
    }
  }

  async logout(userId: string, deviceInfo?: any): Promise<void> {
    try {
      await this.request('POST', this.endpoints.logout, { userId, deviceInfo });
    } catch (error) {
      this.logger.warn('Remote logout failed:', error);
    }
  }

  async refreshToken(refreshToken: string): Promise<UserAuthResult> {
    try {
      if (this.remoteConfig.localTokenSigning) {
        const payload = this.jwtService.verify(refreshToken, {
          secret: this.remoteConfig.localJwtSecret,
        });

        if (payload.type !== 'refresh') {
          return {
            success: false,
            error: '无效的刷新令牌',
          };
        }

        const user = await this.getUserById(payload.sub);
        if (!user) {
          return {
            success: false,
            error: '用户不存在',
          };
        }

        const tokens = await this.generateLocalTokens(user.id);
        return {
          success: true,
          user,
          ...tokens,
        };
      }

      const response = await this.request('POST', '/auth/refresh', { refreshToken });

      if (!response.success) {
        return {
          success: false,
          error: response.error || '刷新令牌失败',
        };
      }

      return {
        success: true,
        user: this.mapUserInfo(response.user),
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      };
    } catch (error) {
      return {
        success: false,
        error: '刷新令牌已过期',
      };
    }
  }

  async validateToken(token: string): Promise<UserInfo | null> {
    try {
      if (this.remoteConfig.localTokenSigning) {
        const payload = this.jwtService.verify(token, {
          secret: this.remoteConfig.localJwtSecret,
        });

        if (payload.type !== 'access') {
          return null;
        }

        return this.getUserById(payload.sub);
      }

      const response = await this.request('POST', this.endpoints.validateToken, { token });
      return response.user ? this.mapUserInfo(response.user) : null;
    } catch {
      return null;
    }
  }

  async getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    try {
      const endpoint = this.endpoints.getUser.replace('{id}', userId);
      const response = await this.request('GET', endpoint);
      return response.user ? this.mapUserInfo(response.user) : null;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }

  async getUserByUsername(username: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    try {
      const response = await this.request('GET', '/users/by-username', { username });
      return response.user ? this.mapUserInfo(response.user) : null;
    } catch {
      return null;
    }
  }

  async getUsers(userIds: string[], options?: UserQueryOptions): Promise<UserInfo[]> {
    if (!userIds.length) return [];

    try {
      const response = await this.request('POST', this.endpoints.getUsers, { userIds });
      return (response.users || []).map((u: any) => this.mapUserInfo(u));
    } catch (error) {
      this.logger.error('Failed to get users:', error);
      return [];
    }
  }

  async updateUser(userId: string, data: UserUpdateData): Promise<UserInfo> {
    const endpoint = this.endpoints.updateUser.replace('{id}', userId);
    const response = await this.request('PUT', endpoint, data);
    return this.mapUserInfo(response.user);
  }

  async deleteUser(userId: string): Promise<void> {
    const endpoint = this.endpoints.deleteUser.replace('{id}', userId);
    await this.request('DELETE', endpoint);
  }

  async searchUsers(keyword: string, limit: number = 10): Promise<UserInfo[]> {
    try {
      const response = await this.request('GET', this.endpoints.searchUsers, { keyword, limit });
      return (response.users || []).map((u: any) => this.mapUserInfo(u));
    } catch {
      return [];
    }
  }

  async changePassword(request: PasswordChangeRequest): Promise<void> {
    const endpoint = this.endpoints.changePassword.replace('{id}', request.userId);
    await this.request('PUT', endpoint, {
      oldPassword: request.oldPassword,
      newPassword: request.newPassword,
    });
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    await this.request('POST', this.endpoints.resetPassword, {
      target: request.target,
      targetType: request.targetType,
      newPassword: request.newPassword,
      verificationCode: request.verificationCode,
    });
  }

  async sendVerificationCode(request: VerificationCodeRequest): Promise<void> {
    await this.request('POST', this.endpoints.sendCode, {
      target: request.target,
      targetType: request.targetType,
      codeType: request.codeType,
    });
  }

  async verifyCode(request: VerifyCodeRequest): Promise<boolean> {
    try {
      const response = await this.request('POST', this.endpoints.verifyCode, {
        target: request.target,
        targetType: request.targetType,
        code: request.code,
        codeType: request.codeType,
      });
      return response.valid === true;
    } catch {
      return false;
    }
  }

  async prepareIMConnection(userId: string): Promise<IMConnectionConfig> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      wsUrl: this.remoteConfig.imWsUrl || '',
      uid: user.id,
      token: await this.generateIMToken(userId),
    };
  }

  private async request(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.remoteConfig.baseUrl}${this.remoteConfig.apiPrefix}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.remoteConfig.headers,
    };

    if (this.remoteConfig.authMethod === 'bearer' && this.remoteConfig.apiKey) {
      headers['Authorization'] = `Bearer ${this.remoteConfig.apiKey}`;
    } else if (this.remoteConfig.authMethod === 'api-key' && this.remoteConfig.apiKey) {
      headers['X-API-Key'] = this.remoteConfig.apiKey;
    }

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.remoteConfig.timeout || 30000),
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
  }

  private async generateLocalTokens(userId: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = this.jwtService.sign(
      { sub: userId, type: 'access' },
      { secret: this.remoteConfig.localJwtSecret, expiresIn: this.remoteConfig.accessTokenExpiresIn },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { secret: this.remoteConfig.localJwtSecret, expiresIn: this.remoteConfig.refreshTokenExpiresIn },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.remoteConfig.accessTokenExpiresIn!,
    };
  }

  private async generateIMToken(userId: string): Promise<string> {
    return this.jwtService.sign(
      { sub: userId, type: 'im' },
      { secret: this.remoteConfig.localJwtSecret, expiresIn: '7d' },
    );
  }

  private mapUserInfo(data: any): UserInfo {
    if (!data) return null as any;

    let avatar: string | AvatarMediaResource | undefined;
    const avatarData = data.avatar || data.avatarUrl || data.picture;
    
    if (avatarData) {
      if (typeof avatarData === 'string') {
        avatar = avatarData;
      } else if (typeof avatarData === 'object') {
        avatar = {
          type: 'IMAGE',
          url: avatarData.url || avatarData.href,
          thumbnailUrl: avatarData.thumbnailUrl || avatarData.thumbnail,
          width: avatarData.width ? String(avatarData.width) : undefined,
          height: avatarData.height ? String(avatarData.height) : undefined,
          mimeType: avatarData.mimeType || avatarData.contentType,
          size: avatarData.size ? String(avatarData.size) : undefined,
          name: avatarData.name || avatarData.filename,
        } as AvatarMediaResource;
      }
    }

    return {
      id: data.id || data.userId,
      uuid: data.uuid,
      username: data.username,
      email: data.email,
      phone: data.phone,
      nickname: data.nickname || data.name,
      avatar,
      status: data.status || 'offline',
      extra: data.extra || data.metadata,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    };
  }
}
