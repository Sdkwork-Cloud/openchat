import { ForbiddenException } from '@nestjs/common';
import {
  RtcProviderHealthQueryDto,
  RtcProviderOperationStatsQueryDto,
} from './dto/rtc.dto';
import { RTCController } from './rtc.controller';
import { RTCService } from './rtc.service';

describe('RTCController', () => {
  function createController() {
    const rtcService = {
      getProviderOperationStats: jest.fn(),
      getProviderHealthReport: jest.fn(),
    } as unknown as RTCService;

    return {
      controller: new RTCController(rtcService),
      rtcService,
    };
  }

  it('should reject provider stats query for non-admin user', async () => {
    const { controller, rtcService } = createController();

    await expect(controller.getProviderOperationStats(
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
    const { controller, rtcService } = createController();
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
    const result = await controller.getProviderOperationStats(
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
    const { controller, rtcService } = createController();

    await expect(controller.getProviderHealthReport(
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
    const { controller, rtcService } = createController();
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
    const result = await controller.getProviderHealthReport(
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
});
