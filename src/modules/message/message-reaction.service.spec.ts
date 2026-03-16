import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventBusService } from '../../common/events/event-bus.service';
import { MessageReaction } from './message-reaction.entity';
import {
  MessageReactionService,
  MessageReactionSummaryResult,
} from './message-reaction.service';
import { MessageStatus } from './message.interface';
import { MessageService } from './message.service';

describe('MessageReactionService', () => {
  let service: MessageReactionService;

  const mockReactionRepository = {
    findOne: jest.fn(),
    create: jest.fn((input: object) => input),
    save: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const mockMessageService = {
    getMessageById: jest.fn(),
    canUserAccessMessage: jest.fn(),
  };
  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageReactionService,
        {
          provide: getRepositoryToken(MessageReaction),
          useValue: mockReactionRepository,
        },
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<MessageReactionService>(MessageReactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add a reaction and return aggregated summary with viewer state', async () => {
    mockMessageService.getMessageById.mockResolvedValue({
      id: 'msg-1',
      fromUserId: 'user-2',
      toUserId: 'user-1',
      status: MessageStatus.SENT,
    });
    mockMessageService.canUserAccessMessage.mockResolvedValue(true);
    mockReactionRepository.findOne.mockResolvedValue(null);
    mockReactionRepository.save.mockResolvedValue({ id: 'reaction-1' });
    mockReactionRepository.find.mockResolvedValue([
      { emoji: '👍', userId: 'user-1' },
      { emoji: '👍', userId: 'user-2' },
      { emoji: '🔥', userId: 'user-2' },
    ]);

    const result = await service.setReaction('msg-1', 'user-1', '👍', true);

    expect(mockReactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'msg-1',
        userId: 'user-1',
        emoji: '👍',
      }),
    );
    expect(result).toEqual<MessageReactionSummaryResult>({
      messageId: 'msg-1',
      totalReactions: 3,
      items: [
        { emoji: '👍', count: 2, reacted: true },
        { emoji: '🔥', count: 1, reacted: false },
      ],
    });
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'custom.event',
      expect.objectContaining({
        type: 'message.realtime.fanout',
        eventType: 'messageReactionUpdated',
        conversationType: 'single',
        messageId: 'msg-1',
        fromUserId: 'user-2',
        toUserId: 'user-1',
        payload: expect.objectContaining({
          eventType: 'messageReactionUpdated',
          stateVersion: 1,
          totalReactions: 3,
          reaction: expect.objectContaining({
            emoji: '👍',
            active: true,
            actorUserId: 'user-1',
          }),
        }),
      }),
      expect.objectContaining({
        async: true,
        broadcast: true,
      }),
    );
  });

  it('should delete an existing reaction when active is false', async () => {
    mockMessageService.getMessageById.mockResolvedValue({ id: 'msg-1' });
    mockMessageService.canUserAccessMessage.mockResolvedValue(true);
    mockReactionRepository.findOne.mockResolvedValue({ id: 'reaction-1' });
    mockReactionRepository.find.mockResolvedValue([
      { emoji: '🔥', userId: 'user-2' },
    ]);

    const result = await service.setReaction('msg-1', 'user-1', '👍', false);

    expect(mockReactionRepository.delete).toHaveBeenCalledWith({
      messageId: 'msg-1',
      userId: 'user-1',
      emoji: '👍',
    });
    expect(result).toEqual<MessageReactionSummaryResult>({
      messageId: 'msg-1',
      totalReactions: 1,
      items: [
        { emoji: '🔥', count: 1, reacted: false },
      ],
    });
  });
});
