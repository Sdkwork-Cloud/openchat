import { ForbiddenException } from '@nestjs/common';
import { BotOpenController } from './bot-open.controller';
import { REQUIRED_AUTH_STRATEGIES_KEY, REQUIRED_SCOPES_KEY } from '../../../common/auth/guards/multi-auth.guard';

describe('BotOpenController', () => {
  function createController() {
    const botService = {
      getBotById: jest.fn(),
    };
    const webhookService = {
      getWebhookStats: jest.fn(),
      sendEvent: jest.fn(),
    };

    const controller = new BotOpenController(
      botService as any,
      webhookService as any,
    );

    return { controller, botService, webhookService };
  }

  it('should return current bot profile when botId exists in auth context', async () => {
    const { controller, botService } = createController();
    const bot = { id: 'bot-1', username: 'helper-bot' };
    botService.getBotById.mockResolvedValue(bot);

    const result = await controller.getCurrentBot({
      auth: { botId: 'bot-1' },
    } as any);

    expect(result).toEqual(bot);
    expect(botService.getBotById).toHaveBeenCalledWith('bot-1');
  });

  it('should require bot-token auth strategy on controller', () => {
    const requiredStrategies = Reflect.getMetadata(
      REQUIRED_AUTH_STRATEGIES_KEY,
      BotOpenController,
    );

    expect(requiredStrategies).toEqual(['bot-token']);
  });

  it('should require webhook scope on webhook endpoints', () => {
    const webhookStatsScopes = Reflect.getMetadata(
      REQUIRED_SCOPES_KEY,
      BotOpenController.prototype.getWebhookStats,
    );
    const testEventScopes = Reflect.getMetadata(
      REQUIRED_SCOPES_KEY,
      BotOpenController.prototype.sendWebhookTestEvent,
    );

    expect(webhookStatsScopes).toEqual(['webhook']);
    expect(testEventScopes).toEqual(['webhook']);
  });

  it('should reject when botId missing in auth context', async () => {
    const { controller } = createController();

    await expect(controller.getCurrentBot({
      auth: {},
    } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should trigger webhook test event with default type', async () => {
    const { controller, webhookService } = createController();
    const webhookResult = { success: true, retryCount: 0, latency: 12 };
    webhookService.sendEvent.mockResolvedValue(webhookResult);

    const result = await controller.sendWebhookTestEvent(
      { auth: { botId: 'bot-2' } } as any,
      { data: { ping: true } },
    );

    expect(result).toEqual(webhookResult);
    expect(webhookService.sendEvent).toHaveBeenCalledWith(
      'bot-2',
      'bot.webhook.test',
      { ping: true },
    );
  });

  it('should trigger webhook test event with custom eventType', async () => {
    const { controller, webhookService } = createController();
    webhookService.sendEvent.mockResolvedValue({
      success: true,
      retryCount: 0,
      latency: 8,
    });

    await controller.sendWebhookTestEvent(
      { auth: { botId: 'bot-3' } } as any,
      { eventType: 'bot.custom.event', data: { x: 1 } },
    );

    expect(webhookService.sendEvent).toHaveBeenCalledWith(
      'bot-3',
      'bot.custom.event',
      { x: 1 },
    );
  });
});
