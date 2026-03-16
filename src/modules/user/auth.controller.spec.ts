import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  function createController() {
    const authService = {
      logoutDevice: jest.fn(),
      logoutOtherDevices: jest.fn(),
      listDeviceSessions: jest.fn(),
      logout: jest.fn(),
    };
    const userSyncService = {
      prepareUserConnection: jest.fn(),
    };
    const redisService = {
      isUserOnline: jest.fn(),
      get: jest.fn(),
    };

    const controller = new AuthController(
      authService as any,
      userSyncService as any,
      redisService as any,
    );

    return { controller, authService };
  }

  it('should list device sessions for authenticated user', async () => {
    const { controller, authService } = createController();
    authService.listDeviceSessions.mockResolvedValue({
      total: 1,
      items: [{ deviceId: 'ios-001', tokenCount: 2, conversationCount: 3, lastActiveAt: null, isCurrentDevice: true }],
    });

    const result = await controller.getDeviceSessions(
      { auth: { userId: 'user-1', deviceId: 'ios-001' } } as any,
      20,
    );

    expect(result.total).toBe(1);
    expect(authService.listDeviceSessions).toHaveBeenCalledWith('user-1', 'ios-001', 20);
  });

  it('should logout current device using authenticated deviceId', async () => {
    const { controller, authService } = createController();
    authService.logoutDevice.mockResolvedValue({
      deviceId: 'ios-001',
      revokedTokens: 2,
      clearedCursors: 4,
    });

    const result = await controller.logoutCurrentDevice(
      { auth: { userId: 'user-1', deviceId: 'ios-001' }, headers: {} } as any,
      undefined,
    );

    expect(result).toEqual({
      success: true,
      deviceId: 'ios-001',
      revokedTokens: 2,
      clearedCursors: 4,
    });
    expect(authService.logoutDevice).toHaveBeenCalledWith('user-1', 'ios-001', undefined, undefined);
  });

  it('should reject logout current device when token is not bound to deviceId', async () => {
    const { controller, authService } = createController();

    await expect(
      controller.logoutCurrentDevice(
        { auth: { userId: 'user-1' }, headers: {} } as any,
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(authService.logoutDevice).not.toHaveBeenCalled();
  });

  it('should logout specified target device for authenticated user', async () => {
    const { controller, authService } = createController();
    authService.logoutDevice.mockResolvedValue({
      deviceId: 'web-001',
      revokedTokens: 3,
      clearedCursors: 1,
    });

    const result = await controller.logoutDeviceById(
      { auth: { userId: 'user-1', deviceId: 'ios-001' } } as any,
      'web-001',
    );

    expect(result).toEqual({
      success: true,
      deviceId: 'web-001',
      revokedTokens: 3,
      clearedCursors: 1,
    });
    expect(authService.logoutDevice).toHaveBeenCalledWith('user-1', 'web-001');
  });

  it('should logout other devices and keep current device', async () => {
    const { controller, authService } = createController();
    authService.logoutOtherDevices.mockResolvedValue({
      currentDeviceId: 'ios-001',
      revokedTokens: 5,
      clearedCursors: 9,
    });

    const result = await controller.logoutOtherDevices(
      { auth: { userId: 'user-1', deviceId: 'ios-001' } } as any,
      undefined,
    );

    expect(result).toEqual({
      success: true,
      currentDeviceId: 'ios-001',
      revokedTokens: 5,
      clearedCursors: 9,
    });
    expect(authService.logoutOtherDevices).toHaveBeenCalledWith('user-1', 'ios-001');
  });

  it('should reject logout other devices when token has no bound deviceId', async () => {
    const { controller, authService } = createController();

    await expect(
      controller.logoutOtherDevices(
        { auth: { userId: 'user-1' } } as any,
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(authService.logoutOtherDevices).not.toHaveBeenCalled();
  });
});
