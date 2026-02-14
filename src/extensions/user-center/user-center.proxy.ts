/**
 * 用户中心代理服务
 *
 * 职责：
 * 1. 作为用户中心的统一入口
 * 2. 根据配置选择合适的用户中心插件
 * 3. 提供用户中心的所有功能
 * 4. 支持健康检查和状态监控
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtensionRegistry } from '../core/extension-registry.service';
import { ExtensionType, ExtensionStatus } from '../core/extension.interface';
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
  DeviceInfo,
  UserCenterCapabilities,
  UserOnlineStatus,
} from './user-center.interface';

/**
 * 用户中心状态
 */
export interface UserCenterStatus {
  /** 是否可用 */
  available: boolean;
  /** 插件ID */
  extensionId?: string;
  /** 插件名称 */
  extensionName?: string;
  /** 插件版本 */
  extensionVersion?: string;
  /** 插件状态 */
  extensionStatus?: ExtensionStatus;
  /** 能力声明 */
  capabilities?: UserCenterCapabilities;
}

/**
 * 用户中心代理服务
 */
@Injectable()
export class UserCenterProxy implements OnModuleInit {
  private readonly logger = new Logger(UserCenterProxy.name);
  private primaryExtension: IUserCenterExtension | null = null;

  constructor(
    private readonly extensionRegistry: ExtensionRegistry,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const primaryId = this.configService.get<string>('USER_CENTER_EXTENSION');

    if (primaryId) {
      const extension = this.extensionRegistry.get(primaryId);
      if (extension && extension.type === ExtensionType.USER_CENTER) {
        this.primaryExtension = extension as IUserCenterExtension;
        this.logger.log(`Using primary user center extension: ${primaryId}`);
      }
    }

    if (!this.primaryExtension) {
      this.primaryExtension = this.extensionRegistry.getPrimary<IUserCenterExtension>(ExtensionType.USER_CENTER);
      if (this.primaryExtension) {
        this.logger.log(`Using default user center extension: ${this.primaryExtension.meta.id}`);
      }
    }

    if (!this.primaryExtension) {
      this.logger.warn('No user center extension available. User authentication will not work.');
    }
  }

  private getExtension(): IUserCenterExtension {
    if (!this.primaryExtension) {
      throw new Error('No user center extension configured');
    }
    return this.primaryExtension;
  }

  /**
   * 获取用户中心状态
   */
  getStatus(): UserCenterStatus {
    if (!this.primaryExtension) {
      return { available: false };
    }

    return {
      available: this.primaryExtension.status === ExtensionStatus.ACTIVE,
      extensionId: this.primaryExtension.meta.id,
      extensionName: this.primaryExtension.meta.name,
      extensionVersion: this.primaryExtension.meta.version,
      extensionStatus: this.primaryExtension.status,
      capabilities: this.primaryExtension.capabilities,
    };
  }

  /**
   * 检查用户中心是否可用
   */
  isAvailable(): boolean {
    return this.primaryExtension?.status === ExtensionStatus.ACTIVE;
  }

  async login(request: LoginRequest): Promise<UserAuthResult> {
    return this.getExtension().login(request);
  }

  async register(request: RegisterRequest): Promise<UserAuthResult> {
    return this.getExtension().register(request);
  }

  async logout(userId: string, deviceInfo?: DeviceInfo): Promise<void> {
    return this.getExtension().logout(userId, deviceInfo);
  }

  async refreshToken(refreshToken: string): Promise<UserAuthResult> {
    return this.getExtension().refreshToken(refreshToken);
  }

  async validateToken(token: string): Promise<UserInfo | null> {
    return this.getExtension().validateToken(token);
  }

  async getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    return this.getExtension().getUserById(userId, options);
  }

  async getUserByUsername(username: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    return this.getExtension().getUserByUsername(username, options);
  }

  async getUsers(userIds: string[], options?: UserQueryOptions): Promise<UserInfo[]> {
    return this.getExtension().getUsers(userIds, options);
  }

  async updateUser(userId: string, data: UserUpdateData): Promise<UserInfo> {
    return this.getExtension().updateUser(userId, data);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.getExtension().deleteUser(userId);
  }

  async searchUsers(keyword: string, limit?: number): Promise<UserInfo[]> {
    return this.getExtension().searchUsers(keyword, limit);
  }

  async changePassword(request: PasswordChangeRequest): Promise<void> {
    return this.getExtension().changePassword(request);
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    return this.getExtension().resetPassword(request);
  }

  async sendVerificationCode(request: VerificationCodeRequest): Promise<void> {
    return this.getExtension().sendVerificationCode(request);
  }

  async verifyCode(request: VerifyCodeRequest): Promise<boolean> {
    return this.getExtension().verifyCode(request);
  }

  async getOnlineStatus(userIds: string[]): Promise<Record<string, UserOnlineStatus>> {
    const extension = this.getExtension();
    if (extension.getOnlineStatus) {
      return extension.getOnlineStatus(userIds);
    }
    const result: Record<string, UserOnlineStatus> = {};
    for (const userId of userIds) {
      result[userId] = 'offline';
    }
    return result;
  }

  async prepareIMConnection(userId: string): Promise<IMConnectionConfig> {
    const extension = this.getExtension();
    if (extension.prepareIMConnection) {
      return extension.prepareIMConnection(userId);
    }
    throw new Error('IM connection preparation not supported');
  }

  async syncUserToIM(userId: string): Promise<string> {
    const extension = this.getExtension();
    if (extension.syncUserToIM) {
      return extension.syncUserToIM(userId);
    }
    throw new Error('User sync to IM not supported');
  }

  getCapabilities(): UserCenterCapabilities {
    return this.getExtension().capabilities;
  }

  getExtensionInfo(): {
    id: string;
    name: string;
    version: string;
    capabilities: UserCenterCapabilities;
  } {
    const extension = this.getExtension();
    return {
      id: extension.meta.id,
      name: extension.meta.name,
      version: extension.meta.version,
      capabilities: extension.capabilities,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, any>;
  }> {
    if (!this.primaryExtension) {
      return {
        healthy: false,
        message: 'No user center extension configured',
      };
    }

    if (this.primaryExtension.status !== ExtensionStatus.ACTIVE) {
      return {
        healthy: false,
        message: `User center extension is not active (status: ${this.primaryExtension.status})`,
        details: {
          extensionId: this.primaryExtension.meta.id,
          status: this.primaryExtension.status,
        },
      };
    }

    if (this.primaryExtension.healthCheck) {
      try {
        const result = await this.primaryExtension.healthCheck();
        return {
          healthy: result.healthy,
          message: result.message,
          details: {
            extensionId: this.primaryExtension.meta.id,
            ...result.details,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          message: `Health check failed: ${(error as Error).message}`,
          details: {
            extensionId: this.primaryExtension.meta.id,
          },
        };
      }
    }

    return {
      healthy: true,
      message: 'User center extension is active',
      details: {
        extensionId: this.primaryExtension.meta.id,
        extensionName: this.primaryExtension.meta.name,
      },
    };
  }
}
