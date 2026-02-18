/**
 * 默认本地用户中心插件
 *
 * 职责：
 * 1. 提供基于本地数据库的用户管理
 * 2. 支持用户名/邮箱/手机号登录
 * 3. 支持 JWT Token 认证
 * 4. 支持验证码发送和验证
 */

import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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
  UserCenterEvent,
  UserCenterErrorCode,
  UserOnlineStatus,
  AvatarMediaResource,
} from './user-center.interface';
import {
  ExtensionType,
  ExtensionMeta,
  ExtensionStatus,
  ExtensionPriority,
  ExtensionContext,
} from '../core/extension.interface';
import { UserEntity } from '../../modules/user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { UserSyncService } from '../../modules/user/user-sync.service';

/**
 * 默认用户中心插件配置
 */
export interface DefaultUserCenterConfig {
  /** JWT 密钥 */
  jwtSecret: string;
  /** Access Token 过期时间（秒） */
  accessTokenExpiresIn: number;
  /** Refresh Token 过期时间（秒） */
  refreshTokenExpiresIn: number;
  /** 密码最小长度 */
  minPasswordLength: number;
  /** 验证码过期时间（秒） */
  verificationCodeExpiresIn: number;
  /** IM WebSocket 地址 */
  imWsUrl: string;
}

/**
 * 默认本地用户中心插件
 */
@Injectable()
export class DefaultUserCenterExtension implements IUserCenterExtension {
  private readonly logger = new Logger(DefaultUserCenterExtension.name);
  private _status: ExtensionStatus = ExtensionStatus.UNLOADED;
  private _config: any = { enabled: true, priority: ExtensionPriority.NORMAL };
  private context: ExtensionContext | null = null;
  private pluginConfig: DefaultUserCenterConfig;

  readonly meta: ExtensionMeta = {
    id: 'openchat-user-center-default',
    name: 'Default User Center',
    version: '1.0.0',
    description: 'Default local user center implementation with JWT authentication',
    author: 'OpenChat Team',
    license: 'MIT',
    tags: ['user-center', 'authentication', 'local'],
  };

  readonly type = ExtensionType.USER_CENTER;

  readonly capabilities: UserCenterCapabilities = {
    supportedLoginMethods: ['password'],
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
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userSyncService: UserSyncService,
  ) {
    this.pluginConfig = {
      jwtSecret: this.configService.get<string>('JWT_SECRET', 'openchat-secret-key'),
      accessTokenExpiresIn: this.configService.get<number>('JWT_ACCESS_EXPIRES_IN', 7200),
      refreshTokenExpiresIn: this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800),
      minPasswordLength: this.configService.get<number>('MIN_PASSWORD_LENGTH', 6),
      verificationCodeExpiresIn: this.configService.get<number>('VERIFICATION_CODE_EXPIRES_IN', 300),
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
    context.logger.info('Default user center extension loaded');
  }

  async onUnload(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.UNLOADED;
    context.logger.info('Default user center extension unloaded');
  }

  async onActivate(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.ACTIVE;
    context.logger.info('Default user center extension activated');
  }

  async onDeactivate(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.INACTIVE;
    context.logger.info('Default user center extension deactivated');
  }

  async onConfigChange(oldConfig: any, newConfig: any): Promise<void> {
    this.context?.logger.info('User center config changed');
  }

  async login(request: LoginRequest): Promise<UserAuthResult> {
    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.username = :username OR user.email = :username OR user.phone = :username', {
          username: request.username,
        })
        .andWhere('user.isDeleted = :isDeleted', { isDeleted: false })
        .getOne();

      if (!user) {
        return {
          success: false,
          error: '用户名或密码错误',
          errorCode: UserCenterErrorCode.USER_NOT_FOUND,
        };
      }

      const isPasswordValid = await bcrypt.compare(request.password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: '用户名或密码错误',
          errorCode: UserCenterErrorCode.INVALID_PASSWORD,
        };
      }

      const { accessToken, refreshToken, expiresIn } = await this.generateTokens(user.id);

      if (request.ip) {
        user.lastLoginIp = request.ip;
      }
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      await this.userSyncService.syncUserOnLogin(user.id);

      this.context?.emit(UserCenterEvent.USER_LOGIN, { userId: user.id, ip: request.ip });

      return {
        success: true,
        user: this.toUserInfo(user),
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Login failed:', error);
      return {
        success: false,
        error: '登录失败，请稍后重试',
      };
    }
  }

  async register(request: RegisterRequest): Promise<UserAuthResult> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: [{ username: request.username }],
      });

      if (existingUser) {
        return {
          success: false,
          error: '用户名已存在',
          errorCode: UserCenterErrorCode.USERNAME_EXISTS,
        };
      }

      if (request.email) {
        const existingEmail = await this.userRepository.findOne({
          where: { email: request.email },
        });
        if (existingEmail) {
          return {
            success: false,
            error: '邮箱已被注册',
            errorCode: UserCenterErrorCode.EMAIL_EXISTS,
          };
        }
      }

      if (request.phone) {
        const existingPhone = await this.userRepository.findOne({
          where: { phone: request.phone },
        });
        if (existingPhone) {
          return {
            success: false,
            error: '手机号已被注册',
            errorCode: UserCenterErrorCode.PHONE_EXISTS,
          };
        }
      }

      const hashedPassword = await bcrypt.hash(request.password, 10);

      const user = this.userRepository.create({
        username: request.username,
        email: request.email || '',
        phone: request.phone || '',
        nickname: request.nickname || request.username,
        password: hashedPassword,
        status: 'online',
      });

      await this.userRepository.save(user);

      await this.userSyncService.syncUserOnRegister(user);

      const { accessToken, refreshToken, expiresIn } = await this.generateTokens(user.id);

      this.context?.emit(UserCenterEvent.USER_REGISTER, { userId: user.id });

      return {
        success: true,
        user: this.toUserInfo(user),
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Registration failed:', error);
      return {
        success: false,
        error: '注册失败，请稍后重试',
      };
    }
  }

  async logout(userId: string, deviceInfo?: any): Promise<void> {
    this.context?.emit(UserCenterEvent.USER_LOGOUT, { userId, deviceInfo });
  }

  async refreshToken(refreshToken: string): Promise<UserAuthResult> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.pluginConfig.jwtSecret,
      });

      if (payload.type !== 'refresh') {
        return {
          success: false,
          error: '无效的刷新令牌',
          errorCode: UserCenterErrorCode.INVALID_REFRESH_TOKEN,
        };
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isDeleted: false },
      });

      if (!user) {
        return {
          success: false,
          error: '用户不存在',
          errorCode: UserCenterErrorCode.USER_NOT_FOUND,
        };
      }

      const tokens = await this.generateTokens(user.id);

      this.context?.emit(UserCenterEvent.TOKEN_REFRESH, { userId: user.id });

      return {
        success: true,
        user: this.toUserInfo(user),
        ...tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: '刷新令牌已过期，请重新登录',
        errorCode: UserCenterErrorCode.TOKEN_EXPIRED,
      };
    }
  }

  async validateToken(token: string): Promise<UserInfo | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.pluginConfig.jwtSecret,
      });

      if (payload.type !== 'access') {
        return null;
      }

      const user = await this.getUserById(payload.sub);
      return user;
    } catch {
      return null;
    }
  }

  async getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    const cacheKey = `user:${userId}`;
    const cacheStrategy = options?.cacheStrategy || 'cache-first';

    if (cacheStrategy === 'cache-first' || cacheStrategy === 'cache-only') {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      if (cacheStrategy === 'cache-only') {
        return null;
      }
    }

    const query = this.userRepository.createQueryBuilder('user').where('user.id = :userId', { userId });

    if (!options?.includeDeleted) {
      query.andWhere('user.isDeleted = :isDeleted', { isDeleted: false });
    }

    const user = await query.getOne();

    if (!user) {
      return null;
    }

    const userInfo = this.toUserInfo(user);

    await this.redisService.set(cacheKey, JSON.stringify(userInfo), 300);

    return userInfo;
  }

  async getUserByUsername(username: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username });

    if (!options?.includeDeleted) {
      query.andWhere('user.isDeleted = :isDeleted', { isDeleted: false });
    }

    const user = await query.getOne();
    return user ? this.toUserInfo(user) : null;
  }

  async getUsers(userIds: string[], options?: UserQueryOptions): Promise<UserInfo[]> {
    if (!userIds.length) return [];

    const query = this.userRepository.createQueryBuilder('user').where('user.id IN (:...userIds)', { userIds });

    if (!options?.includeDeleted) {
      query.andWhere('user.isDeleted = :isDeleted', { isDeleted: false });
    }

    const users = await query.getMany();
    return users.map((u) => this.toUserInfo(u));
  }

  async updateUser(userId: string, data: UserUpdateData): Promise<UserInfo> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (data.nickname !== undefined) {
      user.nickname = data.nickname;
    }
    if (data.avatar !== undefined) {
      user.avatar = data.avatar;
    }
    if (data.status !== undefined) {
      user.status = data.status === 'away' ? 'offline' : data.status;
    }
    if (data.extra !== undefined) {
      user.resources = { ...user.resources, ...data.extra };
    }

    await this.userRepository.save(user);

    await this.redisService.del(`user:${userId}`);

    this.context?.emit(UserCenterEvent.USER_UPDATE, { userId, data });

    return this.toUserInfo(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      user.isDeleted = true;
      await this.userRepository.save(user);
      await this.redisService.del(`user:${userId}`);
      this.context?.emit(UserCenterEvent.USER_DELETE, { userId });
    }
  }

  async searchUsers(keyword: string, limit: number = 10): Promise<UserInfo[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('(user.username LIKE :keyword OR user.nickname LIKE :keyword)', {
        keyword: `%${keyword}%`,
      })
      .take(limit)
      .getMany();

    return users.map((u) => this.toUserInfo(u));
  }

  async changePassword(request: PasswordChangeRequest): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: request.userId, isDeleted: false },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(request.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Old password is incorrect');
    }

    user.password = await bcrypt.hash(request.newPassword, 10);
    await this.userRepository.save(user);

    this.context?.emit(UserCenterEvent.PASSWORD_CHANGE, { userId: request.userId });
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    const isValid = await this.verifyCode({
      target: request.target,
      targetType: request.targetType,
      code: request.verificationCode,
      codeType: 'reset-password',
    });

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    const field = request.targetType === 'email' ? 'email' : 'phone';
    const user = await this.userRepository.findOne({
      where: { [field]: request.target, isDeleted: false },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.password = await bcrypt.hash(request.newPassword, 10);
    await this.userRepository.save(user);

    await this.redisService.del(`verification:${request.targetType}:${request.target}:reset-password`);

    this.context?.emit(UserCenterEvent.PASSWORD_RESET, { userId: user.id });
  }

  async sendVerificationCode(request: VerificationCodeRequest): Promise<void> {
    const code = Math.random().toString().slice(-6);
    const key = `verification:${request.targetType}:${request.target}:${request.codeType}`;

    await this.redisService.set(key, code, this.pluginConfig.verificationCodeExpiresIn);

    this.logger.log(`Verification code for ${request.target}: ${code}`);
  }

  async verifyCode(request: VerifyCodeRequest): Promise<boolean> {
    const key = `verification:${request.targetType}:${request.target}:${request.codeType}`;
    const storedCode = await this.redisService.get(key);

    if (!storedCode || storedCode !== request.code) {
      return false;
    }

    await this.redisService.del(key);
    return true;
  }

  async getOnlineStatus(userIds: string[]): Promise<Record<string, UserOnlineStatus>> {
    const result: Record<string, UserOnlineStatus> = {};

    for (const userId of userIds) {
      const key = `user:online:${userId}`;
      const status = await this.redisService.get(key);
      result[userId] = (status as UserOnlineStatus) || 'offline';
    }

    return result;
  }

  async syncUserToIM(userId: string): Promise<string> {
    const token = await this.userSyncService.getUserToken(userId);
    return token || '';
  }

  async prepareIMConnection(userId: string): Promise<IMConnectionConfig> {
    const result = await this.userSyncService.prepareUserConnection(userId);
    
    if (!result.enabled || !result.config) {
      throw new Error(result.error || 'IM connection not available');
    }

    return {
      wsUrl: result.config.wsUrl,
      apiUrl: result.config.apiUrl,
      uid: result.config.uid,
      token: result.config.token,
    };
  }

  private async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = this.jwtService.sign(
      { sub: userId, type: 'access' },
      { secret: this.pluginConfig.jwtSecret, expiresIn: this.pluginConfig.accessTokenExpiresIn },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { secret: this.pluginConfig.jwtSecret, expiresIn: this.pluginConfig.refreshTokenExpiresIn },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.pluginConfig.accessTokenExpiresIn,
    };
  }

  private toUserInfo(user: UserEntity): UserInfo {
    let avatar: string | AvatarMediaResource | undefined;
    
    if (user.avatar) {
      if (typeof user.avatar === 'string') {
        avatar = user.avatar;
      } else if (typeof user.avatar === 'object') {
        const avatarObj = user.avatar as any;
        avatar = {
          ...avatarObj,
          type: 'IMAGE' as const,
        } as AvatarMediaResource;
      }
    }

    return {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
