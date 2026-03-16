import { CrawAgentAuthStrategy } from './craw-agent.strategy';

describe('CrawAgentAuthStrategy', () => {
  function createStrategy() {
    const crawAgentRepository = {
      findOne: jest.fn(),
    };

    const strategy = new CrawAgentAuthStrategy(crawAgentRepository as any);
    return { strategy, crawAgentRepository };
  }

  it('should handle bearer craw api key', () => {
    const { strategy } = createStrategy();

    const result = strategy.canHandle({
      headers: { authorization: 'Bearer craw_0123456789abcdef0123456789abcdef' },
      query: {},
    } as any);

    expect(result).toBe(true);
  });

  it('should handle x-craw-api-key header', () => {
    const { strategy } = createStrategy();

    const result = strategy.canHandle({
      headers: { 'x-craw-api-key': 'craw_0123456789abcdef0123456789abcdef' },
      query: {},
    } as any);

    expect(result).toBe(true);
  });

  it('should not handle craw_api_key query parameter', () => {
    const { strategy } = createStrategy();

    const result = strategy.canHandle({
      headers: {},
      query: { craw_api_key: 'craw_0123456789abcdef0123456789abcdef' },
    } as any);

    expect(result).toBe(false);
  });

  it('should authenticate active craw agent', async () => {
    const { strategy, crawAgentRepository } = createStrategy();
    crawAgentRepository.findOne.mockResolvedValue({
      id: 'agent-id',
      name: 'agent-name',
      isActive: true,
    });

    const result = await strategy.authenticate({
      headers: { authorization: 'Bearer craw_0123456789abcdef0123456789abcdef' },
      query: {},
    } as any);

    expect(result.success).toBe(true);
    expect(result.userId).toBe('agent-id');
    expect(result.scopes).toEqual(['craw:basic']);
    expect(result.metadata).toMatchObject({
      type: 'craw-agent',
      crawAgentId: 'agent-id',
      agentName: 'agent-name',
    });
  });

  it('should reject invalid key format', async () => {
    const { strategy } = createStrategy();

    const result = await strategy.authenticate({
      headers: { authorization: 'Bearer invalid' },
      query: {},
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid Craw API key format');
  });
});
