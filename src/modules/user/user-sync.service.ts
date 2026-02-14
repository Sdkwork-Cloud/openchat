import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { WukongIMService } from '../wukongim/wukongim.service';
import { ConfigService } from '@nestjs/config';

export interface UserSyncOptions {
  skipIfExists?: boolean;
  generateToken?: boolean;
}

@Injectable()
export class UserSyncService implements OnModuleInit {
  private readonly logger = new Logger(UserSyncService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private wukongIMService: WukongIMService,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('im.wukongim.enabled') !== false;
  }

  onModuleInit() {
    if (this.enabled) {
      this.logger.log('用户同步服务已启用');
    } else {
      this.logger.log('用户同步服务已禁用');
    }
  }

  /**
   * 同步用户到悟空IM
   * 在以下场景调用：
   * 1. 用户注册时
   * 2. 用户更新信息时
   * 3. 批量同步历史用户
   */
  async syncUser(userId: string, options: UserSyncOptions = {}): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`用户同步已禁用，跳过同步: ${userId}`);
      return true;
    }

    try {
      // 获取用户完整信息
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        this.logger.error(`用户不存在: ${userId}`);
        return false;
      }

      // 创建或更新用户到悟空IM
      await this.wukongIMService.createOrUpdateUser({
        uid: user.id,
        name: user.username || user.nickname || user.id,
        avatar: typeof user.avatar === 'string' ? user.avatar : undefined,
      });

      this.logger.log(`用户同步成功: ${userId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`用户同步失败: ${userId}, ${error.message}`);
      return false;
    }
  }

  /**
   * 批量同步用户
   */
  async syncUsers(userIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    if (!this.enabled) {
      return { success: 0, failed: 0, errors: ['Sync disabled'] };
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      const result = await this.syncUser(userId);
      if (result) {
        success++;
      } else {
        failed++;
        errors.push(`Failed to sync user: ${userId}`);
      }
    }

    this.logger.log(`批量同步完成: 成功 ${success}, 失败 ${failed}`);
    return { success, failed, errors };
  }

  /**
   * 同步所有未同步的用户
   */
  async syncAllUnsyncedUsers(batchSize: number = 100): Promise<{
    total: number;
    success: number;
    failed: number;
  }> {
    if (!this.enabled) {
      return { total: 0, success: 0, failed: 0 };
    }

    // 这里可以通过标记位查询未同步的用户
    // 简化实现：同步所有用户
    const users = await this.userRepository.find({
      select: ['id'],
    });

    const userIds = users.map(u => u.id);
    const result = await this.syncUsers(userIds);

    return {
      total: userIds.length,
      success: result.success,
      failed: result.failed,
    };
  }

  /**
   * 获取用户在悟空IM的Token
   */
  async getUserToken(userId: string): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const token = await this.wukongIMService.getUserToken(userId);
      return token;
    } catch (error: any) {
      this.logger.error(`获取用户Token失败: ${userId}, ${error.message}`);
      return null;
    }
  }

  /**
   * 准备用户的IM连接配置
   * 返回给客户端使用
   */
  async prepareUserConnection(userId: string): Promise<{
    enabled: boolean;
    config?: {
      tcpAddr: string;
      wsUrl: string;
      apiUrl: string;
      uid: string;
      token: string;
    };
    error?: string;
  }> {
    if (!this.enabled) {
      return { enabled: false };
    }

    try {
      // 确保用户已同步
      await this.syncUser(userId);

      // 获取用户Token
      const token = await this.getUserToken(userId);

      if (!token) {
        return { enabled: true, error: 'Failed to generate token' };
      }

      // 获取连接配置
      const config = this.wukongIMService.getConnectionConfig(userId);

      return {
        enabled: true,
        config: {
          ...config,
          token,
        },
      };
    } catch (error: any) {
      this.logger.error(`准备用户连接失败: ${userId}, ${error.message}`);
      return { enabled: true, error: error.message };
    }
  }

  // ==================== 生命周期钩子方法 ====================

  /**
   * 用户注册时同步
   * 由 AuthService 调用
   */
  async syncUserOnRegister(user: UserEntity): Promise<boolean> {
    this.logger.log(`用户注册同步: ${user.id}`);
    return this.syncUser(user.id, { skipIfExists: false });
  }

  /**
   * 用户登录时同步
   * 由 AuthService 调用
   */
  async syncUserOnLogin(userId: string): Promise<boolean> {
    this.logger.debug(`用户登录同步: ${userId}`);
    // 登录时可以选择不同步，或者只更新在线状态
    return this.syncUser(userId, { skipIfExists: true });
  }

  /**
   * 用户更新时同步
   * 由 UserController 调用
   */
  async syncUserOnUpdate(userId: string, userData: Partial<UserEntity>): Promise<boolean> {
    this.logger.log(`用户更新同步: ${userId}`);
    return this.syncUser(userId, { skipIfExists: false });
  }

  /**
   * 用户删除时同步
   * 由 UserController 调用
   * 注意：悟空IM没有删除用户的API，这里可以记录日志或做其他处理
   */
  async syncUserOnDelete(userId: string): Promise<boolean> {
    this.logger.log(`用户删除同步: ${userId}`);
    // 悟空IM没有删除用户的API，可以选择禁用用户或其他方式
    // 这里仅记录日志
    return true;
  }
}
