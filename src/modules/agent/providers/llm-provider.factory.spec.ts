import { ConfigService } from '@nestjs/config';
import { ILLMProvider, LLMProviderFactory } from './llm-provider.factory';

describe('LLMProviderFactory', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
  });

  it('throws a clear error when no providers are configured', () => {
    const factory = new LLMProviderFactory(configService);

    expect(() => factory.getProvider('missing')).toThrow('No LLM providers are configured');
  });

  it('falls back to the first registered provider when the requested provider is missing', () => {
    const factory = new LLMProviderFactory(configService);
    const fallbackProvider: ILLMProvider = {
      chat: async () => {
        throw new Error('not used');
      },
      chatStream: async function* () {
        yield* [];
      },
    };

    factory.registerProvider('custom', fallbackProvider);

    expect(factory.getProvider('missing')).toBe(fallbackProvider);
  });
});
