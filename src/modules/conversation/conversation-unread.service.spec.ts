import { ConversationUnreadService } from './conversation-unread.service';

describe('ConversationUnreadService', () => {
  const mockRedis = {
    set: jest.fn(),
  };

  const mockConversationService = {
    setUnreadCount: jest.fn(),
  };

  let service: ConversationUnreadService;

  beforeEach(() => {
    service = new ConversationUnreadService(
      mockRedis as any,
      mockConversationService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize unread count in both redis and database', async () => {
    await service.initializeUnreadCount('conv-1', 1);

    expect(mockRedis.set).toHaveBeenCalledWith('conversation:unread:conv-1', 1);
    expect(mockConversationService.setUnreadCount).toHaveBeenCalledWith('conv-1', 1);
  });
});
