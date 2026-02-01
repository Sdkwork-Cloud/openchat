import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMember } from './group-member.entity';
import { WukongIMAdapter, WukongIMChannelType } from '../im-provider/wukongim.adapter';

/**
 * 群组成员状态
 */
export type GroupMemberStatus = 'joined' | 'kicked' | 'banned';

/**
 * 群组黑名单服务
 * 负责管理群组的黑白名单，并同步到悟空IM
 */
@Injectable()
export class GroupBlacklistService {
  private readonly logger = new Logger(GroupBlacklistService.name);

  constructor(
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    private wukongIMAdapter: WukongIMAdapter,
  ) {}

  /**
   * 将用户加入群组黑名单
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async addUserToBlacklist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Adding user ${userId} to group ${groupId} blacklist`);

      // 1. 更新本地数据库中的成员状态
      const member = await this.groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (member) {
        member.status = 'banned' as any;
        await this.groupMemberRepository.save(member);
      }

      // 2. 同步到悟空IM Channel黑名单
      await this.wukongIMAdapter.addUserToChannelBlacklist(
        groupId,
        WukongIMChannelType.GROUP,
        userId,
      );

      this.logger.log(`User ${userId} added to group ${groupId} blacklist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to group ${groupId} blacklist`, error);
      return false;
    }
  }

  /**
   * 将用户从群组黑名单移除
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async removeUserFromBlacklist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Removing user ${userId} from group ${groupId} blacklist`);

      // 1. 更新本地数据库中的成员状态
      const member = await this.groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (member) {
        member.status = 'joined' as any;
        await this.groupMemberRepository.save(member);
      }

      // 2. 同步到悟空IM Channel黑名单
      await this.wukongIMAdapter.removeUserFromChannelBlacklist(
        groupId,
        WukongIMChannelType.GROUP,
        userId,
      );

      this.logger.log(`User ${userId} removed from group ${groupId} blacklist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from group ${groupId} blacklist`, error);
      return false;
    }
  }

  /**
   * 获取群组黑名单列表
   * @param groupId 群组ID
   */
  async getBlacklist(groupId: string): Promise<string[]> {
    try {
      // 从悟空IM获取黑名单列表
      const blacklist = await this.wukongIMAdapter.getChannelBlacklist(
        groupId,
        WukongIMChannelType.GROUP,
      );
      return blacklist;
    } catch (error) {
      this.logger.error(`Failed to get group ${groupId} blacklist`, error);
      return [];
    }
  }

  /**
   * 将用户加入群组白名单
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async addUserToWhitelist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Adding user ${userId} to group ${groupId} whitelist`);

      // 同步到悟空IM Channel白名单
      await this.wukongIMAdapter.addUserToChannelWhitelist(
        groupId,
        WukongIMChannelType.GROUP,
        userId,
      );

      this.logger.log(`User ${userId} added to group ${groupId} whitelist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to group ${groupId} whitelist`, error);
      return false;
    }
  }

  /**
   * 将用户从群组白名单移除
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async removeUserFromWhitelist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Removing user ${userId} from group ${groupId} whitelist`);

      // 同步到悟空IM Channel白名单
      await this.wukongIMAdapter.removeUserFromChannelWhitelist(
        groupId,
        WukongIMChannelType.GROUP,
        userId,
      );

      this.logger.log(`User ${userId} removed from group ${groupId} whitelist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from group ${groupId} whitelist`, error);
      return false;
    }
  }

  /**
   * 获取群组白名单列表
   * @param groupId 群组ID
   */
  async getWhitelist(groupId: string): Promise<string[]> {
    try {
      // 从悟空IM获取白名单列表
      const whitelist = await this.wukongIMAdapter.getChannelWhitelist(
        groupId,
        WukongIMChannelType.GROUP,
      );
      return whitelist;
    } catch (error) {
      this.logger.error(`Failed to get group ${groupId} whitelist`, error);
      return [];
    }
  }

  /**
   * 设置群组黑白名单模式
   * @param groupId 群组ID
   * @param mode 模式：0=关闭，1=黑名单，2=白名单
   */
  async setBlacklistMode(groupId: string, mode: 0 | 1 | 2): Promise<boolean> {
    try {
      this.logger.log(`Setting group ${groupId} blacklist mode to ${mode}`);

      // 同步到悟空IM
      await this.wukongIMAdapter.setChannelBlacklistMode(
        groupId,
        WukongIMChannelType.GROUP,
        mode,
      );

      this.logger.log(`Group ${groupId} blacklist mode set successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set group ${groupId} blacklist mode`, error);
      return false;
    }
  }

  /**
   * 检查用户是否在群组黑名单中
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async isUserBlacklisted(groupId: string, userId: string): Promise<boolean> {
    try {
      const blacklist = await this.getBlacklist(groupId);
      return blacklist.includes(userId);
    } catch (error) {
      this.logger.error(`Failed to check if user ${userId} is blacklisted in group ${groupId}`, error);
      return false;
    }
  }

  /**
   * 踢出群组成员（加入黑名单并移除成员身份）
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async kickMember(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Kicking user ${userId} from group ${groupId}`);

      // 1. 从本地数据库移除成员
      await this.groupMemberRepository.delete({ groupId, userId });

      // 2. 从悟空IM频道移除订阅者
      await this.wukongIMAdapter.removeUserFromChannel(
        groupId,
        WukongIMChannelType.GROUP,
        userId,
      );

      // 3. 添加到黑名单（防止再次加入）
      await this.addUserToBlacklist(groupId, userId);

      this.logger.log(`User ${userId} kicked from group ${groupId} successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to kick user ${userId} from group ${groupId}`, error);
      return false;
    }
  }
}
