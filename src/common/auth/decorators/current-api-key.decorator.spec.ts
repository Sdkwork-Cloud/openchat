import { UnauthorizedException } from '@nestjs/common';
import { resolveCurrentApiKey } from './current-api-key.decorator';

describe('resolveCurrentApiKey', () => {
  it('should return api key from user context first', () => {
    const result = resolveCurrentApiKey({
      user: { apiKey: 'craw_user_key' },
      auth: { metadata: { apiKey: 'craw_metadata_key' } },
    });

    expect(result).toBe('craw_user_key');
  });

  it('should fallback to auth metadata api key', () => {
    const result = resolveCurrentApiKey({
      user: {},
      auth: { metadata: { apiKey: 'craw_metadata_key' } },
    });

    expect(result).toBe('craw_metadata_key');
  });

  it('should return undefined when optional and api key missing', () => {
    const result = resolveCurrentApiKey(
      {
        user: {},
        auth: { metadata: {} },
      },
      { optional: true },
    );

    expect(result).toBeUndefined();
  });

  it('should throw unauthorized when required and api key missing', () => {
    expect(() =>
      resolveCurrentApiKey({
        user: {},
        auth: { metadata: {} },
      }),
    ).toThrow(UnauthorizedException);
  });
});
