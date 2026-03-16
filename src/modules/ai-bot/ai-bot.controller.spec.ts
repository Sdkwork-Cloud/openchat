import { ForbiddenException } from '@nestjs/common';
import { AIBotController } from './ai-bot.controller';

describe('AIBotController', () => {
  function createController() {
    const aiBotService = {
      processMessage: jest.fn(),
      createBot: jest.fn(),
      getBots: jest.fn(),
      getBot: jest.fn(),
      updateBot: jest.fn(),
      deleteBot: jest.fn(),
      activateBot: jest.fn(),
      deactivateBot: jest.fn(),
    };

    const controller = new AIBotController(aiBotService as any);
    return { controller, aiBotService };
  }

  it('should reject processMessage when userId in body mismatches authenticated user', async () => {
    const { controller, aiBotService } = createController();

    await expect(controller.processMessage(
      'bot-1',
      { auth: { userId: 'user-1' } } as any,
      'hello',
      'user-2',
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(aiBotService.processMessage).not.toHaveBeenCalled();
  });

  it('should process message with authenticated userId when body userId not provided', async () => {
    const { controller, aiBotService } = createController();
    const response = { id: 'm1', response: 'ok' };
    aiBotService.processMessage.mockResolvedValue(response);

    const result = await controller.processMessage(
      'bot-1',
      { auth: { userId: 'user-1' } } as any,
      'hello',
      undefined,
    );

    expect(result).toEqual(response);
    expect(aiBotService.processMessage).toHaveBeenCalledWith('bot-1', 'user-1', 'hello');
  });

  it('should allow processMessage when body userId equals authenticated user', async () => {
    const { controller, aiBotService } = createController();
    aiBotService.processMessage.mockResolvedValue({ id: 'm2', response: 'ok2' });

    await controller.processMessage(
      'bot-2',
      { auth: { userId: 'user-7' } } as any,
      'ping',
      'user-7',
    );

    expect(aiBotService.processMessage).toHaveBeenCalledWith('bot-2', 'user-7', 'ping');
  });
});

