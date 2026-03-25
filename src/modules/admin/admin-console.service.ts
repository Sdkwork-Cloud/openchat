import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLogEntity } from '../../common/entities/audit-log.entity';
import { AuditLogService } from '../../common/services/audit-log.service';
import { ConfigCenterService } from '../../common/services/config-center.service';
import { Friend } from '../friend/friend.entity';
import { FriendRequest } from '../friend/friend-request.entity';
import { FriendService } from '../friend/friend.service';
import { Group } from '../group/group.entity';
import { GroupMember } from '../group/group-member.entity';
import { GroupService } from '../group/group.service';
import { DeviceEntity } from '../iot/entities/device.entity';
import { DeviceMessageEntity } from '../iot/entities/device-message.entity';
import { IoTService } from '../iot/iot.service';
import { Message } from '../message/message.entity';
import { MessageStatus } from '../message/message.interface';
import { AuthService, type DeviceSessionSummaryResult } from '../user/auth.service';
import { LocalUserManagerService } from '../user/local-user-manager.service';
import { UserEntity } from '../user/entities/user.entity';
import {
  AdminAuditLogQueryDto,
  AdminConfigListQueryDto,
  AdminConfigUpsertDto,
  AdminDeviceCommandDto,
  AdminDeviceCreateDto,
  AdminDeviceListQueryDto,
  AdminDeviceStatusUpdateDto,
  AdminFriendListQueryDto,
  AdminFriendPairDto,
  AdminFriendRequestListQueryDto,
  AdminGroupListQueryDto,
  AdminGroupMemberMuteDto,
  AdminGroupMemberRoleUpdateDto,
  AdminGroupMemberUpdateDto,
  AdminGroupTransferOwnerDto,
  AdminGroupUpdateDto,
  AdminMessageListQueryDto,
  AdminUserDeviceSessionListQueryDto,
  AdminUserListQueryDto,
  AdminUserProfileUpdateDto,
} from './dto/admin.dto';

type PaginatedResult<T> = {
  total: number;
  page: number;
  limit: number;
  items: T[];
};

type ConfigListItem = {
  key: string;
  value: unknown;
  rawValue?: unknown;
  source?: string;
  updatedAt?: number;
  encrypted?: boolean;
  description?: string;
  masked: boolean;
};

@Injectable()
export class AdminConsoleService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    @InjectRepository(DeviceMessageEntity)
    private readonly deviceMessageRepository: Repository<DeviceMessageEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
    private readonly localUserManager: LocalUserManagerService,
    private readonly authService: AuthService,
    private readonly groupService: GroupService,
    private readonly friendService: FriendService,
    private readonly iotService: IoTService,
    private readonly configCenterService: ConfigCenterService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getDashboardOverview() {
    const [
      users,
      onlineUsers,
      groups,
      messages,
      devices,
      pendingFriendRequests,
      recentUsers,
      recentMessages,
      recentDevices,
      recentAudits,
    ] = await Promise.all([
      this.userRepository.count({ where: { isDeleted: false } }),
      this.userRepository.count({ where: { isDeleted: false, status: 'online' } }),
      this.groupRepository.count({ where: { isDeleted: false } }),
      this.messageRepository.count({ where: { isDeleted: false } }),
      this.deviceRepository.count(),
      this.friendRequestRepository.count({ where: { isDeleted: false, status: 'pending' } }),
      this.userRepository.find({
        where: { isDeleted: false },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.messageRepository.find({
        where: { isDeleted: false },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.deviceRepository.find({
        order: { updatedAt: 'DESC' },
        take: 5,
      }),
      this.auditRepository.find({
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    return {
      totals: {
        users,
        onlineUsers,
        groups,
        messages,
        devices,
        pendingFriendRequests,
      },
      recentUsers,
      recentMessages,
      recentDevices,
      recentAudits,
    };
  }

  async listUsers(query: AdminUserListQueryDto): Promise<PaginatedResult<UserEntity>> {
    const page = this.resolvePage(query.page);
    const limit = this.resolveLimit(query.limit);
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: false });

    if (query.keyword?.trim()) {
      qb.andWhere(
        '(user.username ILIKE :keyword OR user.nickname ILIKE :keyword)',
        { keyword: `%${query.keyword.trim()}%` },
      );
    }

    if (query.status?.trim()) {
      qb.andWhere('user.status = :status', { status: query.status.trim() });
    }

    if (query.role?.trim()) {
      qb.andWhere('user.roles ? :role', { role: query.role.trim() });
    }

    const [items, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, items };
  }

  async getUserDetail(userId: string) {
    const user = await this.localUserManager.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [friendCount, groupCount, recentAudits] = await Promise.all([
      this.friendRepository.count({
        where: { userId, status: 'accepted', isDeleted: false },
      }),
      this.groupMemberRepository.count({
        where: { userId, status: 'joined', isDeleted: false },
      }),
      this.auditRepository.find({
        where: { entityType: 'chat_users', entityId: userId },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);

    return {
      user,
      stats: {
        friendCount,
        groupCount,
      },
      recentAudits,
    };
  }

  async listUserDeviceSessions(
    userId: string,
    query: AdminUserDeviceSessionListQueryDto,
  ): Promise<DeviceSessionSummaryResult> {
    await this.assertUserExists(userId);

    return this.authService.listDeviceSessions(
      userId,
      undefined,
      this.resolveLimit(query.limit, 50, 200),
    );
  }

  async updateUserProfile(
    operatorId: string,
    userId: string,
    payload: AdminUserProfileUpdateDto,
  ): Promise<UserEntity> {
    const existingUser = await this.localUserManager.getUserById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatePayload: Partial<UserEntity> = {};
    if (payload.nickname !== undefined) {
      updatePayload.nickname = payload.nickname;
    }
    if (payload.status !== undefined) {
      updatePayload.status = payload.status;
    }
    if (payload.avatar !== undefined) {
      updatePayload.avatar = payload.avatar as UserEntity['avatar'];
    }
    if (payload.resources !== undefined) {
      updatePayload.resources = payload.resources as UserEntity['resources'];
    }

    const updatedUser = await this.localUserManager.updateUser(userId, updatePayload);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_users',
      userId,
      this.toAuditValue(existingUser),
      this.toAuditValue(updatedUser),
      undefined,
    );

    return updatedUser;
  }

  async updateUserRoles(
    operatorId: string,
    userId: string,
    roles: string[],
  ): Promise<UserEntity> {
    const existingUser = await this.localUserManager.getUserById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const normalizedRoles = this.normalizeRoles(roles);
    if (
      this.hasRole(existingUser.roles, 'admin')
      && !this.hasRole(normalizedRoles, 'admin')
    ) {
      await this.assertNotLastAdmin();
    }

    const updatedUser = await this.localUserManager.updateUser(userId, {
      roles: normalizedRoles,
    });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_users',
      userId,
      this.toAuditValue(existingUser),
      this.toAuditValue(updatedUser),
      undefined,
    );

    return updatedUser;
  }

  async resetUserPassword(
    operatorId: string,
    userId: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const user = await this.localUserManager.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const success = await this.authService.resetPassword(userId, newPassword);
    if (!success) {
      throw new BadRequestException('Failed to reset password');
    }

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_users',
      userId,
      { password: '[redacted]' },
      { password: '[redacted]' },
      undefined,
    );

    return { success };
  }

  async logoutUserDeviceSession(
    operatorId: string,
    userId: string,
    deviceId: string,
  ): Promise<{ success: boolean; deviceId: string; revokedTokens: number; clearedCursors: number }> {
    await this.assertUserExists(userId);

    const result = await this.authService.logoutDevice(userId, deviceId);

    await this.auditLogService.logDelete(
      operatorId,
      'auth_device_sessions',
      `${userId}:${result.deviceId}`,
      {
        userId,
        deviceId: result.deviceId,
        revokedTokens: result.revokedTokens,
        clearedCursors: result.clearedCursors,
      },
      undefined,
    );

    return {
      success: true,
      ...result,
    };
  }

  async logoutAllUserDeviceSessions(
    operatorId: string,
    userId: string,
  ): Promise<{
      success: boolean;
      total: number;
      revokedTokens: number;
      clearedCursors: number;
      items: Array<{ deviceId: string; revokedTokens: number; clearedCursors: number }>;
    }> {
    await this.assertUserExists(userId);

    const sessions = await this.authService.listDeviceSessions(userId, undefined, 200);
    const deviceIds = Array.from(
      new Set(
        sessions.items
          .map((item) => item.deviceId)
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
      ),
    );

    const items: Array<{ deviceId: string; revokedTokens: number; clearedCursors: number }> = [];
    for (const deviceId of deviceIds) {
      const result = await this.authService.logoutDevice(userId, deviceId);
      items.push(result);

      await this.auditLogService.logDelete(
        operatorId,
        'auth_device_sessions',
        `${userId}:${result.deviceId}`,
        {
          userId,
          deviceId: result.deviceId,
          revokedTokens: result.revokedTokens,
          clearedCursors: result.clearedCursors,
        },
        undefined,
      );
    }

    return {
      success: true,
      total: items.length,
      revokedTokens: items.reduce((sum, item) => sum + item.revokedTokens, 0),
      clearedCursors: items.reduce((sum, item) => sum + item.clearedCursors, 0),
      items,
    };
  }

  async deleteUser(operatorId: string, userId: string): Promise<{ success: boolean }> {
    if (operatorId === userId) {
      throw new BadRequestException('You cannot delete the current admin account');
    }

    const existingUser = await this.localUserManager.getUserById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (this.hasRole(existingUser.roles, 'admin')) {
      await this.assertNotLastAdmin();
    }

    const success = await this.localUserManager.deleteUser(userId);
    if (!success) {
      throw new BadRequestException('Failed to delete user');
    }

    await this.auditLogService.logDelete(
      operatorId,
      'chat_users',
      userId,
      this.toAuditValue(existingUser),
      undefined,
    );

    return { success };
  }

  async listGroups(query: AdminGroupListQueryDto): Promise<PaginatedResult<any>> {
    const page = this.resolvePage(query.page);
    const limit = this.resolveLimit(query.limit);
    const qb = this.groupRepository
      .createQueryBuilder('group')
      .where('group.isDeleted = :isDeleted', { isDeleted: false });

    if (query.keyword?.trim()) {
      qb.andWhere(
        '(group.name ILIKE :keyword OR COALESCE(group.description, \'\') ILIKE :keyword)',
        { keyword: `%${query.keyword.trim()}%` },
      );
    }

    if (query.status?.trim()) {
      qb.andWhere('group.status = :status', { status: query.status.trim() });
    }

    if (query.ownerId?.trim()) {
      qb.andWhere('group.ownerId = :ownerId', { ownerId: query.ownerId.trim() });
    }

    const [groups, total] = await qb
      .orderBy('group.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const memberCountMap = await this.getGroupMemberCountMap(groups.map((group) => group.id));
    const items = groups.map((group) => ({
      ...group,
      memberCount: memberCountMap.get(group.id) || 0,
    }));

    return { total, page, limit, items };
  }

  async getGroupDetail(groupId: string) {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const [members, recentMessages] = await Promise.all([
      this.groupMemberRepository.find({
        where: { groupId, isDeleted: false },
        order: { createdAt: 'ASC' },
      }),
      this.messageRepository.find({
        where: { groupId, isDeleted: false },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);

    return {
      group,
      members,
      recentMessages,
    };
  }

  async updateGroup(
    operatorId: string,
    groupId: string,
    payload: AdminGroupUpdateDto,
  ) {
    const existingGroup = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });
    if (!existingGroup) {
      throw new NotFoundException('Group not found');
    }

    const updatedGroup = await this.groupService.updateGroup(
      groupId,
      this.compactObject({ ...payload }),
    );
    if (!updatedGroup) {
      throw new NotFoundException('Group not found');
    }

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_groups',
      groupId,
      this.toAuditValue(existingGroup),
      this.toAuditValue(updatedGroup),
      undefined,
    );

    return updatedGroup;
  }

  async addGroupMember(
    operatorId: string,
    groupId: string,
    payload: AdminGroupMemberUpdateDto,
  ) {
    const member = await this.groupService.addMember(
      groupId,
      payload.userId,
      payload.role || 'member',
    );

    await this.auditLogService.logCreate(
      operatorId,
      'chat_group_members',
      member.id,
      this.toAuditValue(member),
      undefined,
    );

    return member;
  }

  async updateGroupMemberRole(
    operatorId: string,
    groupId: string,
    userId: string,
    payload: AdminGroupMemberRoleUpdateDto,
  ): Promise<GroupMember> {
    await this.getGroupOrThrow(groupId);

    if (payload.role !== 'admin' && payload.role !== 'member') {
      throw new BadRequestException('Group member role must be admin or member');
    }

    const existingMember = await this.getGroupMemberOrThrow(groupId, userId);
    if (existingMember.role === 'owner') {
      throw new BadRequestException('Group owner role must be changed via ownership transfer');
    }

    const updatedMember = await this.groupMemberRepository.save({
      ...existingMember,
      role: payload.role,
    });

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_group_members',
      existingMember.id,
      this.toAuditValue(existingMember),
      this.toAuditValue(updatedMember),
      undefined,
    );

    return updatedMember;
  }

  async updateGroupMemberMute(
    operatorId: string,
    groupId: string,
    userId: string,
    payload: AdminGroupMemberMuteDto,
  ): Promise<GroupMember> {
    await this.getGroupOrThrow(groupId);

    const existingMember = await this.getGroupMemberOrThrow(groupId, userId, true);
    if (existingMember.role === 'owner') {
      throw new BadRequestException('Group owner cannot be muted');
    }

    const durationSeconds = this.resolveNumber(payload.durationSeconds, 0, 0, 31_536_000);
    const updatedMember = await this.groupMemberRepository.save({
      ...existingMember,
      muteUntil: durationSeconds > 0
        ? new Date(Date.now() + durationSeconds * 1000)
        : null,
    } as GroupMember);

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_group_members',
      existingMember.id,
      this.toAuditValue(existingMember),
      this.toAuditValue(updatedMember),
      undefined,
    );

    return updatedMember;
  }

  async removeGroupMember(
    operatorId: string,
    groupId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const group = await this.getGroupOrThrow(groupId);
    if (group.ownerId === userId) {
      throw new BadRequestException('Group owner must be transferred before removal');
    }

    const success = await this.groupService.removeMember(groupId, userId);
    if (!success) {
      throw new NotFoundException('Group member not found');
    }

    await this.auditLogService.logDelete(
      operatorId,
      'chat_group_members',
      `${groupId}:${userId}`,
      { groupId, userId },
      undefined,
    );

    return { success };
  }

  async transferGroupOwner(
    operatorId: string,
    groupId: string,
    payload: AdminGroupTransferOwnerDto,
  ): Promise<Group> {
    const existingGroup = await this.getGroupOrThrow(groupId);
    const newOwnerId = payload.newOwnerId?.trim();

    if (!newOwnerId) {
      throw new BadRequestException('New owner user id is required');
    }
    if (newOwnerId === existingGroup.ownerId) {
      throw new BadRequestException('The target user is already the group owner');
    }

    const currentOwnerMember = await this.getGroupMemberOrThrow(groupId, existingGroup.ownerId, true);
    const targetOwnerMember = await this.getGroupMemberOrThrow(groupId, newOwnerId, true);

    const demotedOwner = await this.groupMemberRepository.save({
      ...currentOwnerMember,
      role: 'admin',
    });
    const promotedOwner = await this.groupMemberRepository.save({
      ...targetOwnerMember,
      role: 'owner',
    });
    const updatedGroup = await this.groupRepository.save({
      ...existingGroup,
      ownerId: newOwnerId,
    });

    await Promise.all([
      this.auditLogService.logUpdate(
        operatorId,
        'chat_group_members',
        currentOwnerMember.id,
        this.toAuditValue(currentOwnerMember),
        this.toAuditValue(demotedOwner),
        undefined,
      ),
      this.auditLogService.logUpdate(
        operatorId,
        'chat_group_members',
        targetOwnerMember.id,
        this.toAuditValue(targetOwnerMember),
        this.toAuditValue(promotedOwner),
        undefined,
      ),
      this.auditLogService.logUpdate(
        operatorId,
        'chat_groups',
        groupId,
        this.toAuditValue(existingGroup),
        this.toAuditValue(updatedGroup),
        undefined,
      ),
    ]);

    return updatedGroup;
  }

  async deleteGroup(operatorId: string, groupId: string): Promise<{ success: boolean }> {
    const existingGroup = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });
    if (!existingGroup) {
      throw new NotFoundException('Group not found');
    }

    const success = await this.groupService.deleteGroup(groupId);
    if (!success) {
      throw new BadRequestException('Failed to delete group');
    }

    await this.auditLogService.logDelete(
      operatorId,
      'chat_groups',
      groupId,
      this.toAuditValue(existingGroup),
      undefined,
    );

    return { success };
  }

  async listFriends(query: AdminFriendListQueryDto): Promise<PaginatedResult<Friend>> {
    const page = this.resolvePage(query.page);
    const limit = this.resolveLimit(query.limit);
    const [items, total] = await this.friendRepository.findAndCount({
      where: this.compactObject({
        isDeleted: false,
        userId: query.userId,
        status: query.status,
      }) as any,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { total, page, limit, items };
  }

  async listFriendRequests(query: AdminFriendRequestListQueryDto): Promise<PaginatedResult<FriendRequest>> {
    const page = this.resolvePage(query.page);
    const limit = this.resolveLimit(query.limit);
    const [items, total] = await this.friendRequestRepository.findAndCount({
      where: this.compactObject({
        isDeleted: false,
        toUserId: query.userId,
        status: query.status,
      }) as any,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { total, page, limit, items };
  }

  async acceptFriendRequest(operatorId: string, requestId: string): Promise<{ success: boolean }> {
    const existingRequest = await this.friendRequestRepository.findOne({
      where: { id: requestId, isDeleted: false },
    });
    if (!existingRequest) {
      throw new NotFoundException('Friend request not found');
    }

    const success = await this.friendService.acceptFriendRequest(requestId);
    if (!success) {
      throw new BadRequestException('Failed to accept friend request');
    }

    const updatedRequest = await this.friendRequestRepository.findOne({
      where: { id: requestId, isDeleted: false },
    });

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_friend_requests',
      requestId,
      this.toAuditValue(existingRequest),
      this.toAuditValue(updatedRequest || { ...existingRequest, status: 'accepted' }),
      undefined,
    );

    return { success };
  }

  async rejectFriendRequest(operatorId: string, requestId: string): Promise<{ success: boolean }> {
    const existingRequest = await this.friendRequestRepository.findOne({
      where: { id: requestId, isDeleted: false },
    });
    if (!existingRequest) {
      throw new NotFoundException('Friend request not found');
    }

    const success = await this.friendService.rejectFriendRequest(requestId);
    if (!success) {
      throw new BadRequestException('Failed to reject friend request');
    }

    const updatedRequest = await this.friendRequestRepository.findOne({
      where: { id: requestId, isDeleted: false },
    });

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_friend_requests',
      requestId,
      this.toAuditValue(existingRequest),
      this.toAuditValue(updatedRequest || { ...existingRequest, status: 'rejected' }),
      undefined,
    );

    return { success };
  }

  async removeFriendship(operatorId: string, payload: AdminFriendPairDto) {
    const success = await this.friendService.removeFriend(payload.userId, payload.friendId);
    if (!success) {
      throw new NotFoundException('Friendship not found');
    }

    await this.auditLogService.logDelete(
      operatorId,
      'chat_friends',
      `${payload.userId}:${payload.friendId}`,
      payload,
      undefined,
    );

    return { success };
  }

  async blockFriendship(operatorId: string, payload: AdminFriendPairDto) {
    const success = await this.friendService.blockFriend(payload.userId, payload.friendId);

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_friends',
      `${payload.userId}:${payload.friendId}`,
      payload,
      { ...payload, status: 'blocked' },
      undefined,
    );

    return { success };
  }

  async unblockFriendship(operatorId: string, payload: AdminFriendPairDto) {
    const success = await this.friendService.unblockFriend(payload.userId, payload.friendId);
    if (!success) {
      throw new NotFoundException('Blocked friendship not found');
    }

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_friends',
      `${payload.userId}:${payload.friendId}`,
      { ...payload, status: 'blocked' },
      { ...payload, status: 'accepted' },
      undefined,
    );

    return { success };
  }

  async listMessages(query: AdminMessageListQueryDto): Promise<PaginatedResult<Message>> {
    const page = this.resolvePage(query.page);
    const limit = this.resolveLimit(query.limit);
    const qb = this.messageRepository
      .createQueryBuilder('message')
      .where('message.isDeleted = :isDeleted', { isDeleted: false });

    if (query.keyword?.trim()) {
      qb.andWhere('message.content::text ILIKE :keyword', {
        keyword: `%${query.keyword.trim()}%`,
      });
    }
    if (query.fromUserId?.trim()) {
      qb.andWhere('message.fromUserId = :fromUserId', { fromUserId: query.fromUserId.trim() });
    }
    if (query.toUserId?.trim()) {
      qb.andWhere('message.toUserId = :toUserId', { toUserId: query.toUserId.trim() });
    }
    if (query.groupId?.trim()) {
      qb.andWhere('message.groupId = :groupId', { groupId: query.groupId.trim() });
    }
    if (query.status?.trim()) {
      qb.andWhere('message.status = :status', { status: query.status.trim() });
    }
    if (query.type?.trim()) {
      qb.andWhere('message.type = :type', { type: query.type.trim() });
    }

    const [items, total] = await qb
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, items };
  }

  async getMessageDetail(messageId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, isDeleted: false },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  async deleteMessage(operatorId: string, messageId: string) {
    const message = await this.getMessageDetail(messageId);
    const updatedMessage = await this.messageRepository.save({
      ...message,
      isDeleted: true,
    });

    await this.auditLogService.logDelete(
      operatorId,
      'chat_messages',
      messageId,
      this.toAuditValue(message),
      undefined,
    );

    return {
      success: true,
      message: updatedMessage,
    };
  }

  async recallMessage(operatorId: string, messageId: string) {
    const message = await this.getMessageDetail(messageId);
    const updatedMessage = await this.messageRepository.save({
      ...message,
      status: MessageStatus.RECALLED,
      recalledAt: new Date(),
    });

    await this.auditLogService.logUpdate(
      operatorId,
      'chat_messages',
      messageId,
      this.toAuditValue(message),
      this.toAuditValue(updatedMessage),
      undefined,
    );

    return {
      success: true,
      message: updatedMessage,
    };
  }

  async listDevices(query: AdminDeviceListQueryDto): Promise<PaginatedResult<DeviceEntity>> {
    const page = this.resolvePage(query.page);
    const limit = this.resolveLimit(query.limit);
    const qb = this.deviceRepository
      .createQueryBuilder('device')
      .where('1 = 1');

    if (query.keyword?.trim()) {
      qb.andWhere(
        '(device.deviceId ILIKE :keyword OR device.name ILIKE :keyword OR COALESCE(device.description, \'\') ILIKE :keyword)',
        { keyword: `%${query.keyword.trim()}%` },
      );
    }
    if (query.status?.trim()) {
      qb.andWhere('device.status = :status', { status: query.status.trim() });
    }
    if (query.type?.trim()) {
      qb.andWhere('device.type = :type', { type: query.type.trim() });
    }
    if (query.userId?.trim()) {
      qb.andWhere('device.userId = :userId', { userId: query.userId.trim() });
    }

    const [items, total] = await qb
      .orderBy('device.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, items };
  }

  async createDevice(
    operatorId: string,
    payload: AdminDeviceCreateDto,
  ): Promise<DeviceEntity> {
    if (!payload.deviceId?.trim()) {
      throw new BadRequestException('Device id is required');
    }
    if (!payload.name?.trim()) {
      throw new BadRequestException('Device name is required');
    }
    if (!payload.type?.trim()) {
      throw new BadRequestException('Device type is required');
    }

    const device = await this.iotService.registerDevice({
      deviceId: payload.deviceId.trim(),
      type: payload.type,
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined,
      ipAddress: payload.ipAddress?.trim() || undefined,
      macAddress: payload.macAddress?.trim() || undefined,
      metadata: payload.metadata,
      userId: payload.userId?.trim() || undefined,
    });

    await this.auditLogService.logCreate(
      operatorId,
      'devices',
      device.deviceId,
      this.toAuditValue(device),
      undefined,
    );

    return device;
  }

  async getDeviceDetail(deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: { deviceId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const recentMessages = await this.deviceMessageRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      device,
      recentMessages,
    };
  }

  async updateDeviceStatus(
    operatorId: string,
    deviceId: string,
    payload: AdminDeviceStatusUpdateDto,
  ) {
    const updatedDevice = await this.iotService.updateDeviceStatus(deviceId, payload.status);

    await this.auditLogService.logUpdate(
      operatorId,
      'devices',
      deviceId,
      { deviceId },
      { deviceId, status: payload.status },
      undefined,
    );

    return updatedDevice;
  }

  async controlDevice(
    operatorId: string,
    deviceId: string,
    payload: AdminDeviceCommandDto,
  ) {
    const success = await this.iotService.controlDevice(deviceId, {
      action: payload.action,
      params: payload.params,
    });

    await this.auditLogService.logCreate(
      operatorId,
      'device_messages',
      deviceId,
      {
        deviceId,
        action: payload.action,
        params: payload.params,
      },
      undefined,
    );

    return { success };
  }

  async deleteDevice(operatorId: string, deviceId: string): Promise<{ success: boolean }> {
    const existingDevice = await this.deviceRepository.findOne({
      where: { deviceId },
    });
    if (!existingDevice) {
      throw new NotFoundException('Device not found');
    }

    const success = await this.iotService.deleteDevice(deviceId);
    if (!success) {
      throw new BadRequestException('Failed to delete device');
    }

    await this.auditLogService.logDelete(
      operatorId,
      'devices',
      deviceId,
      this.toAuditValue(existingDevice),
      undefined,
    );

    return { success };
  }

  async getSystemSummary() {
    const [auditLogCount, recentAudits] = await Promise.all([
      this.auditRepository.count(),
      this.auditRepository.find({
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);
    const configStats = this.configCenterService.getStats();
    const keys = this.configCenterService.getKeys();

    return {
      runtime: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      },
      configStats,
      auditLogCount,
      recentAudits,
      cloudServices: this.buildCloudServiceSummary(keys),
    };
  }

  listConfigs(query: AdminConfigListQueryDto): { total: number; items: ConfigListItem[] } {
    const keys = this.configCenterService
      .getKeys(query.pattern)
      .sort((left, right) => left.localeCompare(right));
    const includeSensitive = this.resolveBoolean(query.includeSensitive);

    const items = keys
      .map((key) => {
        const entry = this.configCenterService.getEntry(key);
        if (!entry) {
          return null;
        }

        const masked = this.isSensitiveKey(key);
        return {
          key,
          value: masked && !includeSensitive ? this.maskConfigValue(entry.value) : entry.value,
          rawValue: masked && includeSensitive ? entry.value : undefined,
          source: entry.source,
          updatedAt: entry.updatedAt,
          encrypted: entry.encrypted,
          description: entry.description,
          masked,
        } as ConfigListItem;
      })
      .filter((item): item is ConfigListItem => !!item);

    return {
      total: items.length,
      items,
    };
  }

  async upsertConfig(operatorId: string, payload: AdminConfigUpsertDto) {
    if (!payload.key?.trim()) {
      throw new BadRequestException('Config key is required');
    }

    const key = payload.key.trim();
    const existingEntry = this.configCenterService.getEntry(key);
    const success = this.configCenterService.set(key, payload.value, {
      source: 'override',
      description: payload.description,
    });
    if (!success) {
      throw new BadRequestException('Config validation failed');
    }

    const updatedEntry = this.configCenterService.getEntry(key);
    if (existingEntry) {
      await this.auditLogService.logUpdate(
        operatorId,
        'system_config',
        key,
        this.toAuditValue(existingEntry),
        this.toAuditValue(updatedEntry),
        undefined,
      );
    } else {
      await this.auditLogService.logCreate(
        operatorId,
        'system_config',
        key,
        this.toAuditValue(updatedEntry),
        undefined,
      );
    }

    return {
      success: true,
      config: updatedEntry,
    };
  }

  async deleteConfig(operatorId: string, key: string): Promise<{ success: boolean }> {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      throw new BadRequestException('Config key is required');
    }

    const existingEntry = this.configCenterService.getEntry(normalizedKey);
    if (!existingEntry) {
      throw new NotFoundException('Config key not found');
    }
    if (existingEntry.source !== 'override') {
      throw new BadRequestException('Only override config entries can be deleted from admin console');
    }

    const success = this.configCenterService.delete(normalizedKey);
    if (!success) {
      throw new BadRequestException('Failed to delete config key');
    }

    await this.configCenterService.refresh();

    await this.auditLogService.logDelete(
      operatorId,
      'system_config',
      normalizedKey,
      this.toAuditValue(existingEntry),
      undefined,
    );

    return { success };
  }

  async listAuditLogs(query: AdminAuditLogQueryDto) {
    const limit = this.resolveLimit(query.limit, 50, 200);
    const offset = this.resolveOffset(query.offset);
    const [items, total] = await this.auditRepository.findAndCount({
      where: this.compactObject({
        userId: query.userId,
        entityType: query.entityType,
        action: query.action as AuditAction | undefined,
      }),
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      total,
      limit,
      offset,
      items,
    };
  }

  private async getGroupMemberCountMap(groupIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (groupIds.length === 0) {
      return counts;
    }

    const rows = await this.groupMemberRepository
      .createQueryBuilder('member')
      .select('member.groupId', 'groupId')
      .addSelect('COUNT(*)', 'memberCount')
      .where('member.groupId IN (:...groupIds)', { groupIds })
      .andWhere('member.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('member.status = :status', { status: 'joined' })
      .groupBy('member.groupId')
      .getRawMany<{ groupId: string; memberCount: string }>();

    rows.forEach((row) => {
      counts.set(row.groupId, Number(row.memberCount) || 0);
    });

    return counts;
  }

  private async getGroupOrThrow(groupId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  private async getGroupMemberOrThrow(
    groupId: string,
    userId: string,
    joinedOnly: boolean = false,
  ): Promise<GroupMember> {
    const member = await this.groupMemberRepository.findOne({
      where: this.compactObject({
        groupId,
        userId,
        isDeleted: false,
        status: joinedOnly ? 'joined' : undefined,
      }) as any,
    });
    if (!member) {
      throw new NotFoundException('Group member not found');
    }
    return member;
  }

  private async assertNotLastAdmin(): Promise<void> {
    const adminCount = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('user.roles ? :role', { role: 'admin' })
      .getCount();

    if (adminCount <= 1) {
      throw new BadRequestException('Cannot remove or delete the last admin account');
    }
  }

  private async assertUserExists(userId: string): Promise<UserEntity> {
    const user = await this.localUserManager.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private normalizeRoles(roles: string[]): string[] {
    const allowedRoles = new Set(['user', 'group_admin', 'admin']);
    const normalized = Array.from(
      new Set(
        (Array.isArray(roles) ? roles : [])
          .map((role) => (typeof role === 'string' ? role.trim() : ''))
          .filter((role) => role.length > 0 && allowedRoles.has(role)),
      ),
    );

    return normalized.length > 0 ? normalized : ['user'];
  }

  private hasRole(roles: string[] | undefined, targetRole: string): boolean {
    return Array.isArray(roles) && roles.includes(targetRole);
  }

  private buildCloudServiceSummary(keys: string[]) {
    const definitions = [
      { id: 'rtc', label: 'RTC', pattern: /RTC|TRTC|AGORA|VOLCENGINE|ALIYUN/i },
      { id: 'wukongim', label: 'WuKongIM', pattern: /WUKONGIM|WK_/i },
      { id: 'iot', label: 'IoT', pattern: /IOT|XIAOZHI|BAIDU_(STT|TTS)/i },
      { id: 'ai', label: 'AI', pattern: /OPENAI|QWEN|CLAUDE|ANTHROPIC/i },
    ];

    return definitions.map((definition) => {
      const matchedKeys = keys.filter((key) => definition.pattern.test(key));
      return {
        id: definition.id,
        label: definition.label,
        configuredKeys: matchedKeys.length,
        configured: matchedKeys.length > 0,
        sampleKeys: matchedKeys.slice(0, 5),
      };
    });
  }

  private compactObject<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined),
    ) as T;
  }

  private toAuditValue(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return { ...(value as Record<string, unknown>) };
  }

  private resolvePage(value?: number): number {
    return this.resolveNumber(value, 1, 1, 10_000);
  }

  private resolveLimit(value?: number, fallback: number = 20, max: number = 100): number {
    return this.resolveNumber(value, fallback, 1, max);
  }

  private resolveOffset(value?: number): number {
    return this.resolveNumber(value, 0, 0, 1_000_000);
  }

  private resolveNumber(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const numericValue = Number(value);
    const resolved = Number.isFinite(numericValue) ? Math.floor(numericValue) : fallback;

    return Math.min(Math.max(resolved, min), max);
  }

  private resolveBoolean(value?: boolean | string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return false;
  }

  private isSensitiveKey(key: string): boolean {
    return /(secret|token|password|private|credential|api[_-]?key)/i.test(key);
  }

  private maskConfigValue(value: unknown): unknown {
    if (typeof value === 'string') {
      if (value.length <= 8) {
        return '********';
      }
      return `${value.slice(0, 3)}********${value.slice(-3)}`;
    }

    if (value && typeof value === 'object') {
      return '[redacted]';
    }

    return '********';
  }
}
