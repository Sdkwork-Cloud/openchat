import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Friend } from '../friend/friend.entity';
import { GroupMember } from '../group/group-member.entity';

/**
 * 消息过滤结果
 */
export interface MessageFilterResult {
  allowed: boolean;
  reason?: string;
}

/**
 * 消息过滤服务
 * 负责检查消息发送的黑白名单、权限等
 */
@Injectable()
export class MessageFilterService {
  private readonly logger = new Logger(MessageFilterService.name);

  constructor(
    @InjectRepository(Friend)
    private friendRepository: Repository<Friend>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
  ) {}

  /**
   * 检查单聊消息是否可以发送
   * @param fromUserId 发送者ID
   * @param toUserId 接收者ID
   */
  async checkSingleMessagePermission(fromUserId: string, toUserId: string): Promise<MessageFilterResult> {
    // 1. 检查发送者是否被接收者拉黑
    const isBlockedByReceiver = await this.checkIsBlocked(toUserId, fromUserId);
    if (isBlockedByReceiver) {
      return {
        allowed: false,
        reason: '您已被对方拉黑，无法发送消息',
      };
    }

    // 2. 检查接收者是否被发送者拉黑
    const isBlockedBySender = await this.checkIsBlocked(fromUserId, toUserId);
    if (isBlockedBySender) {
      return {
        allowed: false,
        reason: '您已拉黑对方，无法发送消息',
      };
    }

    // 3. 检查是否为好友关系（可选，根据业务需求）
    // 如果需要强制好友才能聊天，取消下面的注释
    /*
    const isFriend = await this.checkIsFriend(fromUserId, toUserId);
    if (!isFriend) {
      return {
        allowed: false,
        reason: '对方不是您的好友，无法发送消息',
      };
    }
    */

    return { allowed: true };
  }

  /**
   * 检查群聊消息是否可以发送
   * @param userId 发送者ID
   * @param groupId 群组ID
   */
  async checkGroupMessagePermission(userId: string, groupId: string): Promise<MessageFilterResult> {
    // 1. 检查用户是否在群组中
    const member = await this.groupMemberRepository.findOne({
      where: {
        groupId,
        userId,
        status: 'joined',
      },
    });

    if (!member) {
      return {
        allowed: false,
        reason: '您不在该群组中，无法发送消息',
      };
    }

    // 2. 检查用户是否被禁言（可以扩展）
    // TODO: 添加禁言功能

    return { allowed: true };
  }

  /**
   * 检查用户是否被拉黑
   * @param userId 用户ID
   * @param targetId 目标用户ID
   */
  private async checkIsBlocked(userId: string, targetId: string): Promise<boolean> {
    const blocked = await this.friendRepository.findOne({
      where: {
        userId,
        friendId: targetId,
        status: 'blocked',
      },
    });
    return !!blocked;
  }

  /**
   * 检查是否为好友关系
   * @param userId1 用户1
   * @param userId2 用户2
   */
  private async checkIsFriend(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendRepository.findOne({
      where: {
        userId: userId1,
        friendId: userId2,
        status: 'accepted',
      },
    });
    return !!friendship;
  }

  /**
   * 获取用户的黑名单列表
   * @param userId 用户ID
   */
  async getUserBlacklist(userId: string): Promise<string[]> {
    const blockedList = await this.friendRepository.find({
      where: {
        userId,
        status: 'blocked',
      },
    });
    return blockedList.map(item => item.friendId);
  }

  /**
   * 检查用户是否在黑名单中
   * @param userId 用户ID
   * @param blacklistedUserId 被检查的用户ID
   */
  async isInBlacklist(userId: string, blacklistedUserId: string): Promise<boolean> {
    return this.checkIsBlocked(userId, blacklistedUserId);
  }

  /**
   * 批量检查黑名单
   * @param userId 用户ID
   * @param userIds 待检查的用户ID列表
   */
  async batchCheckBlacklist(userId: string, userIds: string[]): Promise<Map<string, boolean>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const blockedList = await this.friendRepository.find({
      where: {
        userId,
        friendId: In(userIds),
        status: 'blocked',
      },
      select: ['friendId'],
    });

    const blockedSet = new Set(blockedList.map(item => item.friendId));
    const result = new Map<string, boolean>();

    for (const targetId of userIds) {
      result.set(targetId, blockedSet.has(targetId));
    }

    return result;
  }
}
