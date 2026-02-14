import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMember } from './group-member.entity';
import { WukongIMService } from '../wukongim/wukongim.service';
import { WukongIMChannelType } from '../wukongim/wukongim.constants';

export type GroupMemberStatus = 'joined' | 'kicked' | 'banned';

@Injectable()
export class GroupBlacklistService {
  private readonly logger = new Logger(GroupBlacklistService.name);

  constructor(
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    private wukongIMService: WukongIMService,
  ) {}

  async addUserToBlacklist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Adding user ${userId} to group ${groupId} blacklist`);

      const member = await this.groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (member) {
        member.status = 'banned' as any;
        await this.groupMemberRepository.save(member);
      }

      await this.wukongIMService.addToBlacklist(
        groupId,
        WukongIMChannelType.GROUP,
        [userId],
      );

      this.logger.log(`User ${userId} added to group ${groupId} blacklist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to group ${groupId} blacklist`, error);
      return false;
    }
  }

  async removeUserFromBlacklist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Removing user ${userId} from group ${groupId} blacklist`);

      const member = await this.groupMemberRepository.findOne({
        where: { groupId, userId },
      });

      if (member) {
        member.status = 'joined' as any;
        await this.groupMemberRepository.save(member);
      }

      await this.wukongIMService.removeFromBlacklist(
        groupId,
        WukongIMChannelType.GROUP,
        [userId],
      );

      this.logger.log(`User ${userId} removed from group ${groupId} blacklist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from group ${groupId} blacklist`, error);
      return false;
    }
  }

  async getBlacklist(groupId: string): Promise<string[]> {
    try {
      return await this.wukongIMService.getBlacklist(groupId, WukongIMChannelType.GROUP);
    } catch (error) {
      this.logger.error(`Failed to get group ${groupId} blacklist`, error);
      return [];
    }
  }

  async addUserToWhitelist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Adding user ${userId} to group ${groupId} whitelist`);

      await this.wukongIMService.addToWhitelist(
        groupId,
        WukongIMChannelType.GROUP,
        [userId],
      );

      this.logger.log(`User ${userId} added to group ${groupId} whitelist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to group ${groupId} whitelist`, error);
      return false;
    }
  }

  async removeUserFromWhitelist(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Removing user ${userId} from group ${groupId} whitelist`);

      await this.wukongIMService.removeFromWhitelist(
        groupId,
        WukongIMChannelType.GROUP,
        [userId],
      );

      this.logger.log(`User ${userId} removed from group ${groupId} whitelist successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from group ${groupId} whitelist`, error);
      return false;
    }
  }

  async getWhitelist(groupId: string): Promise<string[]> {
    try {
      return await this.wukongIMService.getWhitelist(groupId, WukongIMChannelType.GROUP);
    } catch (error) {
      this.logger.error(`Failed to get group ${groupId} whitelist`, error);
      return [];
    }
  }

  async setBlacklistMode(groupId: string, mode: 0 | 1 | 2): Promise<boolean> {
    try {
      this.logger.log(`Setting group ${groupId} blacklist mode to ${mode}`);

      await this.wukongIMService.setBlacklistMode(
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

  async isUserBlacklisted(groupId: string, userId: string): Promise<boolean> {
    try {
      const blacklist = await this.getBlacklist(groupId);
      return blacklist.includes(userId);
    } catch (error) {
      this.logger.error(`Failed to check if user ${userId} is blacklisted in group ${groupId}`, error);
      return false;
    }
  }

  async kickMember(groupId: string, userId: string): Promise<boolean> {
    try {
      this.logger.log(`Kicking user ${userId} from group ${groupId}`);

      await this.groupMemberRepository.delete({ groupId, userId });

      await this.wukongIMService.removeSubscribers(
        groupId,
        WukongIMChannelType.GROUP,
        [userId],
      );

      await this.addUserToBlacklist(groupId, userId);

      this.logger.log(`User ${userId} kicked from group ${groupId} successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to kick user ${userId} from group ${groupId}`, error);
      return false;
    }
  }
}
