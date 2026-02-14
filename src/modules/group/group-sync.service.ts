import { Injectable, Logger } from '@nestjs/common';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { WukongIMService } from '../wukongim/wukongim.service';
import { WukongIMChannelType } from '../wukongim/wukongim.constants';

@Injectable()
export class GroupSyncService {
  private readonly logger = new Logger(GroupSyncService.name);

  constructor(
    private wukongIMService: WukongIMService,
  ) {}

  async syncGroupOnCreate(group: Group): Promise<void> {
    try {
      this.logger.log(`Syncing group to WukongIM on create: ${group.id}`);

      await this.wukongIMService.createChannel({
        channelId: group.id,
        channelType: WukongIMChannelType.GROUP,
        name: group.name,
        avatar: typeof group.avatar === 'string' ? group.avatar : undefined,
      });

      this.logger.log(`Group synced to WukongIM successfully: ${group.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync group to WukongIM on create: ${group.id}`, error);
    }
  }

  async syncGroupOnUpdate(group: Group): Promise<void> {
    try {
      this.logger.log(`Syncing group to WukongIM on update: ${group.id}`);

      await this.wukongIMService.createChannel({
        channelId: group.id,
        channelType: WukongIMChannelType.GROUP,
        name: group.name,
        avatar: typeof group.avatar === 'string' ? group.avatar : undefined,
      });

      this.logger.log(`Group update synced to WukongIM successfully: ${group.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync group update to WukongIM: ${group.id}`, error);
    }
  }

  async syncGroupOnDelete(groupId: string): Promise<void> {
    try {
      this.logger.log(`Syncing group to WukongIM on delete: ${groupId}`);

      await this.wukongIMService.deleteChannel(groupId, WukongIMChannelType.GROUP);

      this.logger.log(`Group delete synced to WukongIM successfully: ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to sync group delete to WukongIM: ${groupId}`, error);
    }
  }

  async syncMemberOnJoin(groupId: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Syncing member join to WukongIM: ${userId} -> ${groupId}`);

      await this.wukongIMService.addSubscribers(groupId, WukongIMChannelType.GROUP, [userId]);

      this.logger.log(`Member join synced to WukongIM successfully: ${userId} -> ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to sync member join to WukongIM: ${userId} -> ${groupId}`, error);
    }
  }

  async syncMemberOnLeave(groupId: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Syncing member leave to WukongIM: ${userId} -> ${groupId}`);

      await this.wukongIMService.removeSubscribers(groupId, WukongIMChannelType.GROUP, [userId]);

      this.logger.log(`Member leave synced to WukongIM successfully: ${userId} -> ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to sync member leave to WukongIM: ${userId} -> ${groupId}`, error);
    }
  }

  async batchSyncMembers(groupId: string, members: GroupMember[]): Promise<void> {
    const userIds = members.map(m => m.userId);
    try {
      this.logger.log(`Batch syncing ${userIds.length} members to WukongIM: ${groupId}`);
      await this.wukongIMService.addSubscribers(groupId, WukongIMChannelType.GROUP, userIds);
      this.logger.log(`Batch sync completed: ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to batch sync members to WukongIM: ${groupId}`, error);
    }
  }
}
