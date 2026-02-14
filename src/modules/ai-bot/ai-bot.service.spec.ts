import { Test, TestingModule } from '@nestjs/testing';
import { AIBotService } from './ai-bot.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AIBotEntity, BotMessageEntity } from './ai-bot.entity';

describe('AIBotService', () => {
  let service: AIBotService;

  const mockBotRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const mockMessageRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIBotService,
        {
          provide: getRepositoryToken(AIBotEntity),
          useValue: mockBotRepository,
        },
        {
          provide: getRepositoryToken(BotMessageEntity),
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    service = module.get<AIBotService>(AIBotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
