import { JWTAuthStrategy } from './jwt.strategy';

describe('JWTAuthStrategy', () => {
  function createStrategy(verifyAsync?: jest.Mock) {
    const jwtService = {
      verifyAsync: verifyAsync || jest.fn(),
    };
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    return {
      strategy: new JWTAuthStrategy(jwtService as any, configService as any),
      jwtService,
      configService,
    };
  }

  function createRequest(overrides: Record<string, unknown> = {}) {
    return {
      headers: {},
      query: {},
      cookies: {},
      ...overrides,
    } as any;
  }

  it('should handle bearer token when it looks like JWT', () => {
    const { strategy } = createStrategy();
    const request = createRequest({
      headers: {
        authorization: 'Bearer header.payload.signature',
      },
    });

    expect(strategy.canHandle(request)).toBe(true);
  });

  it('should not handle query token', () => {
    const { strategy } = createStrategy();
    const request = createRequest({
      query: {
        token: 'header.payload.signature',
      },
    });

    expect(strategy.canHandle(request)).toBe(false);
  });

  it('should not handle cookie token', () => {
    const { strategy } = createStrategy();
    const request = createRequest({
      cookies: {
        token: 'header.payload.signature',
      },
    });

    expect(strategy.canHandle(request)).toBe(false);
  });

  it('should not handle bearer bot token', () => {
    const { strategy } = createStrategy();
    const botToken =
      'oc_bot_12345678901234567890123456789012_' +
      '1234567890123456789012345678901234567890123456789012345678901234';
    const request = createRequest({
      headers: {
        authorization: `Bearer ${botToken}`,
      },
    });

    expect(strategy.canHandle(request)).toBe(false);
  });

  it('should not handle bearer craw key', () => {
    const { strategy } = createStrategy();
    const request = createRequest({
      headers: {
        authorization: 'Bearer craw_0123456789abcdef0123456789abcdef',
      },
    });

    expect(strategy.canHandle(request)).toBe(false);
  });

  it('should reject payload without userId', async () => {
    const verifyAsync = jest.fn().mockResolvedValue({
      sub: 'legacy-user-id',
      permissions: ['user:basic'],
    });
    const { strategy, jwtService } = createStrategy(verifyAsync);
    const request = createRequest({
      headers: {
        authorization: 'Bearer header.payload.signature',
      },
    });

    const result = await strategy.authenticate(request);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('header.payload.signature', {
      secret: 'test-secret',
    });
    expect(result).toMatchObject({
      success: false,
      error: 'Invalid token payload',
    });
  });

  it('should authenticate with userId payload', async () => {
    const verifyAsync = jest.fn().mockResolvedValue({
      userId: 'user-1',
      username: 'alice',
      permissions: ['user:basic', 'messages:read'],
      iat: 1,
      exp: 2,
    });
    const { strategy } = createStrategy(verifyAsync);
    const request = createRequest({
      headers: {
        authorization: 'Bearer header.payload.signature',
      },
    });

    const result = await strategy.authenticate(request);

    expect(result).toMatchObject({
      success: true,
      userId: 'user-1',
      scopes: ['user:basic', 'messages:read'],
      metadata: {
        username: 'alice',
        issuedAt: 1,
        expiresAt: 2,
      },
    });
  });
});
