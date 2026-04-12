import { ConfigService } from '@nestjs/config';
import { MemoryManagerService } from './memory-manager.service';

describe('MemoryManagerService', () => {
  let service: MemoryManagerService;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'MEMORY_SEARCH_THRESHOLD') {
          return 0.7;
        }
        return defaultValue;
      }),
    } as unknown as ConfigService;

    service = new MemoryManagerService(
      configService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('filters merged hybrid search results by type and threshold', async () => {
    jest.spyOn(service, 'semanticSearch').mockResolvedValue([
      {
        memory: { id: 'memory-1', type: 'semantic' } as never,
        score: 0.9,
        relevance: 0.9,
      },
      {
        memory: { id: 'memory-2', type: 'episodic' } as never,
        score: 0.8,
        relevance: 0.8,
      },
    ]);
    jest.spyOn(service, 'fullTextSearch').mockResolvedValue([
      {
        memory: { id: 'memory-1', type: 'semantic' } as never,
        score: 1,
        relevance: 1,
      },
      {
        memory: { id: 'memory-3', type: 'semantic' } as never,
        score: 1,
        relevance: 1,
      },
    ]);

    const results = await service.hybridSearch('project update', 'agent-1', 10, {
      threshold: 0.7,
      type: 'semantic',
    });

    expect(results).toEqual([
      expect.objectContaining({
        memory: expect.objectContaining({
          id: 'memory-1',
          type: 'semantic',
        }),
      }),
    ]);
  });
});
