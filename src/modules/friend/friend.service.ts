import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Friend } from './friend.entity';
import { FriendRequest } from './friend-request.entity';
import { FriendManager } from './friend.interface';
import { ContactService } from '../contact/contact.service';
import { ConversationService } from '../conversation/conversation.service';
import { UserService } from '../user/services/user.service';

@Injectable()
export class FriendService implements FriendManager {
  private readonly logger = new Logger(FriendService.name);

  constructor(
    @InjectRepository(Friend)
    private friendRepository: Repository<Friend>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    private contactService: ContactService,
    private conversationService: ConversationService,
    private userService: UserService,
    private dataSource: DataSource,
  ) {}

  async sendFriendRequest(fromUserId: string, toUserId: string, message?: string): Promise<FriendRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingFriendship = await queryRunner.manager.findOne(Friend, {
        where: [
          { userId: fromUserId, friendId: toUserId, status: 'accepted' },
          { userId: toUserId, friendId: fromUserId, status: 'accepted' },
        ],
      });
      if (existingFriendship) {
        throw new Error('Friendship already exists');
      }

      const existingRequest = await queryRunner.manager.findOne(FriendRequest, {
        where: { fromUserId, toUserId, status: 'pending' },
      });
      if (existingRequest) {
        throw new Error('Friend request already sent');
      }

      const reverseRequest = await queryRunner.manager.findOne(FriendRequest, {
        where: { fromUserId: toUserId, toUserId: fromUserId, status: 'pending' },
      });
      if (reverseRequest) {
        await queryRunner.commitTransaction();
        return reverseRequest;
      }

      const request = queryRunner.manager.create(FriendRequest, {
        fromUserId,
        toUserId,
        status: 'pending',
        message,
      });
      const savedRequest = await queryRunner.manager.save(request);
      await queryRunner.commitTransaction();
      return savedRequest;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async acceptFriendRequest(requestId: string, currentUserId?: string): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(FriendRequest, { where: { id: requestId } });
      if (!request || request.status !== 'pending') {
        await queryRunner.commitTransaction();
        return false;
      }

      if (currentUserId && request.toUserId !== currentUserId) {
        throw new Error('You do not have permission to accept this request');
      }

      request.status = 'accepted';
      await queryRunner.manager.save(request);

      const now = new Date();
      const friend1 = queryRunner.manager.create(Friend, {
        userId: request.fromUserId,
        friendId: request.toUserId,
        status: 'accepted',
        acceptedAt: now,
      });

      const friend2 = queryRunner.manager.create(Friend, {
        userId: request.toUserId,
        friendId: request.fromUserId,
        status: 'accepted',
        acceptedAt: now,
      });

      await queryRunner.manager.save([friend1, friend2]);
      await queryRunner.commitTransaction();

      this.createContactsAndConversations(request.fromUserId, request.toUserId).catch(err => {
        this.logger.error('Failed to create contacts and conversations:', err);
      });

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 自动创建联系人和会话
   */
  private async createContactsAndConversations(fromUserId: string, toUserId: string): Promise<void> {
    try {
      // 获取双方用户信息
      const [fromUser, toUser] = await Promise.all([
        this.userService.getUserById(fromUserId),
        this.userService.getUserById(toUserId),
      ]);

      if (!fromUser || !toUser) {
        this.logger.error('Failed to create contact: user info not found');
        return;
      }

      // 为发送者创建联系人（指向接收者）
      await this.contactService.createContact({
        userId: fromUserId,
        contactId: toUserId,
        type: 'user',
        source: 'friend',
        name: toUser.nickname || toUser.username,
      }).catch(err => {
        // 如果联系人已存在，忽略错误
        if (!err.message?.includes('已存在')) {
          this.logger.error('Failed to create contact:', err);
        }
      });

      // 为接收者创建联系人（指向发送者）
      await this.contactService.createContact({
        userId: toUserId,
        contactId: fromUserId,
        type: 'user',
        source: 'friend',
        name: fromUser.nickname || fromUser.username,
      }).catch(err => {
        // 如果联系人已存在，忽略错误
        if (!err.message?.includes('已存在')) {
          this.logger.error('Failed to create contact:', err);
        }
      });

      // 为发送者创建会话
      await this.conversationService.createConversation({
        type: 'single',
        userId: fromUserId,
        targetId: toUserId,
      }).catch(err => {
        // 如果会话已存在，忽略错误
        if (!err.message?.includes('已存在')) {
          this.logger.error('Failed to create conversation:', err);
        }
      });

      // 为接收者创建会话
      await this.conversationService.createConversation({
        type: 'single',
        userId: toUserId,
        targetId: fromUserId,
      }).catch(err => {
        // 如果会话已存在，忽略错误
        if (!err.message?.includes('已存在')) {
          this.logger.error('Failed to create conversation:', err);
        }
      });
    } catch (error) {
      this.logger.error('Failed to auto create contact and conversation:', error);
    }
  }

  async rejectFriendRequest(requestId: string): Promise<boolean> {
    const request = await this.friendRequestRepository.findOne({ where: { id: requestId } });
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'rejected';
    await this.friendRequestRepository.save(request);

    return true;
  }

  async cancelFriendRequest(requestId: string): Promise<boolean> {
    const request = await this.friendRequestRepository.findOne({ where: { id: requestId } });
    if (!request || request.status !== 'pending') {
      return false;
    }

    await this.friendRequestRepository.delete(requestId);
    return true;
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const result1 = await this.friendRepository.delete({
      userId,
      friendId,
    });

    const result2 = await this.friendRepository.delete({
      userId: friendId,
      friendId: userId,
    });

    return (result1.affected || 0) > 0 || (result2.affected || 0) > 0;
  }

  async getFriendRequests(userId: string, status?: 'pending' | 'accepted' | 'rejected'): Promise<FriendRequest[]> {
    const where: any = { toUserId: userId };
    if (status) {
      where.status = status;
    }
    return this.friendRequestRepository.find({ where });
  }

  async getFriends(userId: string): Promise<string[]> {
    const friends = await this.friendRepository.find({
      where: { userId, status: 'accepted' },
    });
    return friends.map(friend => friend.friendId);
  }

  async checkFriendship(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.friendRepository.findOne({
      where: [
        { userId, friendId, status: 'accepted' },
        { userId: friendId, friendId: userId, status: 'accepted' },
      ],
    });
    return !!friendship;
  }

  /**
   * 拉黑好友
   */
  async blockFriend(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.friendRepository.findOne({
      where: { userId, friendId },
    });

    if (!friendship) {
      // 如果不存在好友关系，创建一个新的block记录
      const newBlock = this.friendRepository.create({
        userId,
        friendId,
        status: 'blocked',
      });
      await this.friendRepository.save(newBlock);
      return true;
    }

    friendship.status = 'blocked';
    await this.friendRepository.save(friendship);
    return true;
  }

  /**
   * 取消拉黑
   */
  async unblockFriend(userId: string, friendId: string): Promise<boolean> {
    const result = await this.friendRepository.delete({
      userId,
      friendId,
      status: 'blocked',
    });

    return (result.affected || 0) > 0;
  }

  /**
   * 获取发送的好友请求列表
   */
  async getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取好友ID列表（仅accepted状态）
   */
  async getFriendIds(userId: string): Promise<string[]> {
    const friends = await this.friendRepository.find({
      where: { userId, status: 'accepted' },
    });
    return friends.map(friend => friend.friendId);
  }

  /**
   * 检查是否被拉黑
   */
  async checkBlocked(userId: string, friendId: string): Promise<boolean> {
    const blocked = await this.friendRepository.findOne({
      where: { userId, friendId, status: 'blocked' },
    });
    return !!blocked;
  }
}