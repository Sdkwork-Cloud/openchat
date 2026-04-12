import { RemoteUserManagerService } from './remote-user-manager.service';

describe('RemoteUserManagerService', () => {
  it('should preserve the upstream error as cause when createUser fails', async () => {
    const upstreamError = new Error('user api unavailable');
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'USER_SERVICE_URL') {
          return 'http://user-service.test';
        }

        if (key === 'USER_SERVICE_API_KEY') {
          return 'test-api-key';
        }

        return undefined;
      }),
    };
    const httpService = {
      post: jest.fn(() => ({
        toPromise: jest.fn().mockRejectedValue(upstreamError),
      })),
    };

    const service = new RemoteUserManagerService(
      configService as never,
      httpService as never,
    );

    await expect(
      service.createUser({
        username: 'alice',
        email: 'alice@example.com',
        phone: '13800138000',
        nickname: 'Alice',
        password: 'hashed-password',
      }),
    ).rejects.toMatchObject({
      message: 'Failed to create user',
      cause: upstreamError,
    });
  });
});
