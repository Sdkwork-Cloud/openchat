import { GroupMessageBatchService } from './group-message-batch.service';

describe('GroupMessageBatchService', () => {
  const pipeline = {
    del: jest.fn(),
    exec: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(() => ({
      pipeline: jest.fn(() => pipeline),
    })),
  };

  const mockConversationRepository = {
    create: jest.fn(),
  };

  const mockGroupMemberRepository = {
    find: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  let service: GroupMessageBatchService;
  let entityCounter = 0;

  beforeEach(() => {
    entityCounter = 0;
    mockRedisService.getClient.mockReturnValue({
      pipeline: jest.fn(() => pipeline),
    });
    mockConversationRepository.create.mockImplementation((input: Record<string, unknown>) => {
      entityCounter += 1;
      return {
        id: `conv-${entityCounter}`,
        uuid: `uuid-${entityCounter}`,
        ...input,
      };
    });
    pipeline.del.mockReturnValue(pipeline);
    pipeline.exec.mockResolvedValue([]);
    service = new GroupMessageBatchService(
      mockConversationRepository as any,
      mockGroupMemberRepository as any,
      mockRedisService as any,
      mockDataSource as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should preserve the newest group message snapshot during batch upsert', async () => {
    mockGroupMemberRepository.find.mockResolvedValue([
      { userId: 'sender' },
      { userId: 'user-2' },
    ]);
    mockDataSource.query.mockResolvedValue([{ id: 'conv-1' }]);

    const messageTime = new Date('2026-03-23T10:00:00.000Z');
    const result = await service.batchUpdateConversations(
      'group-1',
      'sender',
      'msg-2',
      'hello',
      messageTime,
    );

    expect(result).toEqual({
      success: true,
      processed: 1,
      failed: 0,
    });
    expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    const [sql] = mockDataSource.query.mock.calls[0];
    expect(sql).toContain('chat_conversations.last_message_time IS NULL');
    expect(sql).toContain('chat_conversations.last_message_time <= EXCLUDED.last_message_time');
    expect(sql).toContain('ELSE chat_conversations.last_message_id');
    expect(sql).toContain('ELSE chat_conversations.last_message_content');
    expect(sql).toContain('ELSE chat_conversations.last_message_time');
    expect(pipeline.del).toHaveBeenCalledWith('conversation:unread:conv-1');
  });
});
