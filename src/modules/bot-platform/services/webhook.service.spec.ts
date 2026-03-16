import * as crypto from 'crypto';
import axios from 'axios';
import { WebhookService } from './webhook.service';

jest.mock('axios');

describe('WebhookService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  function createService() {
    const botRepository = {
      findOne: jest.fn(),
    };
    const intervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((() => 0) as any);
    const service = new WebhookService(botRepository as any);
    return { service, botRepository, intervalSpy };
  }

  it('should verify signature with and without sha256 prefix', () => {
    const { service, intervalSpy } = createService();
    const secret = 'webhook-secret';
    const payload = JSON.stringify({ event: 'test' });
    const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(service.verifySignature(payload, `sha256=${digest}`, secret)).toBe(true);
    expect(service.verifySignature(payload, digest, secret)).toBe(true);
    expect(service.verifySignature(payload, 'sha256=invalid', secret)).toBe(false);

    intervalSpy.mockRestore();
  });

  it('should include nonce and idempotency headers when delivering webhook', async () => {
    const { service, botRepository, intervalSpy } = createService();
    botRepository.findOne.mockResolvedValue({
      id: 'bot-1',
      username: 'demo-bot',
      status: 'active',
      webhook: {
        url: 'https://example.com/webhook',
        secret: 'webhook-secret',
        timeout: 5000,
        events: ['*'],
        retryPolicy: {
          maxRetries: 3,
          backoffType: 'fixed',
          initialDelay: 1000,
          maxDelay: 30000,
        },
      },
    });
    mockedAxios.post.mockResolvedValue({ status: 200 } as any);

    const result = await service.sendEvent('bot-1', 'bot.webhook.test', { ping: true });

    expect(result.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    const [, payload, config] = mockedAxios.post.mock.calls[0] as [string, any, any];
    const headers = config.headers as Record<string, string>;

    expect(payload.nonce).toMatch(/^[a-f0-9]{24}$/);
    expect(headers['X-OpenChat-Nonce']).toBe(payload.nonce);
    expect(headers['X-OpenChat-Event-Id']).toBe(payload.eventId);
    expect(headers['Idempotency-Key']).toBe(payload.eventId);
    expect(headers['X-OpenChat-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);

    intervalSpy.mockRestore();
  });

  it('should validate webhook timestamp with default tolerance', () => {
    const { service, intervalSpy } = createService();
    const now = Date.now();

    expect(service.verifyTimestamp(now)).toBe(true);
    expect(service.verifyTimestamp(now - 10 * 60 * 1000)).toBe(false);

    intervalSpy.mockRestore();
  });
});
