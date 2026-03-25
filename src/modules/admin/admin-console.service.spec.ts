import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminConsoleService } from './admin-console.service';
import { UserEntity } from '../user/entities/user.entity';
import { Group } from '../group/group.entity';
import { GroupMember } from '../group/group-member.entity';
import { Friend } from '../friend/friend.entity';
import { FriendRequest } from '../friend/friend-request.entity';
import { Message } from '../message/message.entity';
import { DeviceEntity, DeviceType } from '../iot/entities/device.entity';
import { DeviceMessageEntity } from '../iot/entities/device-message.entity';
import { AuditLogEntity, AuditAction } from '../../common/entities/audit-log.entity';
import { LocalUserManagerService } from '../user/local-user-manager.service';
import { AuthService } from '../user/auth.service';
import { GroupService } from '../group/group.service';
import { FriendService } from '../friend/friend.service';
import { IoTService } from '../iot/iot.service';
import { ConfigCenterService } from '../../common/services/config-center.service';
import { AuditLogService } from '../../common/services/audit-log.service';

describe('AdminConsoleService', () => {
  let service: AdminConsoleService;

  const userRepository = {
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const friendRepository = {
    findAndCount: jest.fn(),
  };
  const friendRequestRepository = {
    count: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };
  const groupRepository = {
    count: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const groupMemberRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const messageRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const deviceRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const deviceMessageRepository = {
    find: jest.fn(),
  };
  const auditRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockLocalUserManager = {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };
  const mockAuthService = {
    resetPassword: jest.fn(),
    listDeviceSessions: jest.fn(),
    logoutDevice: jest.fn(),
  };
  const mockGroupService = {
    addMember: jest.fn(),
    removeMember: jest.fn(),
    deleteGroup: jest.fn(),
    updateGroup: jest.fn(),
    updateMemberRole: jest.fn(),
    muteMember: jest.fn(),
    transferGroup: jest.fn(),
  };
  const mockFriendService = {
    removeFriend: jest.fn(),
    blockFriend: jest.fn(),
    unblockFriend: jest.fn(),
    acceptFriendRequest: jest.fn(),
    rejectFriendRequest: jest.fn(),
  };
  const mockIoTService = {
    getDevice: jest.fn(),
    registerDevice: jest.fn(),
    updateDeviceStatus: jest.fn(),
    controlDevice: jest.fn(),
    deleteDevice: jest.fn(),
  };
  const mockConfigCenterService = {
    getStats: jest.fn(),
    getKeys: jest.fn(),
    getEntry: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    refresh: jest.fn(),
  };
  const mockAuditLogService = {
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logCreate: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminConsoleService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: getRepositoryToken(Friend), useValue: friendRepository },
        { provide: getRepositoryToken(FriendRequest), useValue: friendRequestRepository },
        { provide: getRepositoryToken(Group), useValue: groupRepository },
        { provide: getRepositoryToken(GroupMember), useValue: groupMemberRepository },
        { provide: getRepositoryToken(Message), useValue: messageRepository },
        { provide: getRepositoryToken(DeviceEntity), useValue: deviceRepository },
        { provide: getRepositoryToken(DeviceMessageEntity), useValue: deviceMessageRepository },
        { provide: getRepositoryToken(AuditLogEntity), useValue: auditRepository },
        { provide: LocalUserManagerService, useValue: mockLocalUserManager },
        { provide: AuthService, useValue: mockAuthService },
        { provide: GroupService, useValue: mockGroupService },
        { provide: FriendService, useValue: mockFriendService },
        { provide: IoTService, useValue: mockIoTService },
        { provide: ConfigCenterService, useValue: mockConfigCenterService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AdminConsoleService>(AdminConsoleService);
  });

  it('should summarize dashboard metrics and recent operational activity', async () => {
    userRepository.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(4);
    groupRepository.count.mockResolvedValue(5);
    messageRepository.count.mockResolvedValue(320);
    deviceRepository.count.mockResolvedValue(7);
    friendRequestRepository.count.mockResolvedValue(2);

    userRepository.find.mockResolvedValue([{ id: 'u-1', username: 'admin' }]);
    messageRepository.find.mockResolvedValue([{ id: 'm-1', fromUserId: 'u-1' }]);
    deviceRepository.find.mockResolvedValue([{ id: 'd-1', deviceId: 'dev-1' }]);
    auditRepository.find.mockResolvedValue([{ id: 'a-1', action: AuditAction.UPDATE }]);

    const overview = await service.getDashboardOverview();

    expect(overview).toEqual({
      totals: {
        users: 12,
        onlineUsers: 4,
        groups: 5,
        messages: 320,
        devices: 7,
        pendingFriendRequests: 2,
      },
      recentUsers: [{ id: 'u-1', username: 'admin' }],
      recentMessages: [{ id: 'm-1', fromUserId: 'u-1' }],
      recentDevices: [{ id: 'd-1', deviceId: 'dev-1' }],
      recentAudits: [{ id: 'a-1', action: AuditAction.UPDATE }],
    });
  });

  it('should persist user roles and write an audit record', async () => {
    mockLocalUserManager.getUserById.mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      roles: ['user'],
    });
    mockLocalUserManager.updateUser.mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      roles: ['admin'],
    });

    const updated = await service.updateUserRoles('operator-1', 'user-1', ['admin']);

    expect(mockLocalUserManager.updateUser).toHaveBeenCalledWith('user-1', {
      roles: ['admin'],
    });
    expect(mockAuditLogService.logUpdate).toHaveBeenCalledWith(
      'operator-1',
      'chat_users',
      'user-1',
      expect.objectContaining({ roles: ['user'] }),
      expect.objectContaining({ roles: ['admin'] }),
      undefined,
    );
    expect(updated).toEqual(
      expect.objectContaining({
        id: 'user-1',
        roles: ['admin'],
      }),
    );
  });

  it('should accept a pending friend request and write an audit record', async () => {
    friendRequestRepository.findOne
      .mockResolvedValueOnce({
        id: 'req-1',
        fromUserId: 'user-a',
        toUserId: 'user-b',
        status: 'pending',
      })
      .mockResolvedValueOnce({
        id: 'req-1',
        fromUserId: 'user-a',
        toUserId: 'user-b',
        status: 'accepted',
      });
    mockFriendService.acceptFriendRequest.mockResolvedValue(true);

    const result = await service.acceptFriendRequest('operator-1', 'req-1');

    expect(mockFriendService.acceptFriendRequest).toHaveBeenCalledWith('req-1');
    expect(mockAuditLogService.logUpdate).toHaveBeenCalledWith(
      'operator-1',
      'chat_friend_requests',
      'req-1',
      expect.objectContaining({ status: 'pending' }),
      expect.objectContaining({ status: 'accepted' }),
      undefined,
    );
    expect(result).toEqual({ success: true });
  });

  it('should list device sessions for an existing user', async () => {
    mockLocalUserManager.getUserById.mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      roles: ['user'],
    });
    mockAuthService.listDeviceSessions.mockResolvedValue({
      total: 2,
      items: [
        {
          deviceId: 'ios-001',
          tokenCount: 2,
          conversationCount: 5,
          lastActiveAt: '2026-03-24T11:00:00.000Z',
          isCurrentDevice: false,
        },
        {
          deviceId: 'web-001',
          tokenCount: 1,
          conversationCount: 2,
          lastActiveAt: '2026-03-24T12:00:00.000Z',
          isCurrentDevice: false,
        },
      ],
    });

    const result = await service.listUserDeviceSessions('user-1', { limit: 20 });

    expect(mockAuthService.listDeviceSessions).toHaveBeenCalledWith('user-1', undefined, 20);
    expect(result).toEqual({
      total: 2,
      items: expect.arrayContaining([
        expect.objectContaining({ deviceId: 'ios-001' }),
        expect.objectContaining({ deviceId: 'web-001' }),
      ]),
    });
  });

  it('should logout a user device session and write an audit record', async () => {
    mockLocalUserManager.getUserById.mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      roles: ['user'],
    });
    mockAuthService.logoutDevice.mockResolvedValue({
      deviceId: 'ios-001',
      revokedTokens: 3,
      clearedCursors: 7,
    });

    const result = await service.logoutUserDeviceSession('operator-1', 'user-1', 'ios-001');

    expect(mockAuthService.logoutDevice).toHaveBeenCalledWith('user-1', 'ios-001');
    expect(mockAuditLogService.logDelete).toHaveBeenCalledWith(
      'operator-1',
      'auth_device_sessions',
      'user-1:ios-001',
      expect.objectContaining({
        userId: 'user-1',
        deviceId: 'ios-001',
        revokedTokens: 3,
        clearedCursors: 7,
      }),
      undefined,
    );
    expect(result).toEqual({
      success: true,
      deviceId: 'ios-001',
      revokedTokens: 3,
      clearedCursors: 7,
    });
  });

  it('should logout all user device sessions and write audit records', async () => {
    mockLocalUserManager.getUserById.mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      roles: ['user'],
    });
    mockAuthService.listDeviceSessions.mockResolvedValue({
      total: 2,
      items: [
        {
          deviceId: 'ios-001',
          tokenCount: 2,
          conversationCount: 5,
          lastActiveAt: '2026-03-24T11:00:00.000Z',
          isCurrentDevice: false,
        },
        {
          deviceId: 'web-001',
          tokenCount: 1,
          conversationCount: 2,
          lastActiveAt: '2026-03-24T12:00:00.000Z',
          isCurrentDevice: false,
        },
      ],
    });
    mockAuthService.logoutDevice
      .mockResolvedValueOnce({
        deviceId: 'ios-001',
        revokedTokens: 3,
        clearedCursors: 7,
      })
      .mockResolvedValueOnce({
        deviceId: 'web-001',
        revokedTokens: 1,
        clearedCursors: 2,
      });

    const result = await service.logoutAllUserDeviceSessions('operator-1', 'user-1');

    expect(mockAuthService.listDeviceSessions).toHaveBeenCalledWith('user-1', undefined, 200);
    expect(mockAuthService.logoutDevice).toHaveBeenNthCalledWith(1, 'user-1', 'ios-001');
    expect(mockAuthService.logoutDevice).toHaveBeenNthCalledWith(2, 'user-1', 'web-001');
    expect(mockAuditLogService.logDelete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: true,
      total: 2,
      revokedTokens: 4,
      clearedCursors: 9,
      items: [
        {
          deviceId: 'ios-001',
          revokedTokens: 3,
          clearedCursors: 7,
        },
        {
          deviceId: 'web-001',
          revokedTokens: 1,
          clearedCursors: 2,
        },
      ],
    });
  });

  it('should register a device from admin console and write an audit record', async () => {
    mockIoTService.registerDevice.mockResolvedValue({
      id: 'device-row-1',
      deviceId: 'dev-1',
      type: DeviceType.XIAOZHI,
      name: 'sensor-alpha',
      description: 'warehouse gateway',
      userId: 'user-1',
      status: 'online',
    });

    const result = await service.createDevice('operator-1', {
      deviceId: 'dev-1',
      type: DeviceType.XIAOZHI,
      name: 'sensor-alpha',
      description: 'warehouse gateway',
      userId: 'user-1',
    });

    expect(mockIoTService.registerDevice).toHaveBeenCalledWith({
      deviceId: 'dev-1',
      type: DeviceType.XIAOZHI,
      name: 'sensor-alpha',
      description: 'warehouse gateway',
      ipAddress: undefined,
      macAddress: undefined,
      metadata: undefined,
      userId: 'user-1',
    });
    expect(mockAuditLogService.logCreate).toHaveBeenCalledWith(
      'operator-1',
      'devices',
      'dev-1',
      expect.objectContaining({
        deviceId: 'dev-1',
        name: 'sensor-alpha',
      }),
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        deviceId: 'dev-1',
        status: 'online',
      }),
    );
  });

  it('should delete a device and write an audit record', async () => {
    deviceRepository.findOne.mockResolvedValue({
      id: 'device-row-1',
      deviceId: 'dev-1',
      name: 'sensor-alpha',
      status: 'online',
    });
    mockIoTService.deleteDevice.mockResolvedValue(true);

    const result = await service.deleteDevice('operator-1', 'dev-1');

    expect(mockIoTService.deleteDevice).toHaveBeenCalledWith('dev-1');
    expect(mockAuditLogService.logDelete).toHaveBeenCalledWith(
      'operator-1',
      'devices',
      'dev-1',
      expect.objectContaining({ deviceId: 'dev-1', name: 'sensor-alpha' }),
      undefined,
    );
    expect(result).toEqual({ success: true });
  });

  it('should delete a config override and write an audit record', async () => {
    mockConfigCenterService.getEntry.mockReturnValue({
      key: 'RTC_DEFAULT_PROVIDER',
      value: 'volcengine',
      source: 'override',
    });
    mockConfigCenterService.delete.mockReturnValue(true);

    const result = await service.deleteConfig('operator-1', 'RTC_DEFAULT_PROVIDER');

    expect(mockConfigCenterService.delete).toHaveBeenCalledWith('RTC_DEFAULT_PROVIDER');
    expect(mockAuditLogService.logDelete).toHaveBeenCalledWith(
      'operator-1',
      'system_config',
      'RTC_DEFAULT_PROVIDER',
      expect.objectContaining({ key: 'RTC_DEFAULT_PROVIDER', value: 'volcengine' }),
      undefined,
    );
    expect(result).toEqual({ success: true });
  });

  it('should apply keyword filtering when listing devices', async () => {
    const chain = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ deviceId: 'dev-1' }], 1]),
    };
    deviceRepository.createQueryBuilder.mockReturnValue(chain);

    const result = await service.listDevices({
      keyword: 'sensor',
      status: 'online',
      type: 'xiaozhi',
      userId: 'user-1',
      page: 2,
      limit: 10,
    });

    expect(deviceRepository.createQueryBuilder).toHaveBeenCalledWith('device');
    expect(chain.andWhere).toHaveBeenCalledWith(
      '(device.deviceId ILIKE :keyword OR device.name ILIKE :keyword OR COALESCE(device.description, \'\') ILIKE :keyword)',
      { keyword: '%sensor%' },
    );
    expect(chain.andWhere).toHaveBeenCalledWith('device.status = :status', { status: 'online' });
    expect(chain.andWhere).toHaveBeenCalledWith('device.type = :type', { type: 'xiaozhi' });
    expect(chain.andWhere).toHaveBeenCalledWith('device.userId = :userId', { userId: 'user-1' });
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(chain.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      total: 1,
      page: 2,
      limit: 10,
      items: [{ deviceId: 'dev-1' }],
    });
  });

  it('should update a group member role and write an audit record', async () => {
    groupRepository.findOne.mockResolvedValue({
      id: 'group-1',
      ownerId: 'owner-1',
      status: 'active',
      isDeleted: false,
    });
    groupMemberRepository.findOne.mockResolvedValue({
      id: 'member-row-1',
      groupId: 'group-1',
      userId: 'user-2',
      role: 'member',
      status: 'joined',
      muteUntil: null,
    });
    groupMemberRepository.save.mockImplementation(async (value) => value);

    const result = await service.updateGroupMemberRole('operator-1', 'group-1', 'user-2', {
      role: 'admin',
    });

    expect(groupMemberRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'member-row-1',
        role: 'admin',
      }),
    );
    expect(mockAuditLogService.logUpdate).toHaveBeenCalledWith(
      'operator-1',
      'chat_group_members',
      'member-row-1',
      expect.objectContaining({ role: 'member' }),
      expect.objectContaining({ role: 'admin' }),
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-row-1',
        role: 'admin',
      }),
    );
  });

  it('should reject removing the current group owner from admin console', async () => {
    groupRepository.findOne.mockResolvedValue({
      id: 'group-1',
      ownerId: 'owner-1',
      status: 'active',
      isDeleted: false,
    });

    await expect(
      service.removeGroupMember('operator-1', 'group-1', 'owner-1'),
    ).rejects.toThrow('Group owner must be transferred before removal');
  });

  it('should mute a joined group member and write an audit record', async () => {
    groupRepository.findOne.mockResolvedValue({
      id: 'group-1',
      ownerId: 'owner-1',
      status: 'active',
      isDeleted: false,
    });
    groupMemberRepository.findOne.mockResolvedValue({
      id: 'member-row-1',
      groupId: 'group-1',
      userId: 'user-2',
      role: 'member',
      status: 'joined',
      muteUntil: null,
    });
    groupMemberRepository.save.mockImplementation(async (value) => value);

    const result = await service.updateGroupMemberMute('operator-1', 'group-1', 'user-2', {
      durationSeconds: 3600,
    });

    expect(groupMemberRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'member-row-1',
        muteUntil: expect.any(Date),
      }),
    );
    expect(mockAuditLogService.logUpdate).toHaveBeenCalledWith(
      'operator-1',
      'chat_group_members',
      'member-row-1',
      expect.objectContaining({ muteUntil: null }),
      expect.objectContaining({ muteUntil: expect.any(Date) }),
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-row-1',
        muteUntil: expect.any(Date),
      }),
    );
  });

  it('should transfer group ownership and write audit records for the group and members', async () => {
    groupRepository.findOne.mockResolvedValue({
      id: 'group-1',
      ownerId: 'owner-1',
      name: 'Operators',
      status: 'active',
      isDeleted: false,
    });
    groupMemberRepository.findOne
      .mockResolvedValueOnce({
        id: 'member-owner',
        groupId: 'group-1',
        userId: 'owner-1',
        role: 'owner',
        status: 'joined',
      })
      .mockResolvedValueOnce({
        id: 'member-admin',
        groupId: 'group-1',
        userId: 'user-2',
        role: 'admin',
        status: 'joined',
      });
    groupMemberRepository.save.mockImplementation(async (value) => value);
    groupRepository.save.mockImplementation(async (value) => value);

    const result = await service.transferGroupOwner('operator-1', 'group-1', {
      newOwnerId: 'user-2',
    });

    expect(groupMemberRepository.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'member-owner',
        role: 'admin',
      }),
    );
    expect(groupMemberRepository.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: 'member-admin',
        role: 'owner',
      }),
    );
    expect(groupRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'group-1',
        ownerId: 'user-2',
      }),
    );
    expect(mockAuditLogService.logUpdate).toHaveBeenCalledWith(
      'operator-1',
      'chat_groups',
      'group-1',
      expect.objectContaining({ ownerId: 'owner-1' }),
      expect.objectContaining({ ownerId: 'user-2' }),
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'group-1',
        ownerId: 'user-2',
      }),
    );
  });
});
