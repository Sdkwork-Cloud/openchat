import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from './friend.entity';
import { FriendRequest } from './friend-request.entity';
import { FriendManager } from './friend.interface';
import { ContactService } from '../contact/contact.service';
import { ConversationService } from '../conversation/conversation.service';
import { UserService } from '../user/services/user.service';

@Injectable()
export class FriendService implements FriendManager {
  constructor(
    @InjectRepository(Friend)
    private friendRepository: Repository<Friend>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    private contactService: ContactService,
    private conversationService: ConversationService,
    private userService: UserService,
  ) {}

  async sendFriendRequest(fromUserId: string, toUserId: string, message?: string): Promise<FriendRequest> {
    // 检查是否已经存在好友关系
    const existingFriendship = await this.friendRepository.findOne({
      where: [
        { userId: fromUserId, friendId: toUserId, status: 'accepted' },
        { userId: toUserId, friendId: fromUserId, status: 'accepted' },
      ],
    });
    if (existingFriendship) {
      throw new Error('Friendship already exists');
    }

    // 检查是否已经存在待处理的请求（正向）
    const existingRequest = await this.friendRequestRepository.findOne({
      where: { fromUserId, toUserId, status: 'pending' },
    });
    if (existingRequest) {
      throw new Error('Friend request already sent');
    }

    // 检查是否已经存在反向的待处理请求
    const reverseRequest = await this.friendRequestRepository.findOne({
      where: { fromUserId: toUserId, toUserId: fromUserId, status: 'pending' },
    });
    if (reverseRequest) {
      // 如果存在反向请求，自动接受
      await this.acceptFriendRequest(reverseRequest.id, fromUserId);
      // 返回反向请求作为结果
      return reverseRequest;
    }

    const request = this.friendRequestRepository.create({
      fromUserId,
      toUserId,
      status: 'pending',
      message,
    });
    return this.friendRequestRepository.save(request);
  }

  async acceptFriendRequest(requestId: string, currentUserId?: string): Promise<boolean> {
    const request = await this.friendRequestRepository.findOne({ where: { id: requestId } });
    if (!request || request.status !== 'pending') {
      return false;
    }

    // 验证权限：只有请求接收者可以接受请求
    if (currentUserId && request.toUserId !== currentUserId) {
      throw new Error('You do not have permission to accept this request');
    }

    // 更新请求状态
    request.status = 'accepted';
    await this.friendRequestRepository.save(request);

    // 创建双向好友关系
    const now = new Date();
    const friend1 = this.friendRepository.create({
      userId: request.fromUserId,
      friendId: request.toUserId,
      status: 'accepted',
      acceptedAt: now,
    });

    const friend2 = this.friendRepository.create({
      userId: request.toUserId,
      friendId: request.fromUserId,
      status: 'accepted',
      acceptedAt: now,
    });

    await this.friendRepository.save([friend1, friend2]);

    // 自动创建联系人和会话
    await this.createContactsAndConversations(request.fromUserId, request.toUserId);

    return true;
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
        console.error('创建联系人失败：用户信息不存在');
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
          console.error('创建联系人失败:', err);
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
          console.error('创建联系人失败:', err);
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
          console.error('创建会话失败:', err);
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
          console.error('创建会话失败:', err);
        }
      });
    } catch (error) {
      console.error('自动创建联系人和会话失败:', error);
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