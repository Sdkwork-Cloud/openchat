import { ForbiddenException } from '@nestjs/common';
import {
  RtcProviderHealthQueryDto,
  RtcProviderOperationStatsQueryDto,
} from './dto/rtc.dto';
import { RtcAdminController } from './rtc-admin.controller';
import { RtcAppController } from './rtc-app.controller';
import { RTCService } from './rtc.service';

describe('RTC API split controllers', () => {
  function createController() {
    const rtcService = {
      getProviderOperationStats: jest.fn(),
      getProviderHealthReport: jest.fn(),
      validateToken: jest.fn(),
      getRoomById: jest.fn(),
      getProviderCapabilities: jest.fn(),
    } as unknown as RTCService;

    return {
      appController: new RtcAppController(rtcService),
      adminController: new RtcAdminController(rtcService),
      rtcService,
    };
  }

  it('should keep provider stats off the app controller surface', () => {
    const { appController } = createController();

    expect((appController as any).getProviderOperationStats).toBeUndefined();
    expect((appController as any).getProviderHealthReport).toBeUndefined();
  });

  it('should reject provider stats query for non-admin user', async () => {
    const { adminController, rtcService } = createController();

    await expect(adminController.getProviderOperationStats(
      {
        id: 'user-1',
        username: 'alice',
        roles: ['user'],
      } as any,
      { provider: 'tencent', operation: 'generateToken' },
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect((rtcService.getProviderOperationStats as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('should return provider stats for admin user and pass query through', async () => {
    const { adminController, rtcService } = createController();
    const stats = [
      {
        provider: 'volcengine',
        operation: 'generateToken',
        total: 12,
        success: 12,
        failure: 0,
        retryableFailure: 0,
        avgDurationMs: 85,
        lastStatus: 'success',
        lastDurationMs: 80,
        topErrors: [],
        updatedAt: new Date(),
      },
    ];
    (rtcService.getProviderOperationStats as jest.Mock).mockReturnValue(stats);

    const query: RtcProviderOperationStatsQueryDto = {
      provider: 'volcengine',
      operation: 'generateToken',
      windowMinutes: 60,
      topErrorLimit: 5,
    };
    const result = await adminController.getProviderOperationStats(
      {
        id: 'admin-1',
        username: 'ops-admin',
        roles: ['admin'],
      } as any,
      query,
    );

    expect(result).toBe(stats);
    expect((rtcService.getProviderOperationStats as jest.Mock).mock.calls).toEqual([[query]]);
  });

  it('should reject provider health query for non-admin user', async () => {
    const { adminController, rtcService } = createController();

    await expect(adminController.getProviderHealthReport(
      {
        id: 'user-2',
        username: 'bob',
        roles: [],
      } as any,
      { windowMinutes: 30 },
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect((rtcService.getProviderHealthReport as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('should allow provider health query by username admin fallback and pass query through', async () => {
    const { adminController, rtcService } = createController();
    const report = {
      generatedAt: new Date(),
      windowMinutes: 30,
      operation: 'generateToken',
      recommendedPrimary: 'volcengine',
      fallbackOrder: ['volcengine', 'tencent', 'alibaba'],
      providers: [],
    };
    (rtcService.getProviderHealthReport as jest.Mock).mockReturnValue(report);

    const query: RtcProviderHealthQueryDto = {
      operation: 'generateToken',
      windowMinutes: 30,
      minSamples: 10,
      degradedFailureRate: 0.2,
      unhealthyFailureRate: 0.4,
    };
    const result = await adminController.getProviderHealthReport(
      {
        id: 'admin-2',
        username: 'admin',
        roles: [],
      } as any,
      query,
    );

    expect(result).toBe(report);
    expect((rtcService.getProviderHealthReport as jest.Mock).mock.calls).toEqual([[query]]);
  });

  it('should validate rtc token for token owner', async () => {
    const { appController, rtcService } = createController();
    const expiresAt = new Date('2026-03-01T00:00:00.000Z');
    (rtcService.validateToken as jest.Mock).mockResolvedValue({
      roomId: 'room-1',
      userId: 'user-1',
      provider: 'volcengine',
      channelId: 'channel-1',
      role: 'participant',
      expiresAt,
    });

    const result = await appController.validateToken(
      {
        id: 'user-1',
        username: 'alice',
        roles: ['user'],
      } as any,
      { token: 'valid-token' },
    );

    expect(result).toEqual({
      valid: true,
      roomId: 'room-1',
      userId: 'user-1',
      provider: 'volcengine',
      channelId: 'channel-1',
      role: 'participant',
      expiresAt,
    });
    expect((rtcService.validateToken as jest.Mock).mock.calls).toEqual([['valid-token']]);
  });

  it('should validate rtc token for room participant', async () => {
    const { appController, rtcService } = createController();
    (rtcService.validateToken as jest.Mock).mockResolvedValue({
      roomId: 'room-2',
      userId: 'user-2',
      provider: 'tencent',
      expiresAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    (rtcService.getRoomById as jest.Mock).mockResolvedValue({
      id: 'room-2',
      participants: ['user-1', 'user-2'],
    });

    const result = await appController.validateToken(
      {
        id: 'user-1',
        username: 'member',
        roles: ['user'],
      } as any,
      { token: 'participant-token' },
    );

    expect(result.valid).toBe(true);
    expect((rtcService.getRoomById as jest.Mock).mock.calls).toEqual([['room-2']]);
  });

  it('should reject rtc token validation for non-owner and non-participant', async () => {
    const { appController, rtcService } = createController();
    (rtcService.validateToken as jest.Mock).mockResolvedValue({
      roomId: 'room-3',
      userId: 'user-2',
      provider: 'volcengine',
      expiresAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    (rtcService.getRoomById as jest.Mock).mockResolvedValue({
      id: 'room-3',
      participants: ['user-2', 'user-3'],
    });

    await expect(appController.validateToken(
      {
        id: 'user-1',
        username: 'outsider',
        roles: ['user'],
      } as any,
      { token: 'forbidden-token' },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should return provider capabilities directly', async () => {
    const { appController, rtcService } = createController();
    const report = {
      defaultProvider: 'volcengine',
      recommendedPrimary: 'volcengine',
      fallbackOrder: ['volcengine', 'tencent'],
      activeProviders: ['volcengine'],
      providers: [
        {
          provider: 'volcengine',
          configured: true,
          channelId: 'channel-1',
          supportsRecording: true,
          tokenStrategies: ['delegate', 'openapi', 'local'],
          supportsControlPlaneDelegate: true,
        },
      ],
    };
    (rtcService.getProviderCapabilities as jest.Mock).mockResolvedValue(report);

    const result = await appController.getProviderCapabilities();

    expect(result).toBe(report);
    expect((rtcService.getProviderCapabilities as jest.Mock).mock.calls).toHaveLength(1);
  });
});
