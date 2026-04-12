import { CrawAgentService } from './craw-agent.service';

describe('CrawAgentService', () => {
  function createService() {
    const agentRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
      create: jest.fn((entity) => entity),
    };

    const service = new CrawAgentService(agentRepository as any);

    return {
      service,
      agentRepository,
    };
  }

  it('persists a normalized owner email for the authenticated agent', async () => {
    const { service, agentRepository } = createService();
    agentRepository.findOne.mockResolvedValue({
      id: 'agent-1',
      apiKey: 'craw_test_key',
      ownerEmail: null,
    });

    await service.setupOwnerEmail('craw_test_key', ' Owner@Example.COM ');

    expect(agentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'agent-1',
        ownerEmail: 'owner@example.com',
      }),
    );
  });

  it('rejects invalid owner email addresses', async () => {
    const { service, agentRepository } = createService();
    agentRepository.findOne.mockResolvedValue({
      id: 'agent-2',
      apiKey: 'craw_test_key_2',
      ownerEmail: null,
    });

    await expect(
      service.setupOwnerEmail('craw_test_key_2', 'not-an-email'),
    ).rejects.toThrow('Invalid owner email');
    expect(agentRepository.save).not.toHaveBeenCalled();
  });
});
