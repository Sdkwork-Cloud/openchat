import { WukongIMTokenService } from './wukongim-token.service';

describe('WukongIMTokenService', () => {
  function createService(secret: string = 'wukongim-token-service-test-secret') {
    return new WukongIMTokenService({
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'WUKONGIM_SECRET') {
          return secret;
        }
        if (key === 'JWT_SECRET') {
          return 'jwt-fallback-secret';
        }
        return defaultValue;
      }),
    } as any);
  }

  it('generates signed tokens that validate to the original user', () => {
    const service = createService();

    const token = service.generateToken('user-1');

    expect(service.validateToken(token)).toEqual({
      userId: 'user-1',
      valid: true,
    });
  });

  it('rejects tampered tokens', () => {
    const service = createService();
    const token = service.generateToken('user-2');
    const tampered = `${token}tampered`;

    expect(service.validateToken(tampered)).toEqual({
      userId: '',
      valid: false,
    });
  });

  it('rejects expired tokens', () => {
    const service = createService();
    const token = service.generateToken('user-3', -1);

    expect(service.validateToken(token)).toEqual({
      userId: '',
      valid: false,
    });
  });
});
