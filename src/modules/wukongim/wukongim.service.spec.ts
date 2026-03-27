import { WukongIMService } from './wukongim.service';

describe('WukongIMService', () => {
  function createService() {
    const wukongIMClient = {
      createUser: jest.fn(),
      getUserToken: jest.fn(),
      upsertUserToken: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        tcpAddr: '127.0.0.1:5100',
        wsUrl: 'ws://127.0.0.1:5200',
        apiUrl: 'http://127.0.0.1:5001',
        managerUrl: 'http://127.0.0.1:5300',
      }),
    };
    const metricsService = {
      startTimer: jest.fn(),
      endTimer: jest.fn(),
      recordMetric: jest.fn(),
    };

    const service = new WukongIMService(
      wukongIMClient as any,
      metricsService as any,
    );

    return {
      service,
      wukongIMClient,
      metricsService,
    };
  }

  it('registers a generated token via the current /user/token contract and returns it', async () => {
    const { service, wukongIMClient } = createService();
    wukongIMClient.upsertUserToken.mockResolvedValue({ status: 200 });

    const token = await service.getUserToken('user-1');

    expect(wukongIMClient.upsertUserToken).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-1',
        token: expect.any(String),
        device_flag: 1,
        device_level: 1,
      }),
    );
    expect(token).toBe(
      wukongIMClient.upsertUserToken.mock.calls[0][0].token,
    );
    expect(wukongIMClient.createUser).not.toHaveBeenCalled();
  });

  it('skips deprecated profile sync when no token is provided', async () => {
    const { service, wukongIMClient } = createService();

    const result = await service.createOrUpdateUser({
      uid: 'user-1',
      name: 'alice',
    });

    expect(result).toEqual({
      success: true,
      skipped: true,
    });
    expect(wukongIMClient.createUser).not.toHaveBeenCalled();
    expect(wukongIMClient.upsertUserToken).not.toHaveBeenCalled();
  });

  it('can register an explicit token for a specific device flag', async () => {
    const { service, wukongIMClient } = createService();
    wukongIMClient.upsertUserToken.mockResolvedValue({ status: 200 });

    await service.createOrUpdateUser({
      uid: 'user-2',
      token: 'wk-token-2',
      deviceFlag: 2,
      deviceLevel: 0,
    } as any);

    expect(wukongIMClient.upsertUserToken).toHaveBeenCalledWith({
      uid: 'user-2',
      token: 'wk-token-2',
      device_flag: 2,
      device_level: 0,
    });
    expect(wukongIMClient.createUser).not.toHaveBeenCalled();
  });
});
