import { ExtensionStatus, ExtensionType } from '../core/extension.interface';
import { UserCenterProxy } from './user-center.proxy';

describe('UserCenterProxy', () => {
  it('prefers primaryUserCenterId from module options over config fallback', async () => {
    const primaryExtension = {
      type: ExtensionType.USER_CENTER,
      status: ExtensionStatus.ACTIVE,
      meta: {
        id: 'remote-user-center',
        name: 'Remote User Center',
        version: '1.0.0',
      },
      capabilities: {},
    };
    const extensionRegistry = {
      get: jest.fn((id: string) => {
        if (id === 'remote-user-center') {
          return primaryExtension;
        }
        return null;
      }),
      getPrimary: jest.fn(),
    };
    const configService = {
      get: jest.fn(() => 'default-user-center'),
    };

    const proxy = new UserCenterProxy(
      extensionRegistry as any,
      configService as any,
      { primaryUserCenterId: 'remote-user-center' } as any,
    );

    await proxy.onModuleInit();

    expect(extensionRegistry.get).toHaveBeenCalledWith('remote-user-center');
    expect(extensionRegistry.getPrimary).not.toHaveBeenCalled();
    expect(proxy.getStatus()).toEqual(
      expect.objectContaining({
        available: true,
        extensionId: 'remote-user-center',
      }),
    );
  });
});
