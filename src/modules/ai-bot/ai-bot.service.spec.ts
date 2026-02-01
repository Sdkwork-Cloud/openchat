import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIBotService } from './ai-bot.service';
import { AIBotEntity, BotMessageEntity } from './ai-bot.entity';

describe('AIBotService', () => {
  let service: AIBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'openchat_test',
          entities: [AIBotEntity, BotMessageEntity],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([AIBotEntity, BotMessageEntity]),
      ],
      providers: [AIBotService],
    }).compile();

    service = module.get<AIBotService>(AIBotService);
  });

  afterEach(async () => {
    // 清理测试数据
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a bot', async () => {
    const botData = {
      name: 'Test Bot',
      description: 'A test bot',
      type: 'general',
      config: {},
      isActive: true,
    };

    const bot = await service.createBot(botData);
    expect(bot).toBeDefined();
    expect(bot.name).toBe(botData.name);
    expect(bot.description).toBe(botData.description);
    expect(bot.type).toBe(botData.type);
    expect(bot.isActive).toBe(botData.isActive);
  });

  it('should process a message with default AI service', async () => {
    // 创建测试Bot
    const botData = {
      name: 'Test Bot',
      description: 'A test bot',
      type: 'general',
      config: {},
      isActive: true,
    };

    const bot = await service.createBot(botData);

    // 处理消息
    const message = 'Hello, how are you?';
    const result = await service.processMessage(bot.id, 'user1', message);

    expect(result).toBeDefined();
    expect(result.botId).toBe(bot.id);
    expect(result.userId).toBe('user1');
    expect(result.message).toBe(message);
    expect(result.status).toBe('completed');
    expect(result.response).toBeDefined();
  });

  it('should get all bots', async () => {
    // 创建两个测试Bot
    const botData1 = {
      name: 'Test Bot 1',
      description: 'A test bot',
      type: 'general',
      config: {},
      isActive: true,
    };

    const botData2 = {
      name: 'Test Bot 2',
      description: 'Another test bot',
      type: 'general',
      config: {},
      isActive: true,
    };

    await service.createBot(botData1);
    await service.createBot(botData2);

    const bots = await service.getBots();
    expect(bots).toBeDefined();
    expect(bots.length).toBeGreaterThanOrEqual(2);
  });
});
