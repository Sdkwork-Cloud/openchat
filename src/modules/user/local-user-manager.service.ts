import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { UserManager } from './user.interface';
import { UserSyncService } from './user-sync.service';
import { UserCacheService } from '../../common/cache/user-cache.service';

/**
 * 本地用户管理服务
 * 处理用户数据的本地存储和查询
 * 集成多级缓存策略优化性能
 */
@Injectable()
export class LocalUserManagerService implements UserManager {
  private readonly logger = new Logger(LocalUserManagerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Optional() private userSyncService?: UserSyncService,
    @Optional() private userCacheService?: UserCacheService,
  ) {}

  /**
   * 根据ID获取用户（不包含密码）
   * 优先从缓存获取
   */
  async getUserById(id: string): Promise<User | null> {
    // 1. 尝试从缓存获取
    if (this.userCacheService) {
      const cachedUser = await this.userCacheService.getUser(id, async () => {
        return this.userRepository.findOne({
          where: { id, isDeleted: false },
        });
      });
      if (cachedUser) {
        return cachedUser;
      }
    }

    // 2. 从数据库获取
    return this.userRepository.findOne({
      where: { id, isDeleted: false },
    });
  }

  /**
   * 根据用户名获取用户（不包含密码）
   * 由于用户名不是主键，不缓存
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username, isDeleted: false },
    });
  }

  /**
   * 根据用户名获取用户（包含密码，用于认证）
   * 认证场景不缓存密码
   */
  async getUserByUsernameWithPassword(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username, isDeleted: false },
      select: ['id', 'uuid', 'username', 'nickname', 'password', 'avatar', 'status', 'resources', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * 根据ID获取用户（包含密码，用于认证）
   */
  async getUserByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, isDeleted: false },
      select: ['id', 'uuid', 'username', 'nickname', 'password', 'avatar', 'status', 'resources', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * 创建用户
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    // 同步到缓存
    if (this.userCacheService) {
      await this.userCacheService.setUser(savedUser.id, savedUser);
    }

    // 自动同步用户到悟空IM
    if (this.userSyncService) {
      try {
        await this.userSyncService.syncUser(savedUser.id);
      } catch (error: any) {
        // 同步失败不影响用户创建，只记录日志
        this.logger.error(`用户同步到悟空IM失败: ${savedUser.id}, ${error.message}`);
      }
    }

    return savedUser;
  }

  /**
   * 更新用户信息
   * 同时更新缓存
   */
  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }

    Object.assign(user, userData);
    const updatedUser = await this.userRepository.save(user);

    // 更新缓存
    if (this.userCacheService) {
      await this.userCacheService.setUser(id, updatedUser);
    }

    return updatedUser;
  }

  /**
   * 删除用户（软删除）
   * 同时删除缓存
   */
  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    if ((result.affected || 0) > 0) {
      // 删除缓存
      if (this.userCacheService) {
        await this.userCacheService.deleteUser(id);
      }
      return true;
    }

    return false;
  }

  /**
   * 硬删除用户（永久删除）
   */
  async hardDeleteUser(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);

    if ((result.affected || 0) > 0) {
      // 删除缓存
      if (this.userCacheService) {
        await this.userCacheService.deleteUser(id);
      }
      return true;
    }

    return false;
  }

  /**
   * 批量获取用户
   * 使用缓存优化
   */
  async getUsers(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }

    // 使用缓存批量获取
    if (this.userCacheService) {
      const cachedUsers = await this.userCacheService.getUsersBatch(
        ids,
        async (missingIds) => {
          return this.userRepository.find({
            where: { id: In(missingIds), isDeleted: false },
          });
        }
      );
      return Array.from(cachedUsers.values()).filter((user): user is User => user !== null);
    }

    // 直接从数据库获取
    return this.userRepository.find({
      where: { id: In(ids), isDeleted: false },
    });
  }

  /**
   * 更新用户登录信息
   * 同时更新缓存
   */
  async updateLoginInfo(id: string, ip: string): Promise<void> {
    const updateData = {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      status: 'online' as const,
    };

    await this.userRepository.update(id, updateData);

    // 更新缓存中的部分字段
    if (this.userCacheService) {
      await this.userCacheService.updateUserFields(id, updateData);
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(keyword: string, limit: number = 20): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere(
        '(user.username ILIKE :keyword OR user.nickname ILIKE :keyword)',
        { keyword: `%${keyword}%` }
      )
      .take(limit)
      .getMany();
  }

  /**
   * 刷新用户缓存
   * 用于手动刷新缓存数据
   */
  async refreshUserCache(id: string): Promise<void> {
    if (!this.userCacheService) {
      return;
    }

    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (user) {
      await this.userCacheService.setUser(id, user);
      this.logger.debug(`User ${id} cache refreshed`);
    } else {
      await this.userCacheService.deleteUser(id);
      this.logger.debug(`User ${id} cache deleted (user not found)`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { localCacheSize: number; localCacheHitRate: number } | null {
    if (!this.userCacheService) {
      return null;
    }
    return this.userCacheService.getCacheStats();
  }

  /**
   * 获取用户仓库（用于特殊查询）
   */
  getUserRepository(): Repository<User> {
    return this.userRepository;
  }
}
