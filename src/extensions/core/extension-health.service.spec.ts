import { ExtensionHealthService } from './extension-health.service';
import { ExtensionStatus, ExtensionType } from './extension.interface';

describe('ExtensionHealthService', () => {
  it('disables auto recovery when module options explicitly turn it off', async () => {
    const extension = {
      meta: {
        id: 'ext-user-center',
        name: 'User Center Extension',
        version: '1.0.0',
      },
      type: ExtensionType.USER_CENTER,
      status: ExtensionStatus.ACTIVE,
      healthCheck: jest.fn().mockResolvedValue({
        healthy: false,
        message: 'upstream unavailable',
        timestamp: new Date(),
      }),
    };
    const extensionRegistry = {
      getAll: jest.fn(() => [extension]),
    };
    const lifecycleManager = {
      executeRestart: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'EXTENSION_AUTO_RECOVERY') {
          return true;
        }
        if (key === 'EXTENSION_UNHEALTHY_THRESHOLD') {
          return 1;
        }
        return defaultValue;
      }),
    };

    const service = new ExtensionHealthService(
      extensionRegistry as any,
      lifecycleManager as any,
      configService as any,
      { enableAutoRecovery: false } as any,
    );

    await service.checkExtensionHealth(extension as any);

    expect(lifecycleManager.executeRestart).not.toHaveBeenCalled();
  });
});
