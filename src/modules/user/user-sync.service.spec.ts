import { UserSyncService } from './user-sync.service';

describe('UserSyncService', () => {
  function createService(wukongimEnabled: string | undefined) {
    const userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    const wukongIMService = {
      createOrUpdateUser: jest.fn(),
      getUserToken: jest.fn(),
      getConnectionConfig: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'WUKONGIM_ENABLED') {
          return wukongimEnabled ?? fallback;
        }
        return fallback;
      }),
    };

    const service = new UserSyncService(
      userRepository as any,
      wukongIMService as any,
      configService as any,
    );

    return {
      service,
      userRepository,
      wukongIMService,
      configService,
    };
  }

  it.each(['false', '0', 'no', 'off'])(
    'should disable IM sync when WUKONGIM_ENABLED=%s',
    async (rawValue) => {
      const { service, userRepository, wukongIMService } = createService(rawValue);

      await expect(service.prepareUserConnection('user-1')).resolves.toEqual({ enabled: false });
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(wukongIMService.createOrUpdateUser).not.toHaveBeenCalled();
    },
  );

  it('should keep IM sync enabled by default', async () => {
    const { service, userRepository, wukongIMService } = createService(undefined);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      nickname: 'Admin',
      avatar: undefined,
    });
    wukongIMService.createOrUpdateUser.mockResolvedValue(undefined);
    wukongIMService.getUserToken.mockResolvedValue('token-1');
    wukongIMService.getConnectionConfig.mockReturnValue({
      tcpAddr: '127.0.0.1:5100',
      wsUrl: 'ws://127.0.0.1:5200',
      apiUrl: 'http://127.0.0.1:5001',
      uid: 'user-1',
    });

    await expect(service.prepareUserConnection('user-1')).resolves.toEqual({
      enabled: true,
      config: {
        tcpAddr: '127.0.0.1:5100',
        wsUrl: 'ws://127.0.0.1:5200',
        apiUrl: 'http://127.0.0.1:5001',
        uid: 'user-1',
        token: 'token-1',
      },
    });
  });
});
