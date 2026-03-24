import { WukongIMAdminController } from './wukongim-admin.controller';
import { WukongIMAppController } from './wukongim-app.controller';
import { WukongIMService } from './wukongim.service';
import { ForbiddenException } from '@nestjs/common';

describe('WuKongIM API split controllers', () => {
  function createControllers() {
    const wukongIMService = {
      getConnectionConfig: jest.fn(),
      getUserToken: jest.fn(),
      getSystemInfo: jest.fn(),
      healthCheck: jest.fn(),
      createChannel: jest.fn(),
    } as unknown as WukongIMService;

    return {
      appController: new WukongIMAppController(wukongIMService),
      adminController: new WukongIMAdminController(wukongIMService),
      wukongIMService,
    };
  }

  it('should keep control-plane methods off the app controller surface', () => {
    const { appController } = createControllers();

    expect((appController as any).createChannel).toBeUndefined();
    expect((appController as any).getSystemInfo).toBeUndefined();
    expect((appController as any).healthCheck).toBeUndefined();
  });

  it('should return app realtime bootstrap config', async () => {
    const { appController, wukongIMService } = createControllers();
    (wukongIMService.getConnectionConfig as jest.Mock).mockReturnValue({
      uid: 'user-1',
      token: 'wk-token',
      wsUrl: 'ws://localhost:5200',
    });

    const result = await appController.getConfig({
      auth: { userId: 'user-1' },
    } as any);

    expect(result).toEqual({
      success: true,
      data: {
        uid: 'user-1',
        token: 'wk-token',
        wsUrl: 'ws://localhost:5200',
      },
    });
  });

  it('should return app realtime token', async () => {
    const { appController, wukongIMService } = createControllers();
    (wukongIMService.getUserToken as jest.Mock).mockResolvedValue('wk-token');

    const result = await appController.getToken({
      auth: { userId: 'user-1' },
    } as any);

    expect(result).toEqual({
      success: true,
      data: { token: 'wk-token' },
    });
  });

  it('should expose admin system info from the control plane controller', async () => {
    const { adminController, wukongIMService } = createControllers();
    const systemInfo = {
      version: '1.0.0',
      nodeId: 'wk-node-1',
    };
    (wukongIMService.getSystemInfo as jest.Mock).mockResolvedValue(systemInfo);

    const result = await adminController.getSystemInfo({
      auth: { userId: 'admin-1', roles: ['admin'] },
    } as any);

    expect(result).toEqual({
      success: true,
      data: systemInfo,
    });
  });

  it('should reject admin system info for non-admin users', async () => {
    const { adminController, wukongIMService } = createControllers();

    await expect(
      adminController.getSystemInfo({
        auth: { userId: 'user-1', roles: ['user'] },
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect((wukongIMService.getSystemInfo as jest.Mock).mock.calls).toHaveLength(
      0,
    );
  });

  it('should expose admin health checks from the control plane controller', async () => {
    const { adminController, wukongIMService } = createControllers();
    (wukongIMService.healthCheck as jest.Mock).mockResolvedValue(true);

    const result = await adminController.healthCheck({
      auth: { userId: 'admin-1', roles: ['admin'] },
    } as any);

    expect(result).toEqual({
      success: true,
      data: {
        status: 'healthy',
        timestamp: expect.any(String),
      },
    });
  });

  it('should reject admin health checks for non-admin users', async () => {
    const { adminController, wukongIMService } = createControllers();

    await expect(
      adminController.healthCheck({
        auth: { userId: 'user-1', roles: ['user'] },
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect((wukongIMService.healthCheck as jest.Mock).mock.calls).toHaveLength(
      0,
    );
  });
});
