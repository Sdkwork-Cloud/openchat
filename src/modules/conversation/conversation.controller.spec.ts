import { ForbiddenException } from '@nestjs/common';
import { ConversationController } from './conversation.controller';

describe('ConversationController', () => {
  function createController() {
    const conversationService = {
      createConversation: jest.fn(),
      getConversationByIdForUser: jest.fn(),
      getConversationsByUserId: jest.fn(),
      getConversationSyncStateForUser: jest.fn(),
      getConversationSyncStatesForUser: jest.fn(),
      deleteDeviceReadCursorsForUser: jest.fn(),
      getDeviceReadCursorSummariesForUser: jest.fn(),
      deleteStaleDeviceReadCursorsForUser: jest.fn(),
      getConversationByTarget: jest.fn(),
      updateConversationForUser: jest.fn(),
      deleteConversationForUser: jest.fn(),
      pinConversationForUser: jest.fn(),
      muteConversationForUser: jest.fn(),
      clearUnreadCountForUser: jest.fn(),
      getTotalUnreadCount: jest.fn(),
      batchDeleteConversationsForUser: jest.fn(),
    };

    const controller = new ConversationController(conversationService as any);
    return { controller, conversationService };
  }

  it('should reject createConversation when request userId mismatches authenticated user', async () => {
    const { controller, conversationService } = createController();

    await expect(
      controller.createConversation(
        {
          type: 'single',
          targetId: 'user-2',
          userId: 'user-3',
        },
        { auth: { userId: 'user-1' } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(conversationService.createConversation).not.toHaveBeenCalled();
  });

  it('should always use authenticated userId when creating conversation', async () => {
    const { controller, conversationService } = createController();
    conversationService.createConversation.mockResolvedValue({ id: 'conv-1' });

    const result = await controller.createConversation(
      {
        type: 'single',
        targetId: 'user-2',
      },
      { auth: { userId: 'user-1' } } as any,
    );

    expect(result).toEqual({ id: 'conv-1' });
    expect(conversationService.createConversation).toHaveBeenCalledWith({
      type: 'single',
      targetId: 'user-2',
      userId: 'user-1',
    });
  });

  it('should fetch conversations using authenticated userId', async () => {
    const { controller, conversationService } = createController();
    conversationService.getConversationsByUserId.mockResolvedValue([{ id: 'conv-1' }]);

    const result = await controller.getConversationsByUserId(
      { auth: { userId: 'user-1' } } as any,
      'single',
      true,
      20,
      0,
    );

    expect(result).toEqual([{ id: 'conv-1' }]);
    expect(conversationService.getConversationsByUserId).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'single',
      isPinned: true,
      limit: 20,
      offset: 0,
    });
  });

  it('should resolve conversation target query with authenticated userId', async () => {
    const { controller, conversationService } = createController();
    conversationService.getConversationByTarget.mockResolvedValue({ id: 'conv-target' });

    const result = await controller.getConversationByTarget(
      'target-1',
      'group',
      { auth: { userId: 'user-1' } } as any,
    );

    expect(result).toEqual({ id: 'conv-target' });
    expect(conversationService.getConversationByTarget).toHaveBeenCalledWith(
      'user-1',
      'target-1',
      'group',
    );
  });

  it('should get conversation sync state using authenticated userId', async () => {
    const { controller, conversationService } = createController();
    conversationService.getConversationSyncStateForUser.mockResolvedValue({
      targetId: 'group-1',
      type: 'group',
      unreadCount: 3,
      lastReadSeq: 10,
      maxSeq: 20,
      pendingSeq: 10,
      isCaughtUp: false,
      serverTime: '2026-03-07T12:00:00.000Z',
    });

    const result = await controller.getConversationSyncState(
      'group-1',
      'group',
      { auth: { userId: 'user-1' } } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        targetId: 'group-1',
        type: 'group',
        maxSeq: 20,
      }),
    );
    expect(conversationService.getConversationSyncStateForUser).toHaveBeenCalledWith(
      'user-1',
      'group-1',
      'group',
    );
  });

  it('should get conversation sync states in batch using authenticated userId', async () => {
    const { controller, conversationService } = createController();
    conversationService.getConversationSyncStatesForUser.mockResolvedValue({
      total: 2,
      found: 1,
      missing: [{ targetId: 'user-9', type: 'single' }],
      items: [
        {
          targetId: 'group-1',
          type: 'group',
          unreadCount: 3,
          lastReadSeq: 10,
          maxSeq: 20,
          pendingSeq: 10,
          isCaughtUp: false,
          serverTime: '2026-03-07T12:00:00.000Z',
        },
      ],
    });

    const result = await controller.getConversationSyncStates(
      [
        { targetId: 'group-1', type: 'group' },
        { targetId: 'user-9', type: 'single' },
      ],
      { auth: { userId: 'user-1' } } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        total: 2,
        found: 1,
      }),
    );
    expect(conversationService.getConversationSyncStatesForUser).toHaveBeenCalledWith(
      'user-1',
      [
        { targetId: 'group-1', type: 'group' },
        { targetId: 'user-9', type: 'single' },
      ],
    );
  });

  it('should pass deviceId when querying single conversation sync state', async () => {
    const { controller, conversationService } = createController();
    conversationService.getConversationSyncStateForUser.mockResolvedValue({
      targetId: 'user-2',
      type: 'single',
      unreadCount: 0,
      lastReadSeq: 66,
      userLastReadSeq: 88,
      deviceId: 'ios-001',
      deviceLastReadSeq: 66,
      syncScope: 'device',
      maxSeq: 120,
      pendingSeq: 54,
      isCaughtUp: false,
      serverTime: '2026-03-08T08:00:00.000Z',
    });

    const result = await controller.getConversationSyncState(
      'user-2',
      'single',
      { auth: { userId: 'user-1', deviceId: 'ios-001' } } as any,
      'ios-001',
    );

    expect(result).toEqual(expect.objectContaining({ deviceId: 'ios-001', syncScope: 'device' }));
    expect(conversationService.getConversationSyncStateForUser).toHaveBeenCalledWith(
      'user-1',
      'user-2',
      'single',
      { deviceId: 'ios-001' },
    );
  });

  it('should prefer authenticated deviceId for single conversation sync state', async () => {
    const { controller, conversationService } = createController();
    conversationService.getConversationSyncStateForUser.mockResolvedValue({
      targetId: 'user-2',
      type: 'single',
      unreadCount: 0,
      lastReadSeq: 10,
      maxSeq: 10,
      pendingSeq: 0,
      isCaughtUp: true,
      serverTime: '2026-03-08T08:00:00.000Z',
    });

    await controller.getConversationSyncState(
      'user-2',
      'single',
      { auth: { userId: 'user-1', deviceId: 'trusted-01' } } as any,
      undefined,
    );

    expect(conversationService.getConversationSyncStateForUser).toHaveBeenCalledWith(
      'user-1',
      'user-2',
      'single',
      { deviceId: 'trusted-01' },
    );
  });

  it('should reject mismatched requested deviceId for single conversation sync state', async () => {
    const { controller, conversationService } = createController();

    await expect(
      controller.getConversationSyncState(
        'user-2',
        'single',
        { auth: { userId: 'user-1', deviceId: 'trusted-01' } } as any,
        'spoofed-99',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(conversationService.getConversationSyncStateForUser).not.toHaveBeenCalled();
  });

  it('should reject requested deviceId when token is not bound to a device', async () => {
    const { controller, conversationService } = createController();

    await expect(
      controller.getConversationSyncState(
        'user-2',
        'single',
        { auth: { userId: 'user-1' } } as any,
        'web-001',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(conversationService.getConversationSyncStateForUser).not.toHaveBeenCalled();
  });

  it('should pass deviceId when querying batch conversation sync state', async () => {
    const { controller, conversationService } = createController();
    conversationService.getConversationSyncStatesForUser.mockResolvedValue({
      total: 1,
      found: 1,
      missing: [],
      items: [
        {
          targetId: 'group-1',
          type: 'group',
          unreadCount: 0,
          lastReadSeq: 150,
          userLastReadSeq: 200,
          deviceId: 'android-001',
          deviceLastReadSeq: 150,
          syncScope: 'device',
          maxSeq: 220,
          pendingSeq: 70,
          isCaughtUp: false,
          serverTime: '2026-03-08T08:00:00.000Z',
        },
      ],
    });

    const result = await controller.getConversationSyncStates(
      [{ targetId: 'group-1', type: 'group' }],
      { auth: { userId: 'user-1', deviceId: 'android-001' } } as any,
      'android-001',
    );

    expect(result.found).toBe(1);
    expect(conversationService.getConversationSyncStatesForUser).toHaveBeenCalledWith(
      'user-1',
      [{ targetId: 'group-1', type: 'group' }],
      { deviceId: 'android-001' },
    );
  });

  it('should reject mismatched requested deviceId for batch sync state', async () => {
    const { controller, conversationService } = createController();

    await expect(
      controller.getConversationSyncStates(
        [{ targetId: 'group-1', type: 'group' }],
        { auth: { userId: 'user-1', deviceId: 'trusted-01' } } as any,
        'other-device',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(conversationService.getConversationSyncStatesForUser).not.toHaveBeenCalled();
  });

  it('should delete device sync state only for authenticated user', async () => {
    const { controller, conversationService } = createController();
    conversationService.deleteDeviceReadCursorsForUser.mockResolvedValue(4);

    const result = await controller.deleteDeviceSyncState(
      'ios-001',
      { auth: { userId: 'user-1', deviceId: 'ios-001' } } as any,
    );

    expect(result).toEqual({ success: true, deleted: 4 });
    expect(conversationService.deleteDeviceReadCursorsForUser).toHaveBeenCalledWith(
      'user-1',
      'ios-001',
    );
  });

  it('should reject delete device sync state when token deviceId mismatches path deviceId', async () => {
    const { controller, conversationService } = createController();

    await expect(
      controller.deleteDeviceSyncState(
        'ios-002',
        { auth: { userId: 'user-1', deviceId: 'ios-001' } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(conversationService.deleteDeviceReadCursorsForUser).not.toHaveBeenCalled();
  });

  it('should reject delete device sync state when token has no bound deviceId', async () => {
    const { controller, conversationService } = createController();

    await expect(
      controller.deleteDeviceSyncState(
        'ios-001',
        { auth: { userId: 'user-1' } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(conversationService.deleteDeviceReadCursorsForUser).not.toHaveBeenCalled();
  });

  it('should list device cursor summaries for authenticated user', async () => {
    const { controller, conversationService } = createController();
    conversationService.getDeviceReadCursorSummariesForUser.mockResolvedValue({
      total: 2,
      items: [
        { deviceId: 'ios-001', conversationCount: 10, lastActiveAt: '2026-03-08T10:00:00.000Z' },
        { deviceId: 'web-001', conversationCount: 3, lastActiveAt: '2026-03-08T09:00:00.000Z' },
      ],
    });

    const result = await controller.getDeviceSyncStateSummaries(
      { auth: { userId: 'user-1' } } as any,
      50,
    );

    expect(result.total).toBe(2);
    expect(conversationService.getDeviceReadCursorSummariesForUser).toHaveBeenCalledWith(
      'user-1',
      50,
    );
  });

  it('should cleanup stale device cursors for authenticated user', async () => {
    const { controller, conversationService } = createController();
    conversationService.deleteStaleDeviceReadCursorsForUser.mockResolvedValue(6);

    const result = await controller.deleteStaleDeviceSyncStates(
      { auth: { userId: 'user-1' } } as any,
      120,
    );

    expect(result).toEqual({ success: true, deleted: 6, inactiveDays: 120 });
    expect(conversationService.deleteStaleDeviceReadCursorsForUser).toHaveBeenCalledWith(
      'user-1',
      120,
    );
  });

  it('should get unread total using authenticated userId', async () => {
    const { controller, conversationService } = createController();
    conversationService.getTotalUnreadCount.mockResolvedValue(9);

    const result = await controller.getTotalUnreadCount(
      { auth: { userId: 'user-7' } } as any,
    );

    expect(result).toEqual({ total: 9 });
    expect(conversationService.getTotalUnreadCount).toHaveBeenCalledWith('user-7');
  });

  it('should batch delete conversations only for authenticated user', async () => {
    const { controller, conversationService } = createController();
    conversationService.batchDeleteConversationsForUser.mockResolvedValue(2);

    const result = await controller.batchDeleteConversations(
      ['conv-1', 'conv-2', 'conv-3'],
      { auth: { userId: 'user-8' } } as any,
    );

    expect(result).toEqual({ success: true, count: 2 });
    expect(conversationService.batchDeleteConversationsForUser).toHaveBeenCalledWith(
      ['conv-1', 'conv-2', 'conv-3'],
      'user-8',
    );
  });
});
