import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

/**
 * 用户服务
 * 提供用户数据的存储和查询
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  /**
   * 根据ID获取用户（不包含密码）
   */
  async getUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id, isDeleted: false },
    });
  }

  /**
   * 根据用户名获取用户（不包含密码）
   */
  async getUserByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { username, isDeleted: false },
    });
  }

  /**
   * 根据用户名获取用户（包含密码，用于认证）
   */
  async getUserByUsernameWithPassword(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { username, isDeleted: false },
      select: ['id', 'uuid', 'username', 'nickname', 'password', 'avatar', 'status', 'resources', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * 根据ID获取用户（包含密码，用于认证）
   */
  async getUserByIdWithPassword(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id, isDeleted: false },
      select: ['id', 'uuid', 'username', 'nickname', 'password', 'avatar', 'status', 'resources', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * 创建用户
   */
  async createUser(userData: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, userData: Partial<UserEntity>): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    Object.assign(user, userData);
    return this.userRepository.save(user);
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    return (result.affected || 0) > 0;
  }

  /**
   * 批量获取用户
   */
  async getUsers(ids: string[]): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: { id: In(ids), isDeleted: false },
    });
  }

  /**
   * 更新用户登录信息
   */
  async updateLoginInfo(id: string, ip: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      status: 'online',
    });
  }

  /**
   * 搜索用户
   */
  async searchUsers(keyword: string, limit: number = 20): Promise<UserEntity[]> {
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
}
