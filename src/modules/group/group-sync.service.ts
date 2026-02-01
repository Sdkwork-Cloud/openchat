import { Injectable, Logger } from '@nestjs/common';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { WukongIMAdapter, WukongIMChannelType } from '../im-provider/wukongim.adapter';

/**
 * 群组同步服务
 * 负责将群组数据同步到悟空IM的Channel
 * 确保群组创建、成员变更、删除时IM系统状态一致
 */
@Injectable()
export class GroupSyncService {
  private readonly logger = new Logger(GroupSyncService.name);

  constructor(
    private wukongIMAdapter: WukongIMAdapter,
  ) {}

  /**
   * 群组创建时同步到悟空IM
   * @param group 群组信息
   */
  async syncGroupOnCreate(group: Group): Promise<void> {
    try {
      this.logger.log(`Syncing group to WukongIM on create: ${group.id}`);

      // 在悟空IM中创建频道（群组）
      await this.wukongIMAdapter.createOrUpdateChannel({
        channel_id: group.id,
        channel_type: WukongIMChannelType.GROUP,
        name: group.name,
        avatar: typeof group.avatar === 'string' ? group.avatar : undefined,
      });

      this.logger.log(`Group synced to WukongIM successfully: ${group.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync group to WukongIM on create: ${group.id}`, error);
      // 记录错误但不影响创建流程
    }
  }

  /**
   * 群组更新时同步到悟空IM
   * @param group 群组信息
   */
  async syncGroupOnUpdate(group: Group): Promise<void> {
    try {
      this.logger.log(`Syncing group to WukongIM on update: ${group.id}`);

      // 在悟空IM中更新频道信息
      await this.wukongIMAdapter.createOrUpdateChannel({
        channel_id: group.id,
        channel_type: WukongIMChannelType.GROUP,
        name: group.name,
        avatar: typeof group.avatar === 'string' ? group.avatar : undefined,
      });

      this.logger.log(`Group update synced to WukongIM successfully: ${group.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync group update to WukongIM: ${group.id}`, error);
    }
  }

  /**
   * 群组删除时同步到悟空IM
   * @param groupId 群组ID
   */
  async syncGroupOnDelete(groupId: string): Promise<void> {
    try {
      this.logger.log(`Syncing group to WukongIM on delete: ${groupId}`);

      // 在悟空IM中删除频道
      await this.wukongIMAdapter.deleteChannel(groupId, WukongIMChannelType.GROUP);

      this.logger.log(`Group delete synced to WukongIM successfully: ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to sync group delete to WukongIM: ${groupId}`, error);
    }
  }

  /**
   * 成员加入时同步到悟空IM
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async syncMemberOnJoin(groupId: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Syncing member join to WukongIM: ${userId} -> ${groupId}`);

      // 在悟空IM中添加用户到频道
      await this.wukongIMAdapter.addUserToChannel(groupId, WukongIMChannelType.GROUP, userId);

      this.logger.log(`Member join synced to WukongIM successfully: ${userId} -> ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to sync member join to WukongIM: ${userId} -> ${groupId}`, error);
    }
  }

  /**
   * 成员离开时同步到悟空IM
   * @param groupId 群组ID
   * @param userId 用户ID
   */
  async syncMemberOnLeave(groupId: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Syncing member leave to WukongIM: ${userId} -> ${groupId}`);

      // 在悟空IM中从频道移除用户
      await this.wukongIMAdapter.removeUserFromChannel(groupId, WukongIMChannelType.GROUP, userId);

      this.logger.log(`Member leave synced to WukongIM successfully: ${userId} -> ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to sync member leave to WukongIM: ${userId} -> ${groupId}`, error);
    }
  }

  /**
   * 批量同步群组成员到悟空IM
   * @param groupId 群组ID
   * @param members 成员列表
   */
  async batchSyncMembers(groupId: string, members: GroupMember[]): Promise<void> {
    for (const member of members) {
      await this.syncMemberOnJoin(groupId, member.userId);
    }
  }
}
