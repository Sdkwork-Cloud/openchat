import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Friend } from './friend.entity';
import { FriendRequest } from './friend-request.entity';
import { FriendManager } from './friend.interface';
import { ContactService } from '../contact/contact.service';
import { ConversationService } from '../conversation/conversation.service';
import { UserService } from '../user/services/user.service';
import {
  BusinessException,
  BusinessErrorCode,
} from '../../common/exceptions/business.exception';
import { CacheService } from '../../common/services/cache.service';
import { buildUserCacheKey, CacheTTL } from '../../common/decorators/cache.decorator';
import { BaseEntityService } from '../../common/base/entity.service';
import { EventBusService } from '../../common/events/event-bus.service';

@Injectable()
export class FriendService extends BaseEntityService<Friend> implements FriendManager {
  protected readonly logger = new Logger(FriendService.name);
  protected readonly entityName = 'Friend';

  constructor(
    protected readonly dataSource: DataSource,
    @InjectRepository(Friend)
    protected readonly repository: Repository<Friend>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    private readonly contactService: ContactService,
    private readonly conversationService: ConversationService,
    private readonly userService: UserService,
    cacheService: CacheService,
    eventBus: EventBusService,
  ) {
    super(dataSource, repository, eventBus, cacheService);
  }

  async sendFriendRequest(
    fromUserId: string,
    toUserId: string,
    message?: string,
  ): Promise<FriendRequest> {
    if (fromUserId === toUserId) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        { customMessage: 'Cannot send friend request to yourself' },
      );
    }

    const isBlocked = await this.checkBlocked(toUserId, fromUserId);
    if (isBlocked) {
      throw new BusinessException(
        BusinessErrorCode.PERMISSION_DENIED,
        { customMessage: 'You have been blocked by this user' },
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const existingFriendship = await manager.findOne(Friend, {
        where: [
          { userId: fromUserId, friendId: toUserId, status: 'accepted' },
          { userId: toUserId, friendId: fromUserId, status: 'accepted' },
        ],
      });

      if (existingFriendship) {
        throw new BusinessException(
          BusinessErrorCode.ALREADY_FRIENDS,
          { customMessage: 'Friendship already exists' },
        );
      }

      const existingRequest = await manager.findOne(FriendRequest, {
        where: { fromUserId, toUserId, status: 'pending' },
      });

      if (existingRequest) {
        throw new BusinessException(
          BusinessErrorCode.FRIEND_REQUEST_PENDING,
          { customMessage: 'Friend request already sent' },
        );
      }

      const reverseRequest = await manager.findOne(FriendRequest, {
        where: { fromUserId: toUserId, toUserId: fromUserId, status: 'pending' },
      });

      if (reverseRequest) return reverseRequest;

      const request = manager.create(FriendRequest, {
        fromUserId,
        toUserId,
        status: 'pending',
        message,
      });

      return manager.save(request);
    });
  }

  async acceptFriendRequest(
    requestId: string,
    currentUserId?: string,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(FriendRequest, {
        where: { id: requestId },
      });

      if (!request || request.status !== 'pending') {
        throw new BusinessException(
          BusinessErrorCode.RESOURCE_NOT_FOUND,
          { customMessage: 'Friend request not found or already processed' },
        );
      }

      if (currentUserId && request.toUserId !== currentUserId) {
        throw new BusinessException(
          BusinessErrorCode.PERMISSION_DENIED,
          { customMessage: 'You do not have permission to accept this request' },
        );
      }

      request.status = 'accepted';
      await manager.save(request);

      const now = new Date();
      const friend1 = manager.create(Friend, {
        userId: request.fromUserId,
        friendId: request.toUserId,
        status: 'accepted',
        acceptedAt: now,
      });

      const friend2 = manager.create(Friend, {
        userId: request.toUserId,
        friendId: request.fromUserId,
        status: 'accepted',
        acceptedAt: now,
      });

      await manager.save([friend1, friend2]);

      await this.invalidateFriendsCache(request.fromUserId);
      await this.invalidateFriendsCache(request.toUserId);

      this.createContactsAndConversations(
        request.fromUserId,
        request.toUserId,
      ).catch((err) => {
        this.logger.error('Failed to create contacts and conversations:', err);
      });

      return true;
    });
  }

  async rejectFriendRequest(requestId: string): Promise<boolean> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request || request.status !== 'pending') {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        { customMessage: 'Friend request not found or already processed' },
      );
    }

    request.status = 'rejected';
    await this.friendRequestRepository.save(request);
    return true;
  }

  async cancelFriendRequest(requestId: string): Promise<boolean> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request || request.status !== 'pending') {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        { customMessage: 'Friend request not found or already processed' },
      );
    }

    await this.friendRequestRepository.delete(requestId);
    return true;
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const result1 = await this.repository.delete({ userId, friendId });
    const result2 = await this.repository.delete({ userId: friendId, friendId: userId });

    const removed = (result1.affected || 0) > 0 || (result2.affected || 0) > 0;

    if (removed) {
      await this.invalidateFriendsCache(userId);
      await this.invalidateFriendsCache(friendId);
    }

    return removed;
  }

  async getFriendRequests(
    userId: string,
    status?: 'pending' | 'accepted' | 'rejected',
  ): Promise<FriendRequest[]> {
    const where: any = { toUserId: userId };
    if (status) where.status = status;
    
    return this.friendRequestRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getFriends(userId: string): Promise<string[]> {
    const cacheKey = buildUserCacheKey(userId, 'friends');

    if (this.cacheService) {
      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const friends = await this.repository.find({
            where: { userId, status: 'accepted' },
            select: ['friendId'],
          });
          return friends.map((friend) => friend.friendId);
        },
        { ttl: CacheTTL.USER_FRIENDS },
      );
    }

    const friends = await this.repository.find({
      where: { userId, status: 'accepted' },
      select: ['friendId'],
    });
    return friends.map((friend) => friend.friendId);
  }

  async getFriendsWithDetails(userId: string): Promise<Friend[]> {
    return this.repository.find({
      where: { userId, status: 'accepted' },
      relations: ['friend'],
    });
  }

  async checkFriendship(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.repository.findOne({
      where: [
        { userId, friendId, status: 'accepted' },
        { userId: friendId, friendId: userId, status: 'accepted' },
      ],
    });
    return !!friendship;
  }

  async blockFriend(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.repository.findOne({
      where: { userId, friendId },
    });

    if (!friendship) {
      const newBlock = this.repository.create({
        userId,
        friendId,
        status: 'blocked',
      });
      await this.repository.save(newBlock);
      await this.invalidateFriendsCache(userId);
      return true;
    }

    friendship.status = 'blocked';
    await this.repository.save(friendship);
    await this.invalidateFriendsCache(userId);
    return true;
  }

  async unblockFriend(userId: string, friendId: string): Promise<boolean> {
    const result = await this.repository.delete({
      userId,
      friendId,
      status: 'blocked',
    });

    if ((result.affected || 0) > 0) {
      await this.invalidateFriendsCache(userId);
      return true;
    }
    return false;
  }

  async getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
    return this.friendRequestRepository.find({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getFriendIds(userId: string): Promise<string[]> {
    return this.getFriends(userId);
  }

  async checkBlocked(userId: string, friendId: string): Promise<boolean> {
    const blocked = await this.repository.findOne({
      where: [
        { userId, friendId, status: 'blocked' },
        { userId: friendId, friendId: userId, status: 'blocked' },
      ],
    });
    return !!blocked;
  }

  async getMutualFriends(userId1: string, userId2: string): Promise<string[]> {
    const friends1 = await this.getFriends(userId1);
    const friends2 = await this.getFriends(userId2);
    return friends1.filter((id) => friends2.includes(id));
  }

  async getFriendsCount(userId: string): Promise<number> {
    return this.repository.count({
      where: { userId, status: 'accepted' },
    });
  }

  private async createContactsAndConversations(
    fromUserId: string,
    toUserId: string,
  ): Promise<void> {
    try {
      const [fromUser, toUser] = await Promise.all([
        this.userService.getUserById(fromUserId),
        this.userService.getUserById(toUserId),
      ]);

      if (!fromUser || !toUser) {
        this.logger.error('Failed to create contact: user info not found');
        return;
      }

      await Promise.all([
        this.contactService
          .createContact({
            userId: fromUserId,
            contactId: toUserId,
            type: 'user',
            source: 'friend',
            name: toUser.nickname || toUser.username,
          })
          .catch((err) => {
            if (!err.message?.includes('已存在')) {
              this.logger.error('Failed to create contact:', err);
            }
          }),
        this.contactService
          .createContact({
            userId: toUserId,
            contactId: fromUserId,
            type: 'user',
            source: 'friend',
            name: fromUser.nickname || fromUser.username,
          })
          .catch((err) => {
            if (!err.message?.includes('已存在')) {
              this.logger.error('Failed to create contact:', err);
            }
          }),
        this.conversationService
          .createConversation({
            type: 'single',
            userId: fromUserId,
            targetId: toUserId,
          })
          .catch((err) => {
            if (!err.message?.includes('已存在')) {
              this.logger.error('Failed to create conversation:', err);
            }
          }),
        this.conversationService
          .createConversation({
            type: 'single',
            userId: toUserId,
            targetId: fromUserId,
          })
          .catch((err) => {
            if (!err.message?.includes('已存在')) {
              this.logger.error('Failed to create conversation:', err);
            }
          }),
      ]);
    } catch (error) {
      this.logger.error('Failed to auto create contact and conversation:', error);
    }
  }

  private async invalidateFriendsCache(userId: string): Promise<void> {
    const cacheKey = buildUserCacheKey(userId, 'friends');
    if (this.cacheService) {
      await this.cacheService.delete(cacheKey);
    }
  }
}
