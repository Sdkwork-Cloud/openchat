import { MemoryController } from './memory.controller';
import { MemoryType } from './dto/memory.dto';

describe('MemoryController', () => {
  it('forwards type and threshold to hybrid search', async () => {
    const memoryManager = {
      hybridSearch: jest.fn().mockResolvedValue([]),
    };
    const knowledgeService = {};
    const controller = new MemoryController(
      memoryManager as never,
      knowledgeService as never,
    );

    await controller.searchMemories(
      'agent-1',
      'hello world',
      MemoryType.SEMANTIC,
      7,
      0.85,
    );

    expect(memoryManager.hybridSearch).toHaveBeenCalledWith(
      'hello world',
      'agent-1',
      7,
      {
        threshold: 0.85,
        type: MemoryType.SEMANTIC,
      },
    );
  });
});
