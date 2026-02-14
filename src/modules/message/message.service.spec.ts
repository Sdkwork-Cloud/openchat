import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { IMProviderService } from '../im-provider/im-provider.service';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationUnreadService } from '../conversation/conversation-unread.service';
import { ContactService } from '../contact/contact.service';
import { MessageDeduplicationService } from './message-deduplication.service';
import { MessageFilterService } from './message-filter.service';
import { GroupMember } from '../group/group-member.entity';
import { GroupMessageBatchService } from '../group/group-message-batch.service';
import { DataSource } from 'typeorm';
import { EventBusService } from '../../common/events/event-bus.service';

describe('MessageService', () => {
  let service: MessageService;

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockGroupMemberRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockImProviderService = {
    sendMessage: jest.fn(),
  };

  const mockConversationService = {};

  const mockConversationUnreadService = {};

  const mockContactService = {};

  const mockDeduplicationService = {
    isDuplicate: jest.fn(),
  };

  const mockFilterService = {
    checkSingleMessagePermission: jest.fn(),
    checkGroupMessagePermission: jest.fn(),
  };

  const mockGroupMessageBatchService = {};

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockEventBus = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: mockGroupMemberRepository,
        },
        {
          provide: IMProviderService,
          useValue: mockImProviderService,
        },
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
        {
          provide: ConversationUnreadService,
          useValue: mockConversationUnreadService,
        },
        {
          provide: ContactService,
          useValue: mockContactService,
        },
        {
          provide: MessageDeduplicationService,
          useValue: mockDeduplicationService,
        },
        {
          provide: MessageFilterService,
          useValue: mockFilterService,
        },
        {
          provide: GroupMessageBatchService,
          useValue: mockGroupMessageBatchService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMessageById', () => {
    it('should return message by id', async () => {
      const mockMessage = {
        id: 'msg-123',
        uuid: 'uuid-123',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        content: { text: 'Hello' },
        type: 'text',
        status: 'sent',
        createdAt: new Date(),
      };
      mockMessageRepository.findOne.mockResolvedValue(mockMessage);

      const result = await service.getMessageById('msg-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('msg-123');
    });

    it('should return null if message not found', async () => {
      mockMessageRepository.findOne.mockResolvedValue(null);

      const result = await service.getMessageById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockMessageRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteMessage('msg-123');

      expect(result).toBe(true);
    });

    it('should return false if message not found', async () => {
      mockMessageRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.deleteMessage('nonexistent');

      expect(result).toBe(false);
    });
  });
});
