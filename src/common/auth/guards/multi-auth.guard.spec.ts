import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { MultiAuthGuard } from './multi-auth.guard';

describe('MultiAuthGuard', () => {
  function createContext(request: Record<string, unknown> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({} as any),
      getClass: () => ({} as any),
    } as ExecutionContext;
  }

  function createReflector(requiredAuthStrategies?: string[]) {
    return {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'allowAnonymous') return false;
        if (key === 'requiredAuthStrategies') return requiredAuthStrategies;
        return undefined;
      }),
    };
  }

  it('should reject when required auth strategy does not match', async () => {
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-1',
        scopes: ['user:basic'],
        metadata: { authStrategy: 'jwt' },
      }),
    };

    const reflector = createReflector(['bot-token']);

    const guard = new MultiAuthGuard(authManager as any, reflector as any);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should reject bot-open route when jwt auth is used', async () => {
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-1',
        scopes: ['user:basic'],
        metadata: { authStrategy: 'jwt' },
      }),
    };
    const reflector = createReflector(['bot-token']);
    const guard = new MultiAuthGuard(authManager as any, reflector as any);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should reject craw route when bot-token auth is used', async () => {
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        botId: 'bot-1',
        scopes: ['bot:basic'],
        metadata: { authStrategy: 'bot-token' },
      }),
    };
    const reflector = createReflector(['craw-agent']);
    const guard = new MultiAuthGuard(authManager as any, reflector as any);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should reject user route when craw-agent auth is used', async () => {
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-craw',
        scopes: ['api:basic'],
        metadata: { authStrategy: 'craw-agent' },
      }),
    };
    const reflector = createReflector(['jwt']);
    const guard = new MultiAuthGuard(authManager as any, reflector as any);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should pass when auth strategy matches required strategy', async () => {
    const request: Record<string, unknown> = {};
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        botId: 'bot-2',
        scopes: ['bot:basic'],
        metadata: { authStrategy: 'bot-token' },
      }),
    };
    const reflector = createReflector(['bot-token']);
    const guard = new MultiAuthGuard(authManager as any, reflector as any);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect((request as any).auth).toMatchObject({
      botId: 'bot-2',
      authStrategy: 'bot-token',
    });
  });

  it('should attach auth info when authentication succeeds', async () => {
    const request: Record<string, unknown> = {};
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-1',
        scopes: ['user:basic'],
        metadata: { authStrategy: 'jwt', tenantId: 'tenant-1' },
      }),
    };

    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'allowAnonymous') return false;
        return undefined;
      }),
    };

    const guard = new MultiAuthGuard(authManager as any, reflector as any);
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect((request as any).auth).toMatchObject({
      userId: 'user-1',
      authStrategy: 'jwt',
      scopes: ['user:basic'],
    });
    expect((request as any).user).toMatchObject({
      userId: 'user-1',
      authStrategy: 'jwt',
      tenantId: 'tenant-1',
    });
  });

  it('should reject when authentication fails', async () => {
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: false,
        error: 'invalid token',
      }),
    };

    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'allowAnonymous') return false;
        return undefined;
      }),
    };

    const guard = new MultiAuthGuard(authManager as any, reflector as any);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should attach auth on anonymous route when optional credentials are valid', async () => {
    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer token',
      },
      query: {},
    };
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-optional',
        scopes: ['user:basic'],
        metadata: { authStrategy: 'jwt' },
      }),
    };

    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'allowAnonymous') return true;
        return undefined;
      }),
    };

    const guard = new MultiAuthGuard(authManager as any, reflector as any);
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(authManager.authenticate).toHaveBeenCalledTimes(1);
    expect((request as any).auth).toMatchObject({
      userId: 'user-optional',
      authStrategy: 'jwt',
    });
  });

  it('should keep anonymous route accessible when optional credentials are invalid', async () => {
    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
      query: {},
    };
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: false,
        error: 'invalid token',
      }),
    };

    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'allowAnonymous') return true;
        return undefined;
      }),
    };

    const guard = new MultiAuthGuard(authManager as any, reflector as any);
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(authManager.authenticate).toHaveBeenCalledTimes(1);
    expect((request as any).auth).toBeUndefined();
  });

  it('should ignore query auth hints on anonymous route', async () => {
    const request: Record<string, unknown> = {
      headers: {},
      query: {
        token: 'legacy-token',
      },
    };
    const authManager = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-query',
        scopes: ['user:basic'],
        metadata: { authStrategy: 'jwt' },
      }),
    };

    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'allowAnonymous') return true;
        return undefined;
      }),
    };

    const guard = new MultiAuthGuard(authManager as any, reflector as any);
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(authManager.authenticate).toHaveBeenCalledTimes(0);
    expect((request as any).auth).toBeUndefined();
  });
});
